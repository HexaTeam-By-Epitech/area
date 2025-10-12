import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import { AuthService } from '../../auth/auth.service';
import { RedisService } from '../../redis/redis.service';
import type { PollingAction, ActionResult, ActionPlaceholder } from '../../../common/interfaces/area.type';
import { ActionNamesEnum } from '../../../common/interfaces/action-names.enum';

/**
 * Discord polling action that detects new messages in associated servers.
 *
 * This service periodically queries the Discord API for recent messages
 * in servers where the user is a member and compares them with a timestamp
 * stored in Redis to determine if new messages have been posted.
 *
 * Implements the `PollingAction` interface with action name `ActionNamesEnum.DISCORD_NEW_MESSAGE`.
 */
@Injectable()
export class DiscordMessageService implements PollingAction {
  /**
   * In-memory map of active polling intervals keyed by `userId`.
   */
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  /** Logger instance scoped to this service. */
  private readonly logger = new Logger(DiscordMessageService.name);

  constructor(
    /** Users domain service used to resolve linked provider accounts. */
    private readonly usersService: UsersService,
    /** Auth service used to perform OAuth2-authenticated requests to Discord. */
    private readonly authService: AuthService,
    /** Redis service used as a cache to store the last seen message timestamp. */
    private readonly redisService: RedisService,
  ) {}

  // PollingAction interface
  /**
   * Returns whether this action supports the given `actionName`.
   *
   * @param actionName - The identifier of the action to check.
   * @returns `true` if the action name is `ActionNamesEnum.DISCORD_NEW_MESSAGE`.
   */
  supports(actionName: string): boolean {
    return actionName === ActionNamesEnum.DISCORD_NEW_MESSAGE;
  }

  /**
   * Starts polling for the given user and emits results to the provided callback.
   *
   * @param userId - The user identifier.
   * @param emit - Callback invoked with the ActionResult containing code and message data.
   * @param config - Optional configuration containing channelId to monitor
   */
  start(userId: string, emit: (result: ActionResult) => void, config?: { channelId?: string }): void {
    this.startPolling(userId, emit, config);
  }

  /**
   * Stops polling for the given user.
   *
   * @param userId - The user identifier.
   */
  stop(userId: string): void {
    this.stopPolling(userId);
  }

  /**
   * Checks if there are new messages in a specific Discord channel compared to the
   * last stored timestamp in Redis.
   *
   * @param userId - The user identifier.
   * @param config - Configuration containing required channelId to monitor
   * @returns A promise resolving to an ActionResult with code and message data.
   */
  async hasNewDiscordMessage(userId: string, config?: { channelId?: string }): Promise<ActionResult> {
    try {
      // Ensure the user has a linked Discord account
      const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Discord);
      if (!linked) return { code: -1 };

      // Require channelId configuration
      if (!config?.channelId) {
        this.logger.error(`[Discord] No channelId provided for user=${userId}`);
        return { code: -1 };
      }

      const channelId = config.channelId;
      const cacheKey = `discord:last_message_at:${userId}:${channelId}`;

      this.logger.debug(`[Discord] Checking specific channel ${channelId} for user=${userId}`);
      return await this.checkSpecificChannel(userId, channelId, cacheKey);
    } catch (error: any) {
      this.logger.error(`[Discord] Error checking messages for user=${userId}: ${error?.message || error}`);
      // Return -1 (error) to indicate configuration or other errors
      return { code: -1 };
    }
  }

  /**
   * Check messages in a specific channel
   */
  private async checkSpecificChannel(userId: string, channelId: string, cacheKey: string): Promise<ActionResult> {
    try {
      // Get messages from the specific channel
      const { data: messages } = await this.authService.oAuth2ApiRequest<any>(ProviderKeyEnum.Discord, userId, {
        url: `https://discord.com/api/v10/channels/${channelId}/messages`,
        method: 'GET',
        params: { limit: 1 },
      });

      if (!messages || messages.length === 0) {
        this.logger.debug(`[Discord] No messages found in channel ${channelId} for user=${userId}`);
        await this.redisService.setValue(cacheKey, '');
        return { code: 1 };
      }

      const latestMessage = messages[0];
      const latestTimestamp = latestMessage.timestamp;

      // Get channel info to populate guild and channel names
      try {
        const { data: channel } = await this.authService.oAuth2ApiRequest<any>(ProviderKeyEnum.Discord, userId, {
          url: `https://discord.com/api/v10/channels/${channelId}`,
          method: 'GET',
        });

        latestMessage.channelName = channel.name || 'Unknown Channel';

        // Get guild info if available
        if (channel.guild_id) {
          try {
            const { data: guild } = await this.authService.oAuth2ApiRequest<any>(ProviderKeyEnum.Discord, userId, {
              url: `https://discord.com/api/v10/guilds/${channel.guild_id}`,
              method: 'GET',
            });
            latestMessage.guildName = guild.name || 'Unknown Guild';
          } catch (guildError: any) {
            this.logger.debug(`[Discord] Unable to fetch guild info: ${guildError?.message || guildError}`);
            latestMessage.guildName = 'Unknown Guild';
          }
        } else {
          latestMessage.guildName = 'Direct Message';
        }
      } catch (channelError: any) {
        this.logger.debug(`[Discord] Unable to fetch channel info: ${channelError?.message || channelError}`);
        latestMessage.channelName = 'Unknown Channel';
        latestMessage.guildName = 'Unknown Guild';
      }

      return await this.processLatestMessage(userId, latestMessage, latestTimestamp, cacheKey);
    } catch (error: any) {
      this.logger.error(`[Discord] Error checking specific channel ${channelId} for user=${userId}: ${error?.message || error}`);
      return { code: 1 };
    }
  }

  /**
   * Process the latest message and return appropriate ActionResult
   */
  private async processLatestMessage(userId: string, latestMessage: any, latestTimestamp: string, cacheKey: string): Promise<ActionResult> {
    // Compare Discord's latest timestamp with the cached value
    const lastStoredAt = await this.redisService.getValue(cacheKey);
    this.logger.debug(`[Discord] Latest message id=${latestMessage.id}, timestamp=${latestTimestamp}, cached=${lastStoredAt ?? 'none'} for user=${userId}`);

    // First time seeing a message - baseline initialization
    if (!lastStoredAt) {
      await this.redisService.setValue(cacheKey, latestTimestamp);
      this.logger.debug(`[Discord] Baseline initialized for user=${userId}: ${latestMessage.id} at ${latestTimestamp}`);
      return { code: 1 };
    }

    // Check if there's a newer message
    if (latestTimestamp > lastStoredAt) {
      // Update cache and signal that a new message has been detected
      await this.redisService.setValue(cacheKey, latestTimestamp);
      this.logger.log(`[Discord] New message detected for user=${userId}: ${latestMessage.id} at ${latestTimestamp}`);

      // Extract message details for placeholders
      const messageData = {
        DISCORD_MESSAGE_ID: latestMessage.id || 'Unknown',
        DISCORD_MESSAGE_CONTENT: latestMessage.content || 'No content',
        DISCORD_MESSAGE_AUTHOR_USERNAME: latestMessage.author?.username || 'Unknown',
        DISCORD_MESSAGE_AUTHOR_DISCRIMINATOR: latestMessage.author?.discriminator || 'Unknown',
        DISCORD_MESSAGE_AUTHOR_ID: latestMessage.author?.id || 'Unknown',
        DISCORD_MESSAGE_TIMESTAMP: latestTimestamp,
        DISCORD_MESSAGE_GUILD_NAME: latestMessage.guildName || 'Unknown',
        DISCORD_MESSAGE_CHANNEL_NAME: latestMessage.channelName || 'Unknown',
        DISCORD_MESSAGE_CHANNEL_ID: latestMessage.channel_id || 'Unknown',
        DISCORD_MESSAGE_TYPE: latestMessage.type?.toString() || '0',
        DISCORD_MESSAGE_EDITED_TIMESTAMP: latestMessage.edited_timestamp || '',
        DISCORD_MESSAGE_MENTION_EVERYONE: latestMessage.mention_everyone?.toString() || 'false',
        DISCORD_MESSAGE_ATTACHMENTS_COUNT: latestMessage.attachments?.length?.toString() || '0',
        DISCORD_MESSAGE_EMBEDS_COUNT: latestMessage.embeds?.length?.toString() || '0',
      };

      return { code: 0, data: messageData };
    }

    this.logger.debug(`[Discord] No new messages for user=${userId} (unchanged)`);
    return { code: 1 };
  }

  /**
   * Starts an interval that periodically checks for new messages and
   * invokes the provided callback with the ActionResult.
   *
   * @param userId - The user identifier.
   * @param callback - Invoked with ActionResult containing code and message data.
   * @param config - Optional configuration containing channelId to monitor
   */
  startPolling(userId: string, callback: (result: ActionResult) => void, config?: { channelId?: string }): void {
    // Create a unique key that includes channelId to handle multiple channels per user
    const pollingKey = config?.channelId ? `${userId}:${config.channelId}` : userId;

    if (this.pollIntervals.has(pollingKey)) {
      this.logger.debug(`[Discord] Already polling for key=${pollingKey}`);
      return; // Already polling
    }

    this.logger.debug(`[Discord] Starting polling for user=${userId}, channelId=${config?.channelId || 'none'}, key=${pollingKey}`);

    // Check every 30 seconds; Discord has stricter rate limits than Spotify
    const interval = setInterval(async () => {
      const result = await this.hasNewDiscordMessage(userId, config);
      callback(result);
    }, 30000);

    this.pollIntervals.set(pollingKey, interval);
  }

  /**
   * Clears and removes the active polling interval for the given user.
   *
   * @param userId - The user identifier.
   */
  stopPolling(userId: string): void {
    // Try to stop all polling intervals for this user (with any channelId)
    const keysToRemove: string[] = [];

    for (const [key, interval] of this.pollIntervals.entries()) {
      if (key.startsWith(userId)) {
        this.logger.debug(`[Discord] Stopping polling for key=${key}`);
        clearInterval(interval);
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.pollIntervals.delete(key));

    if (keysToRemove.length === 0) {
      this.logger.debug(`[Discord] No polling intervals found for user=${userId}`);
    }
  }

  /**
   * Returns the list of placeholders available for this action.
   * These placeholders can be used in reaction configurations.
   */
  getPlaceholders(): ActionPlaceholder[] {
    return [
      {
        key: 'DISCORD_MESSAGE_ID',
        description: 'The unique ID of the message',
        example: '1234567890123456789',
      },
      {
        key: 'DISCORD_MESSAGE_CONTENT',
        description: 'The content/text of the message',
        example: 'Hello everyone!',
      },
      {
        key: 'DISCORD_MESSAGE_AUTHOR_USERNAME',
        description: 'The username of the message author',
        example: 'john_doe',
      },
      {
        key: 'DISCORD_MESSAGE_AUTHOR_DISCRIMINATOR',
        description: 'The discriminator of the message author',
        example: '1234',
      },
      {
        key: 'DISCORD_MESSAGE_AUTHOR_ID',
        description: 'The unique ID of the message author',
        example: '9876543210987654321',
      },
      {
        key: 'DISCORD_MESSAGE_TIMESTAMP',
        description: 'When the message was sent (ISO 8601 format)',
        example: '2023-12-10T15:30:00.000Z',
      },
      {
        key: 'DISCORD_MESSAGE_GUILD_NAME',
        description: 'The name of the Discord server/guild',
        example: 'My Awesome Server',
      },
      {
        key: 'DISCORD_MESSAGE_CHANNEL_NAME',
        description: 'The name of the channel where the message was posted',
        example: 'general',
      },
      {
        key: 'DISCORD_MESSAGE_CHANNEL_ID',
        description: 'The unique ID of the channel',
        example: '1111111111111111111',
      },
      {
        key: 'DISCORD_MESSAGE_TYPE',
        description: 'The type of message (0 = default, 7 = user join, etc.)',
        example: '0',
      },
      {
        key: 'DISCORD_MESSAGE_EDITED_TIMESTAMP',
        description: 'When the message was last edited (if applicable)',
        example: '2023-12-10T15:35:00.000Z',
      },
      {
        key: 'DISCORD_MESSAGE_MENTION_EVERYONE',
        description: 'Whether the message mentions @everyone',
        example: 'false',
      },
      {
        key: 'DISCORD_MESSAGE_ATTACHMENTS_COUNT',
        description: 'Number of file attachments in the message',
        example: '2',
      },
      {
        key: 'DISCORD_MESSAGE_EMBEDS_COUNT',
        description: 'Number of embeds in the message',
        example: '1',
      },
    ];
  }
}
