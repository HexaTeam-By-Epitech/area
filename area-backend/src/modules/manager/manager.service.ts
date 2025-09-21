import { Injectable, Logger, OnModuleInit, OnModuleDestroy, BadRequestException, NotFoundException } from '@nestjs/common';
import { SpotifyLikeService } from '../actions/spotify/like.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

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

@Injectable()
export class ManagerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ManagerService.name);
    private actionCallbacks: Map<string, ActionCallback> = new Map();
    private reactionCallbacks: Map<string, ReactionCallback> = new Map();
    private intervalId: NodeJS.Timeout;

    constructor(
        private readonly spotifyLikeService: SpotifyLikeService,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService
    ) {}

    async onModuleInit() {
        await this.registerActionCallbacks();
        await this.registerReactionCallbacks();
        await this.startAreaExecution();
        this.logger.log('Manager Service initialized with action-reaction system');
    }

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
                return await this.spotifyLikeService.hasSpotifyLikes(userId);
            },
            description: 'Check if user has liked songs on Spotify'
        });

        // Example: Weather action (placeholder)
        this.actionCallbacks.set('weather_temperature_above', {
            name: 'weather_temperature_above',
            callback: async (userId: string, config: { threshold: number; city: string }) => {
                // Placeholder for weather API integration
                // return temperature > config.threshold ? 0 : 1;
                return Math.random() > 0.5 ? 0 : 1; // Mock implementation
            },
            description: 'Trigger when temperature is above threshold'
        });

        // Example: Time-based action
        this.actionCallbacks.set('time_schedule', {
            name: 'time_schedule',
            callback: async (userId: string, config: { time: string }) => {
                const now = new Date();
                const currentTime = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');
                return currentTime === config.time ? 0 : 1;
            },
            description: 'Trigger at specific time'
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
            callback: async (userId: string, actionResult: any, config: { subject: string; message: string }) => {
                // Placeholder for email service integration
                this.logger.log(`Sending email to user ${userId}: ${config.subject}`);
                return { sent: true, subject: config.subject };
            },
            description: 'Send email notification'
        });

        // Discord notification reaction
        this.reactionCallbacks.set('discord_message', {
            name: 'discord_message',
            callback: async (userId: string, actionResult: any, config: { webhook: string; message: string }) => {
                // Placeholder for Discord webhook integration
                this.logger.log(`Sending Discord message for user ${userId}: ${config.message}`);
                return { sent: true, platform: 'discord' };
            },
            description: 'Send Discord message'
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
     * Bind an action and reaction together for a user
     */
    async bindAction(userId: string, actionName: string, reactionName: string, config?: any): Promise<string> {
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
                config: config || {},
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
            config
        };
        
        await this.redisService.setVerificationCode(
            cacheKey, 
            JSON.stringify(areaExecution), 
            86400 // 24 hours
        );

        this.logger.log(`Created area binding: ${actionName} -> ${reactionName} for user ${userId}`);
        return area.id;
    }

    /**
     * Get all active areas for a user
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
     * Deactivate an area
     */
    async deactivateArea(areaId: string, userId: string): Promise<void> {
        const area = await this.prisma.areas.findFirst({
            where: { id: areaId, user_id: userId }
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
        
        this.logger.log(`Deactivated area ${areaId} for user ${userId}`);
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
        // Execute every 30 seconds
        this.intervalId = setInterval(async () => {
            await this.executeAllActiveAreas();
        }, 30000);

        this.logger.log('Started area execution loop (30-second intervals)');
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
     * Manual trigger for testing
     */
    async triggerAreaExecution(): Promise<void> {
        await this.executeAllActiveAreas();
    }
}
