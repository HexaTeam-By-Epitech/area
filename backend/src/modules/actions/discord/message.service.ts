import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { DiscordBotService } from '../../discord-bot/discord-bot.service';
import type { ActionResult, ActionPlaceholder } from '../../../common/interfaces/area.type';
import { ActionNamesEnum } from '../../../common/interfaces/action-names.enum';
import { Events, Message } from 'discord.js';

/**
 * Interface defining the structure of Discord message data available as placeholders
 */
interface DiscordMessageData {
  DISCORD_MESSAGE_ID: string;
  DISCORD_MESSAGE_CONTENT: string;
  DISCORD_MESSAGE_AUTHOR_USERNAME: string;
  DISCORD_MESSAGE_AUTHOR_DISCRIMINATOR: string;
  DISCORD_MESSAGE_AUTHOR_ID: string;
  DISCORD_MESSAGE_TIMESTAMP: string;
  DISCORD_MESSAGE_GUILD_NAME: string;
  DISCORD_MESSAGE_CHANNEL_ID: string;
  DISCORD_MESSAGE_TYPE: string;
  DISCORD_MESSAGE_EDITED_TIMESTAMP: string;
  DISCORD_MESSAGE_MENTION_EVERYONE: string;
  DISCORD_MESSAGE_ATTACHMENTS_COUNT: string;
  DISCORD_MESSAGE_EMBEDS_COUNT: string;
}

/**
 * Metadata for each Discord message placeholder field
 */
const DISCORD_MESSAGE_PLACEHOLDERS: Record<keyof DiscordMessageData, { description: string; example: string }> = {
  DISCORD_MESSAGE_ID: {
    description: 'The unique ID of the message',
    example: '1234567890123456789',
  },
  DISCORD_MESSAGE_CONTENT: {
    description: 'The content/text of the message',
    example: 'Hello everyone!',
  },
  DISCORD_MESSAGE_AUTHOR_USERNAME: {
    description: 'The username of the message author',
    example: 'john_doe',
  },
  DISCORD_MESSAGE_AUTHOR_DISCRIMINATOR: {
    description: 'The discriminator of the message author',
    example: '1234',
  },
  DISCORD_MESSAGE_AUTHOR_ID: {
    description: 'The unique ID of the message author',
    example: '9876543210987654321',
  },
  DISCORD_MESSAGE_TIMESTAMP: {
    description: 'When the message was sent (ISO 8601 format)',
    example: '2023-12-10T15:30:00.000Z',
  },
  DISCORD_MESSAGE_GUILD_NAME: {
    description: 'The name of the Discord server/guild',
    example: 'My Awesome Server',
  },
  DISCORD_MESSAGE_CHANNEL_ID: {
    description: 'The unique ID of the channel',
    example: '1111111111111111111',
  },
  DISCORD_MESSAGE_TYPE: {
    description: 'The type of message (0 = default, 7 = user join, etc.)',
    example: '0',
  },
  DISCORD_MESSAGE_EDITED_TIMESTAMP: {
    description: 'When the message was last edited (if applicable)',
    example: '2023-12-10T15:35:00.000Z',
  },
  DISCORD_MESSAGE_MENTION_EVERYONE: {
    description: 'Whether the message mentions @everyone',
    example: 'false',
  },
  DISCORD_MESSAGE_ATTACHMENTS_COUNT: {
    description: 'Number of file attachments in the message',
    example: '2',
  },
  DISCORD_MESSAGE_EMBEDS_COUNT: {
    description: 'Number of embeds in the message',
    example: '1',
  },
};

/**
 * Discord real-time action that detects new messages using the Discord bot.
 *
 * This service uses the Discord bot's real-time connection to listen for
 * message events and triggers actions when new messages are posted in
 * monitored channels.
 */
@Injectable()
export class DiscordMessageService {
  /** Logger instance scoped to this service. */
  private readonly logger = new Logger(DiscordMessageService.name);

  /** Map of active listeners keyed by userId:channelId */
  private activeListeners: Map<string, (result: ActionResult) => void> = new Map();

  /** Flag to track if bot event listeners are set up */
  private listenersSetup = false;

  constructor(
    /** Redis service used as a cache to store the last seen message timestamp. */
    private readonly redisService: RedisService,
    /** Discord bot service for real-time message events */
    private readonly discordBotService: DiscordBotService,
  ) {}

  /**
   * Returns whether this action supports the given `actionName`.
   *
   * @param actionName - The identifier of the action to check.
   * @returns `true` if the action name is `ActionNamesEnum.DISCORD_NEW_MESSAGE`.
   */
  supports(actionName: string): boolean {
    return actionName === ActionNamesEnum.DISCORD_NEW_SERVER_MESSAGE;
  }

  /**
   * Starts listening for new messages for the given user and emits results to the provided callback.
   *
   * @param userId - The user identifier.
   * @param emit - Callback invoked with the ActionResult containing code and message data.
   * @param config - Configuration containing channelId to monitor
   */
  start(userId: string, emit: (result: ActionResult) => void, config?: { channelId?: string }): void {
    if (!config?.channelId) {
      this.logger.error(`[Discord] No channelId provided for user=${userId}`);
      return;
    }

    this.setupBotListeners();

    const listenerKey = `${userId}:${config.channelId}`;
    this.activeListeners.set(listenerKey, emit);

    this.logger.log(`[Discord] Started listening for messages in channel ${config.channelId} for user=${userId}`);
  }

  /**
   * Stops listening for new messages for the given user.
   *
   * @param userId - The user identifier.
   */
  stop(userId: string): void {
    // Remove all listeners for this user
    const keysToRemove: string[] = [];

    for (const [key] of this.activeListeners.entries()) {
      if (key.startsWith(userId)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.activeListeners.delete(key);
      this.logger.log(`[Discord] Stopped listening for user=${userId}, key=${key}`);
    });
  }

  /**
   * Sets up Discord bot event listeners for real-time message detection
   */
  private setupBotListeners(): void {
    if (this.listenersSetup) return;

    const client = this.discordBotService.getClient();

    if (!client) {
      this.logger.warn('[Discord] Bot client not available, cannot setup listeners');
      return;
    }

    client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleNewMessage(message);
    });

    this.listenersSetup = true;
    this.logger.log('[Discord] Bot event listeners setup complete');
  }

  /**
   * Creates a typed DiscordMessageData object from a Discord.js Message
   *
   * @param message - The Discord.js Message object
   * @param messageTimestamp - The ISO timestamp of the message
   * @returns Typed DiscordMessageData object with all placeholder fields
   */
  private createMessageData(message: Message, messageTimestamp: string): DiscordMessageData {
    // Get additional channel and guild info
    const guildName: string = message.guild?.name ?? 'Direct Message';


    return {
      DISCORD_MESSAGE_ID: message.id,
      DISCORD_MESSAGE_CONTENT: message.content || 'No content',
      DISCORD_MESSAGE_AUTHOR_USERNAME: message.author.username,
      DISCORD_MESSAGE_AUTHOR_DISCRIMINATOR: message.author.discriminator || '0',
      DISCORD_MESSAGE_AUTHOR_ID: message.author.id,
      DISCORD_MESSAGE_TIMESTAMP: messageTimestamp,
      DISCORD_MESSAGE_GUILD_NAME: guildName,
      DISCORD_MESSAGE_CHANNEL_ID: message.channelId,
      DISCORD_MESSAGE_TYPE: message.type.toString(),
      DISCORD_MESSAGE_EDITED_TIMESTAMP: message.editedAt?.toISOString() || '',
      DISCORD_MESSAGE_MENTION_EVERYONE: message.mentions.everyone.toString(),
      DISCORD_MESSAGE_ATTACHMENTS_COUNT: message.attachments.size.toString(),
      DISCORD_MESSAGE_EMBEDS_COUNT: message.embeds.length.toString(),
    };
  }

  /**
   * Handles a new Discord message and triggers relevant user callbacks
   */
  private async handleNewMessage(message: Message): Promise<void> {
    // Ignore messages from bots
    if (message.author.bot) return;

    const channelId = message.channelId;

    // Check all active listeners for this channel
    for (const [listenerKey, callback] of this.activeListeners.entries()) {
      const [userId, monitoredChannelId] = listenerKey.split(':');

      if (monitoredChannelId !== channelId) continue;

      try {
        const cacheKey = `discord:last_message_at:${userId}:${channelId}`;
        const lastStoredAt = await this.redisService.getValue(cacheKey);
        const messageTimestamp = message.createdAt.toISOString();

        // Skip if this message is older than or equal to the last stored timestamp
        if (lastStoredAt && messageTimestamp <= lastStoredAt) {
          continue;
        }

        // Update cache with new timestamp
        await this.redisService.setValue(cacheKey, messageTimestamp);

        // Create typed message data using utility method
        const messageData = this.createMessageData(message, messageTimestamp);

        this.logger.log(`[Discord] New message detected for user=${userId}: ${message.id} in channel ${channelId}`);

        // Trigger the callback with action result
        callback({ code: 0, data: messageData });

      } catch (error) {
        this.logger.error(`[Discord] Error processing message for user=${userId}: ${error.message}`);
        callback({ code: -1 });
      }
    }
  }

  /**
   * Checks if there are new messages in a specific Discord channel
   * This method is kept for compatibility but now uses the bot's real-time data
   *
   * @param userId - The user identifier.
   * @param config - Configuration containing required channelId to monitor
   * @returns A promise resolving to an ActionResult with code and message data.
   */
  async hasNewDiscordMessage(userId: string, config?: { channelId?: string }): Promise<ActionResult> {
    if (!this.discordBotService.isReady()) {
      this.logger.warn('[Discord] Bot not ready, cannot check messages');
      return { code: -1 };
    }

    if (!config?.channelId) {
      this.logger.error(`[Discord] No channelId provided for user=${userId}`);
      return { code: -1 };
    }

    // In real-time mode, we don't actively check - messages are pushed via events
    // Return neutral result indicating no new messages at this moment
    return { code: 1 };
  }

  /**
   * Returns the list of placeholders available for this action.
   * These placeholders can be used in reaction configurations.
   */
  getPlaceholders(): ActionPlaceholder[] {
    return Object.keys(DISCORD_MESSAGE_PLACEHOLDERS).map(key => ({
      key,
      ...DISCORD_MESSAGE_PLACEHOLDERS[key as keyof DiscordMessageData],
    }));
  }
}
