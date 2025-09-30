import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException, NotFoundException } from '@nestjs/common';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { ActionPollingService } from '../actions/polling/ActionPollingService';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GmailSendService } from '../reactions/gmail/send.service';

export interface ActionCallback {
  name: string;
  callback: (userId: string, config?: any) => Promise<any>;
  description?: string;
}

export interface ReactionCallback {
  name: string;
  callback: (userId: string, actionResult: any, config?: any) => Promise<any>;
  description?: string;
}

interface AreaExecution {
  areaId: string;
  userId: string;
  actionName: string;
  reactionName: string;
  lastExecuted?: Date;
  config?: any;
}

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

    constructor(
        private readonly spotifyLikeService: SpotifyLikeService,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService,
        private readonly polling: ActionPollingService,
        private readonly gmailSendService: GmailSendService,
    ) {}

    /**
     * Lifecycle hook: initialize callbacks, polling registry, and start execution loop.
     */
    async onModuleInit() {
        await this.registerActionCallbacks();
        await this.registerReactionCallbacks();
        await this.startAreaExecution();
        // Register available pollers (extensible)
        this.polling.register(this.spotifyLikeService);
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
        this.actionCallbacks.set('spotify_has_likes', {
            name: 'spotify_has_likes',
            callback: async (userId: string) => {
                return await this.spotifyLikeService.hasNewSpotifyLike(userId);
            },
            description: 'Check if user has liked songs on Spotify'
        });

        this.logger.log(`Registered ${this.actionCallbacks.size} action callbacks`);
    }

    /**
     * Register all available reaction callbacks
     */
    private async registerReactionCallbacks() {
        // Email notification reaction
        this.reactionCallbacks.set('send_email', {
            name: 'send_email',
            callback: async (userId: string, actionResult: any, config: { subject: string; message: string, to: string }) => {
                return await this.gmailSendService.sendEmail(userId, config.to, config.subject, config.message);
            },
            description: 'Send email notification'
        });

        // Log event reaction
        this.reactionCallbacks.set('log_event', {
            name: 'log_event',
            callback: async (userId: string, actionResult: any, config?: any) => {
                await this.prisma.event_logs.create({
                    data: {
                        id: crypto.randomUUID(),
                        user_id: userId,
                        event_type: 'AREA_TRIGGERED',
                        description: `Action triggered reaction`,
                        metadata: { actionResult, config }
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
    async bindAction(userId: string, actionName: string, reactionName: string): Promise<string> {
        // Validate that action and reaction exist
        if (!this.actionCallbacks.has(actionName)) {
            throw new BadRequestException(`Action '${actionName}' not found`);
        }
        if (!this.reactionCallbacks.has(reactionName)) {
            throw new BadRequestException(`Reaction '${reactionName}' not found`);
        }

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
                    is_active: true
                }
            });
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
                    if (result === 0) {
                        this.logger.log(`Polling detected event for user ${userId}, triggering reaction '${reactionName}'`);
                        const reactionCallback = this.reactionCallbacks.get(reactionName);
                        if (!reactionCallback) {
                            this.logger.error(`Reaction callback '${reactionName}' not found`);
                            return;
                        }
                        const reactionResult = await reactionCallback.callback(userId, result);
                        await this.prisma.event_logs.create({
                            data: {
                                id: crypto.randomUUID(),
                                user_id: userId,
                                area_id: area.id,
                                event_type: 'AREA_EXECUTED',
                                description: `${actionName} triggered ${reactionName} (polling)`,
                                metadata: { actionResult: result, reactionResult }
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
        return await this.prisma.areas.findMany({
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
    }

    /**
     * Deactivate an area by id, remove it from cache, and stop polling if needed.
     * @param areaId - Identifier of the area to deactivate
     */
    async deactivateArea(areaId: string): Promise<void> {
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
     * Execute a single area (action + reaction)
     */
    private async executeArea(areaExecution: AreaExecution): Promise<void> {
        const { areaId, userId, actionName, reactionName, config } = areaExecution;

        try {
            // Execute action
            const actionCallback = this.actionCallbacks.get(actionName);
            if (!actionCallback) {
                this.logger.error(`Action callback '${actionName}' not found`);
                return;
            }

            const actionResult = await actionCallback.callback(userId, config?.action);
            
            // If action returns 0, it means the condition is met (trigger reaction)
            if (actionResult === 0) {
                this.logger.log(`Action '${actionName}' triggered for user ${userId}`);
                
                // Execute reaction
                const reactionCallback = this.reactionCallbacks.get(reactionName);
                if (!reactionCallback) {
                    this.logger.error(`Reaction callback '${reactionName}' not found`);
                    return;
                }

                const reactionResult = await reactionCallback.callback(userId, actionResult, config?.reaction);
                
                // Log the successful execution
                await this.prisma.event_logs.create({
                    data: {
                        id: crypto.randomUUID(),
                        user_id: userId,
                        area_id: areaId,
                        event_type: 'AREA_EXECUTED',
                        description: `${actionName} triggered ${reactionName}`,
                        metadata: {
                            actionResult,
                            reactionResult,
                            config
                        }
                    }
                });

                this.logger.log(`Successfully executed area ${areaId}: ${actionName} -> ${reactionName}`);
            }
        } catch (error) {
            this.logger.error(`Error executing area ${areaId}:`, error);
            
            // Log the error
            await this.prisma.event_logs.create({
                data: {
                    id: crypto.randomUUID(),
                    user_id: userId,
                    area_id: areaId,
                    event_type: 'AREA_ERROR',
                    description: `Error executing ${actionName} -> ${reactionName}`,
                    metadata: { error: error.message }
                }
            });
        }
    }

    /**
     * Start the area execution loop
     */
    private async startAreaExecution() {
        await this.executeAllActiveAreas();
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
                            if (result === 0) {
                                this.logger.log(`Polling detected event for user ${userId}, triggering reaction '${reactionName}'`);
                                const reactionCallback = this.reactionCallbacks.get(reactionName);
                                if (!reactionCallback) {
                                    this.logger.error(`Reaction callback '${reactionName}' not found`);
                                    return;
                                }
                                const reactionResult = await reactionCallback.callback(userId, result);
                                await this.prisma.event_logs.create({
                                    data: {
                                        id: crypto.randomUUID(),
                                        user_id: userId,
                                        area_id: area.id,
                                        event_type: 'AREA_EXECUTED',
                                        description: `${actionName} triggered ${reactionName} (polling)`,
                                        metadata: { actionResult: result, reactionResult }
                                    }
                                });
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
     * Execute all active areas
     */
    private async executeAllActiveAreas(): Promise<void> {
        try {
            // Get all active areas from database
            const activeAreas = await this.prisma.areas.findMany({
                where: {
                    is_active: true,
                    deleted_at: null
                },
                include: {
                    actions: true,
                    reactions: true
                }
            });

            this.logger.debug(`Executing ${activeAreas.length} active areas`);

            // Execute each area
            const executions = activeAreas.map(async (area) => {
                const areaExecution: AreaExecution = {
                    areaId: area.id,
                    userId: area.user_id,
                    actionName: area.actions.name,
                    reactionName: area.reactions.name,
                    config: area.config as any
                };

                await this.executeArea(areaExecution);
            });

            await Promise.allSettled(executions);
        } catch (error) {
            this.logger.error('Error in executeAllActiveAreas:', error);
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
     * Manually trigger the execution loop for all active areas.
     */
    async triggerAreaExecution(): Promise<void> {
        await this.executeAllActiveAreas();
    }
}
