import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface DiscordSendConfig {
  channelId: string;
  message: string;
}

/**
 * Service for sending messages to Discord channels as a reaction.
 * Handles Discord bot integration to post messages when actions trigger.
 */
@Injectable()
export class DiscordSendService {
  private readonly logger = new Logger(DiscordSendService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a message to a specific Discord channel
   * @param userId - The user ID who owns the area
   * @param config - Configuration containing channelId and message
   * @returns Success result
   */
  async run(userId: string, config: DiscordSendConfig): Promise<{ success: boolean; messageId?: string }> {
    try {
      this.logger.debug(`Sending Discord message for user ${userId} to channel ${config.channelId}`);

      // Get Discord OAuth provider
      const discordProvider = await this.prisma.oauth_providers.findFirst({
        where: {
          name: 'discord',
        },
      });

      if (!discordProvider) {
        this.logger.error('Discord OAuth provider not found');
        throw new Error('Discord provider not configured');
      }

      // Get user's Discord linked account
      const discordAccount = await this.prisma.linked_accounts.findFirst({
        where: {
          user_id: userId,
          provider_id: discordProvider.id,
          is_active: true,
          deleted_at: null,
        },
      });

      if (!discordAccount || !discordAccount.access_token) {
        this.logger.error(`No Discord account linked for user ${userId}`);
        throw new Error('Discord not linked for this user');
      }

      // Send message to Discord channel using Discord API
      const response = await fetch(`https://discord.com/api/v10/channels/${config.channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${discordAccount.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: config.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Discord API error: ${response.status} - ${errorData}`);
        throw new Error(`Failed to send Discord message: ${response.status}`);
      }

      const messageData = await response.json();

      this.logger.log(`Successfully sent Discord message to channel ${config.channelId}`);

      return {
        success: true,
        messageId: messageData.id,
      };

    } catch (error) {
      this.logger.error(`Failed to send Discord message: ${error.message}`);
      throw error;
    }
  }
}
