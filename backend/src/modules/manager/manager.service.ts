import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException, NotFoundException } from '@nestjs/common';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { ActionPollingService } from './polling/action-polling.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GmailSendService } from '../reactions/gmail/send.service';
import { GmailNewMailService } from '../actions/gmail/new-mail.service';
import { PlaceholderReplacementService } from '../../common/services/placeholder-replacement.service';
import type { ActionCallback, ReactionCallback, AreaExecution } from '../../common/interfaces/area.type';
import { ActionNamesEnum, ReactionNamesEnum } from '../../common/interfaces/action-names.enum';

/**
 * Orchestrates the AREA engine: registers actions/reactions, binds them for users,
 * starts/stops polling, and executes reactions when actions trigger.
 */
@Injectable()
export class ManagerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ManagerService.name);
    private actionCallbacks: Map<string, ActionCallback> = new Map();
    private reactionCallbacks: Map<string, ReactionCallback> = new Map();
    private intervalId: NodeJS.Timeout;

    // Mapping of actions/reactions to their providers
    private readonly actionProviders: Record<string, string> = {
        [ActionNamesEnum.SPOTIFY_HAS_LIKES]: 'spotify',
        [ActionNamesEnum.GMAIL_NEW_EMAIL]: 'google',
    };

    private readonly reactionProviders: Record<string, string> = {
        [ReactionNamesEnum.SEND_EMAIL]: 'google',
        [ReactionNamesEnum.LOG_EVENT]: 'default',
    };

    constructor(
        private readonly spotifyLikeService: SpotifyLikeService,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly polling: ActionPollingService,
        private readonly gmailSendService: GmailSendService,
        private readonly gmailNewMailService: GmailNewMailService,
        private readonly placeholderService: PlaceholderReplacementService,
    ) {}

    /**
     * Lifecycle hook: initialize callbacks, polling registry, and start execution loop.
     */
    async onModuleInit() {
        await this.registerActionCallbacks();
        await this.registerReactionCallbacks();
        // Register available pollers (extensible)
        this.polling.register(this.spotifyLikeService);
        this.polling.register(this.gmailNewMailService);
        await this.initPollingForActiveAreas();
        this.logger.log('Manager Service initialized with action-reaction system');
    }

    /**
     * Lifecycle hook: clean up any intervals and log shutdown.
     */
    async onModuleDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.logger.log('Manager Service destroyed');
    }

    /**
     * Register all available action callbacks
     */
    private async registerActionCallbacks() {
        // Spotify Actions
        this.actionCallbacks.set(ActionNamesEnum.SPOTIFY_HAS_LIKES, {
            name: ActionNamesEnum.SPOTIFY_HAS_LIKES,
            callback: async (userId: string) => {
                return await this.spotifyLikeService.hasNewSpotifyLike(userId);
            },
            description: 'Check if user has liked songs on Spotify'
        });

        // Gmail Actions
        this.actionCallbacks.set(ActionNamesEnum.GMAIL_NEW_EMAIL, {
            name: ActionNamesEnum.GMAIL_NEW_EMAIL,
            callback: async (userId: string) => {
                return await this.gmailNewMailService.hasNewGmailEmail(userId);
            },
            description: 'Detect new incoming email in Gmail inbox'
        });

        this.logger.log(`Registered ${this.actionCallbacks.size} action callbacks`);
    }

    /**
     * Register all available reaction callbacks
     */
    private async registerReactionCallbacks() {
        // Email notification reaction
        this.reactionCallbacks.set(ReactionNamesEnum.SEND_EMAIL, {
            name: ReactionNamesEnum.SEND_EMAIL,
            callback: async (userId: string, actionResult: any, config: { subject: string; body: string; to: string }) => {
                return await this.gmailSendService.run(userId, config);
            },
            description: 'Send email notification',
            configSchema: [
                {
                    name: 'to',
                    type: 'email',
                    required: true,
                    label: 'Recipient email',
                    placeholder: 'recipient@example.com'
                },
                {
                    name: 'subject',
                    type: 'string',
                    required: true,
                    label: 'Email subject',
                    placeholder: 'Notification from AREA'
                },
                {
                    name: 'body',
                    type: 'string',
                    required: true,
                    label: 'Email body',
                    placeholder: 'Your message here...'
                }
            ]
        });

        // Log event reaction
        this.reactionCallbacks.set(ReactionNamesEnum.LOG_EVENT, {
            name: ReactionNamesEnum.LOG_EVENT,
            callback: async (userId: string, actionResult: any, config?: any) => {
                await this.prisma.event_logs.create({
                    data: {
                        id: crypto.randomUUID(),
                        user_id: userId,
                        event_type: 'AREA_TRIGGERED',
                        description: `Action triggered reaction`,
                        metadata: { actionResult, config },
                    }
                });
                return { logged: true };
            },
            description: 'Log event to database'
        });

        this.logger.log(`Registered ${this.reactionCallbacks.size} reaction callbacks`);
    }

    /**
     * Bind an action and reaction together for a user.
     * Validates inputs, ensures persistence rows exist, caches active area, and
     * starts polling if the action supports it.
     *
     * @param userId - Target user ID
     * @param actionName - Name of the action to bind
     * @param reactionName - Name of the reaction to bind
     * @returns The created area id
     */
    async bindAction(userId: string, actionName: string, reactionName: string, config?: any): Promise<string> {
        // Validate that action and reaction exist
        if (!this.actionCallbacks.has(actionName)) {
            throw new BadRequestException(`Action '${actionName}' not found`);
        }
        if (!this.reactionCallbacks.has(reactionName)) {
            throw new BadRequestException(`Reaction '${reactionName}' not found`);
        }

        // Validate reaction config against schema
        const reactionCallback = this.reactionCallbacks.get(reactionName);
        if (reactionCallback?.configSchema && reactionCallback.configSchema.length > 0) {
            this.validateConfig(config, reactionCallback.configSchema, reactionName);
        }

        // Validate that user has linked the required providers
        await this.validateUserHasRequiredProviders(userId, actionName, reactionName);

        // Verify user exists
        const user = await this.prisma.users.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Find or create action in database
        let action = await this.prisma.actions.findFirst({
            where: { name: actionName, is_active: true }
        });

        if (!action) {
            // Create a default service if none exists
            let service = await this.prisma.services.findFirst({
                where: { name: 'default', is_active: true }
            });
            
            if (!service) {
                service = await this.prisma.services.create({
                    data: {
                        id: crypto.randomUUID(),
                        name: 'default',
                        description: 'Default service for actions and reactions',
                        is_active: true
                    }
                });
            }

            action = await this.prisma.actions.create({
                data: {
                    id: crypto.randomUUID(),
                    service_id: service.id,
                    name: actionName,
                    description: this.actionCallbacks.get(actionName)?.description,
                    is_active: true
                }
            });
        }

        // Find or create reaction in database
        let reaction = await this.prisma.reactions.findFirst({
            where: { name: reactionName, is_active: true }
        });
        if (!reaction) {
            // Use the same default service
            const service = await this.prisma.services.findFirst({
                where: { name: 'default', is_active: true }
            });

            if (!service) {
                throw new BadRequestException('Default service not found for reaction');
            }

            reaction = await this.prisma.reactions.create({
                data: {
                    id: crypto.randomUUID(),
                    service_id: service.id,
                    name: reactionName,
                    description: this.reactionCallbacks.get(reactionName)?.description,
                    is_active: true,
                    config: config || null
                }
            });
        } else {
            // Update reaction config if provided
            if (config) {
                await this.prisma.reactions.update({
                    where: { id: reaction.id },
                    data: { config }
                });
            }
        }

        // Create area (binding)
        if (!action || !reaction) {
            throw new BadRequestException('Failed to create action or reaction');
        }
        const area = await this.prisma.areas.create({
            data: {
                id: crypto.randomUUID(),
                user_id: userId,
                action_id: action.id,
                reaction_id: reaction.id,
                is_active: true
            }
        });

        // Cache active area in Redis for quick access
        const cacheKey = `area:active:${area.id}`;
        const areaExecution: AreaExecution = {
            areaId: area.id,
            userId,
            actionName,
            reactionName,
        };
        
        await this.redisService.setValue(
            cacheKey,
            JSON.stringify(areaExecution), 
            86400 // 24 hours
        );

        this.logger.log(`Created area binding: ${actionName} -> ${reactionName} for user ${userId}`);

        // Start polling generically for actions that support it
        if (this.polling.supports(actionName)) {
            this.polling.start(actionName, userId, async (result) => {
                try {
                    if (result.code === 0) {
                        this.logger.log(`Polling detected event for user ${userId}, triggering reaction '${reactionName}'`);
                        const reactionCallback = this.reactionCallbacks.get(reactionName);
                        if (!reactionCallback) {
                            this.logger.error(`Reaction callback '${reactionName}' not found`);
                            return;
                        }

                        // Replace placeholders in the config with action data
                        const processedConfig = this.placeholderService.replaceInConfig(config, result.data);

                        const reactionResult = await reactionCallback.callback(userId, result.code, processedConfig);
                        await this.prisma.event_logs.create({
                            data: {
                                id: crypto.randomUUID(),
                                user_id: userId,
                                area_id: area.id,
                                event_type: 'AREA_EXECUTED',
                                description: `${actionName} triggered ${reactionName} (polling)`,
                                metadata: {
                                    actionResult: { code: result.code, data: result.data || {} } as any,
                                    reactionResult,
                                    processedConfig
                                }
                            }
                        });
                    }
                } catch (err: any) {
                    this.logger.error(`Error triggering reaction from polling for user ${userId}: ${err?.message ?? err}`);
                }
            });
        }
        return area.id;
    }

    /**
     * Get all active areas for a user.
     * @param userId - Target user ID
     */
    async getUserAreas(userId: string) {
        const areas = await this.prisma.areas.findMany({
            where: {
                user_id: userId,
                is_active: true,
                deleted_at: null
            },
            include: {
                actions: true,
                reactions: true
            }
        });

        // Transform to include action and reaction names as strings
        return areas.map(area => ({
            id: area.id,
            action: area.actions.name,
            reaction: area.reactions.name,
            config: area.config,
            is_active: area.is_active,
            created_at: area.created_at,
            updated_at: area.updated_at,
        }));
    }

    /**
     * Deactivate an area by id, remove it from cache, and stop polling if needed.
     * @param areaId - Identifier of the area to deactivate
     */
    private isUuidV4(id: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }

    async deactivateArea(areaId: string): Promise<void> {
        if (!this.isUuidV4(areaId)) {
            throw new BadRequestException('Invalid areaId format (expected UUID v4)');
        }
        const area = await this.prisma.areas.findFirst({
            where: { id: areaId },
            include: { actions: true }
        });

        if (!area) {
            throw new NotFoundException('Area not found');
        }

        await this.prisma.areas.update({
            where: { id: areaId },
            data: { is_active: false, updated_at: new Date() }
        });

        // Remove from Redis cache
        await this.redisService.deleteVerificationCode(`area:active:${areaId}`);
        // Stop polling generically if supported for this action
        if (area.actions?.name && this.polling.supports(area.actions.name)) {
            this.polling.stop(area.actions.name, area.user_id);
        }
        
        this.logger.log(`Deactivated area ${areaId} for user ${area.user_id}`);
    }

    /**
     * Initialize polling for existing active areas (e.g., after restart)
     */
    private async initPollingForActiveAreas() {
        try {
            const activeAreas = await this.prisma.areas.findMany({
                where: { is_active: true, deleted_at: null },
                include: { actions: true, reactions: true }
            });
            for (const area of activeAreas) {
                const actionName = area.actions.name;
                if (this.polling.supports(actionName)) {
                    const userId = area.user_id;
                    const reactionName = area.reactions.name;
                    this.polling.start(actionName, userId, async (result) => {
                        try {
                            if (result.code === 0) {
                                this.logger.log(`Polling detected event for user ${userId}, triggering reaction '${reactionName}'`);
                                const reactionCallback = this.reactionCallbacks.get(reactionName);
                                if (!reactionCallback) {
                                    this.logger.error(`Reaction callback '${reactionName}' not found`);
                                    return;
                                }

                                // Replace placeholders in the config with action data
                                const processedConfig = this.placeholderService.replaceInConfig(area.reactions.config, result.data);

                                const reactionResult = await reactionCallback.callback(userId, result.code, processedConfig);
                                await this.prisma.event_logs.create({
                                    data: {
                                        id: crypto.randomUUID(),
                                        user_id: userId,
                                        area_id: area.id,
                                        event_type: 'AREA_EXECUTED',
                                        description: `${actionName} triggered ${reactionName} (polling)`,
                                        metadata: {
                                            actionResult: { code: result.code, data: result.data || {} } as any,
                                            reactionResult,
                                            processedConfig
                                        }
                                    }
                                });
                            } else if (result.code === -1) {
                                this.logger.warn(`Polling action '${actionName}' reported provider not linked for user ${userId}`);
                            }
                        } catch (err: any) {
                            this.logger.error(`Error triggering reaction from polling for user ${userId}: ${err?.message ?? err}`);
                        }
                    });
                }
            }
        } catch (e: any) {
            this.logger.error(`Failed to init polling for active areas: ${e?.message ?? e}`);
        }
    }

    /**
     * Get available actions
     */
    getAvailableActions(): ActionCallback[] {
        return Array.from(this.actionCallbacks.values());
    }

    /**
     * Get available reactions
     */
    getAvailableReactions(): ReactionCallback[] {
        return Array.from(this.reactionCallbacks.values());
    }

    /**
     * Get placeholders for a given action
     */
    getActionPlaceholders(actionName: string) {
        return this.polling.getPlaceholders(actionName);
    }

    /**
     * Validate config against schema
     */
    private validateConfig(config: any, schema: any[], reactionName: string): void {
        if (!config) {
            const requiredFields = schema.filter(f => f.required);
            if (requiredFields.length > 0) {
                throw new BadRequestException(
                    `Reaction '${reactionName}' requires configuration: ${requiredFields.map(f => f.name).join(', ')}`
                );
            }
            return;
        }

        // Check required fields
        for (const field of schema) {
            if (field.required && !config[field.name]) {
                throw new BadRequestException(
                    `Missing required field '${field.name}' for reaction '${reactionName}'`
                );
            }

            // Type validation
            if (config[field.name] !== undefined) {
                const value = config[field.name];
                switch (field.type) {
                    case 'string':
                    case 'email':
                        if (typeof value !== 'string') {
                            throw new BadRequestException(
                                `Field '${field.name}' must be a string`
                            );
                        }
                        if (field.type === 'email' && !value.includes('@')) {
                            throw new BadRequestException(
                                `Field '${field.name}' must be a valid email address`
                            );
                        }
                        break;
                    case 'number':
                        if (typeof value !== 'number') {
                            throw new BadRequestException(
                                `Field '${field.name}' must be a number`
                            );
                        }
                        break;
                    case 'boolean':
                        if (typeof value !== 'boolean') {
                            throw new BadRequestException(
                                `Field '${field.name}' must be a boolean`
                            );
                        }
                        break;
                }
            }
        }
    }

    /**
     * Validate that user has linked the required providers for an action and reaction
     */
    private async validateUserHasRequiredProviders(userId: string, actionName: string, reactionName: string): Promise<void> {
        const servicesToCheck = new Set<string>();

        // Get provider for action
        const actionProvider = this.actionProviders[actionName];
        if (actionProvider && actionProvider !== 'default') {
            servicesToCheck.add(actionProvider);
        }

        // Get provider for reaction
        const reactionProvider = this.reactionProviders[reactionName];
        if (reactionProvider && reactionProvider !== 'default') {
            servicesToCheck.add(reactionProvider);
        }

        // Check if user has linked all required services
        for (const serviceName of servicesToCheck) {
            const provider = await this.prisma.oauth_providers.findFirst({
                where: { name: serviceName }
            });

            if (!provider) {
                continue; // Skip if provider doesn't exist in oauth_providers
            }

            const linkedAccount = await this.prisma.linked_accounts.findFirst({
                where: {
                    user_id: userId,
                    provider_id: provider.id,
                    is_active: true,
                    deleted_at: null
                }
            });

            if (!linkedAccount) {
                throw new BadRequestException(
                    `You must link your ${serviceName} account before using this action or reaction`
                );
            }
        }
    }

    /**
     * Get available actions grouped by provider with user's link status
     */
    async getAvailableActionsGrouped(userId: string) {
        const actionCallbacks = Array.from(this.actionCallbacks.values());
        const grouped: Record<string, any> = {};

        // Get user's linked accounts
        const linkedAccounts = await this.prisma.linked_accounts.findMany({
            where: {
                user_id: userId,
                is_active: true,
                deleted_at: null
            },
            include: {
                oauth_providers: true
            }
        });

        const linkedProviders = new Set(linkedAccounts.map(la => la.oauth_providers.name));

        for (const actionCallback of actionCallbacks) {
            const providerName = this.actionProviders[actionCallback.name] || 'default';

            if (!grouped[providerName]) {
                grouped[providerName] = {
                    isLinked: linkedProviders.has(providerName) || providerName === 'default',
                    items: []
                };
            }

            grouped[providerName].items.push({
                name: actionCallback.name,
                description: actionCallback.description
            });
        }

        return grouped;
    }

    /**
     * Get available reactions grouped by provider with user's link status
     */
    async getAvailableReactionsGrouped(userId: string) {
        const reactionCallbacks = Array.from(this.reactionCallbacks.values());
        const grouped: Record<string, any> = {};

        // Get user's linked accounts
        const linkedAccounts = await this.prisma.linked_accounts.findMany({
            where: {
                user_id: userId,
                is_active: true,
                deleted_at: null
            },
            include: {
                oauth_providers: true
            }
        });

        const linkedProviders = new Set(linkedAccounts.map(la => la.oauth_providers.name));

        for (const reactionCallback of reactionCallbacks) {
            const providerName = this.reactionProviders[reactionCallback.name] || 'default';

            if (!grouped[providerName]) {
                grouped[providerName] = {
                    isLinked: linkedProviders.has(providerName) || providerName === 'default',
                    items: []
                };
            }

            grouped[providerName].items.push({
                name: reactionCallback.name,
                description: reactionCallback.description,
                configSchema: reactionCallback.configSchema || []
            });
        }

        return grouped;
    }
}
