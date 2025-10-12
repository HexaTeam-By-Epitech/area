import { Injectable, Logger } from '@nestjs/common';
import { DiscordBotService } from '../../discord-bot/discord-bot.service';

export interface DiscordSendConfig {
  channelId: string;
  message: string;
}

/**
 * Service for sending messages to Discord channels as a reaction using the Discord bot.
 * Uses the centralized Discord bot connection instead of individual API requests.
 */
@Injectable()
export class DiscordSendService {
  private readonly logger = new Logger(DiscordSendService.name);

  constructor(private readonly discordBotService: DiscordBotService) {}

  /**
   * Send a message to a specific Discord channel using the Discord bot
   * @param userId - The user ID who owns the area
   * @param config - Configuration containing channelId and message
   * @returns Success result
   */
  async run(userId: string, config: DiscordSendConfig): Promise<{ success: boolean; messageId?: string }> {
    try {
      this.logger.debug(`Sending Discord message for user ${userId} to channel ${config.channelId}`);

      // Check if Discord bot is ready
      if (!this.discordBotService.isReady()) {
        this.logger.error('Discord bot is not connected or ready');
        throw new Error('Discord bot not available');
      }

      // Send message using the Discord bot
      const message = await this.discordBotService.sendMessage(config.channelId, config.message);

      if (!message) {
        throw new Error('Failed to send message via Discord bot');
      }

      this.logger.log(`Successfully sent Discord message to channel ${config.channelId}`);

      return {
        success: true,
        messageId: message.id,
      };

    } catch (error) {
      this.logger.error(`Failed to send Discord message: ${error.message}`);
      throw error;
    }
  }
}
