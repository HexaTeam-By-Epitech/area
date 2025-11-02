import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';

export interface SlackSendConfig {
  channelId: string;
  message: string;
  username?: string;
  iconEmoji?: string;
}

/**
 * Service for sending messages to Slack channels as a reaction.
 * Uses the Slack Web API to post messages to specified channels.
 */
@Injectable()
export class SlackSendService {
  private readonly logger = new Logger(SlackSendService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Send a message to a specific Slack channel
   * @param userId - The user ID who owns the area
   * @param actionResult - Result code from the triggering action (not used but required by interface)
   * @param config - Configuration containing channelId, message, and optional display settings
   * @returns Success result with message timestamp
   */
  async run(userId: string, actionResult: number, config: SlackSendConfig): Promise<{ success: boolean; messageTs?: string; error?: string }> {
    try {
      this.logger.debug(`Sending Slack message for user ${userId} to channel ${config.channelId}`);

      // Validate required configuration
      if (!config.channelId || !config.message) {
        const error = 'Missing required configuration: channelId and message are required';
        this.logger.error(error);
        return { success: false, error };
      }

      // Ensure Slack provider is linked
      const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Slack);
      if (!linked) {
        const error = 'Slack account not linked for this user';
        this.logger.error(`${error}: ${userId}`);
        return { success: false, error };
      }

      // Prepare message payload
      const payload: any = {
        channel: config.channelId,
        text: config.message,
      };

      // Add optional customization
      if (config.username) {
        payload.username = config.username;
      }
      if (config.iconEmoji) {
        payload.icon_emoji = config.iconEmoji;
      }

      // Send message using Slack Web API
      const response = await this.authService.oAuth2ApiRequest<{
        ok: boolean;
        ts?: string;
        error?: string;
        channel?: string;
      }>(ProviderKeyEnum.Slack, userId, {
        method: 'POST',
        url: 'https://slack.com/api/chat.postMessage',
        headers: {
          'Content-Type': 'application/json',
        },
        data: payload,
      });

      if (!response.data.ok) {
        const error = `Slack API error: ${response.data.error || 'Unknown error'}`;
        this.logger.error(error);
        return { success: false, error };
      }

      this.logger.log(`Successfully sent Slack message to channel ${config.channelId}, timestamp: ${response.data.ts}`);

      return {
        success: true,
        messageTs: response.data.ts,
      };

    } catch (error: any) {
      const errorMsg = `Failed to send Slack message: ${error.message}`;
      this.logger.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Validate Slack configuration
   * @param config - The configuration to validate
   * @returns Validation result with errors if any
   */
  validateConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.channelId) {
      errors.push('channelId is required');
    } else if (typeof config.channelId !== 'string') {
      errors.push('channelId must be a string');
    } else if (!config.channelId.match(/^[CGD][A-Z0-9]{8,}$/)) {
      errors.push('channelId must be a valid Slack channel ID (e.g., C1234567890)');
    }

    if (!config.message) {
      errors.push('message is required');
    } else if (typeof config.message !== 'string') {
      errors.push('message must be a string');
    } else if (config.message.length > 40000) {
      errors.push('message must be less than 40,000 characters');
    }

    if (config.username && typeof config.username !== 'string') {
      errors.push('username must be a string');
    }

    if (config.iconEmoji && typeof config.iconEmoji !== 'string') {
      errors.push('iconEmoji must be a string');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration schema for this reaction
   * @returns Array of configuration fields
   */
  getConfigSchema() {
    return [
      {
        name: 'channelId',
        type: 'string',
        required: true,
        label: 'Slack Channel ID',
        placeholder: 'C1234567890',
        description: 'The ID of the Slack channel where the message will be sent',
      },
      {
        name: 'message',
        type: 'string',
        required: true,
        label: 'Message',
        placeholder: 'Your message here...',
        description: 'The message to send (supports placeholders like {{message_text}})',
      },
      {
        name: 'username',
        type: 'string',
        required: false,
        label: 'Bot Username (optional)',
        placeholder: 'AREA Bot',
        description: 'Custom username for the bot (if not set, uses default bot name)',
      },
      {
        name: 'iconEmoji',
        type: 'string',
        required: false,
        label: 'Bot Icon Emoji (optional)',
        placeholder: ':robot_face:',
        description: 'Custom emoji icon for the bot (e.g., :robot_face:)',
      },
    ];
  }
}
