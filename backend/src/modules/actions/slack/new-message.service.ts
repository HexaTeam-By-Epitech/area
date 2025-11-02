import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../../auth/auth.service';
import { RedisService } from '../../redis/redis.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import type { PollingAction, ActionResult, ActionPlaceholder } from '../../../common/interfaces/area.type';
import { ActionNamesEnum } from '../../../common/interfaces/action-names.enum';

/**
 * Slack polling action that detects new messages in a specified channel.
 *
 * Strategy:
 * - Periodically list the most recent messages in a channel
 * - Compare with the last cached message timestamp in Redis
 *   - Return 0 (trigger) if a strictly newer message is found
 *   - Return 1 if unchanged or first baseline initialization
 *   - Return -1 if Slack provider is not linked for the user
 *
 * Caching semantics:
 * - Redis key: `slack:last_message_ts:${userId}:${channelId}`
 * - First time we see a message and no cached value exists -> store it and return 1 (no trigger on historical messages)
 * - Empty channel -> store empty string and return 1
 */
@Injectable()
export class SlackNewMessageService implements PollingAction {
  // Intervalle de polling configurable via variable d'environnement
  private readonly pollIntervalMs = Number(process.env.SLACK_POLL_INTERVAL_MS || 5000);
  private readonly logger = new Logger(SlackNewMessageService.name);
  /** Active polling intervals keyed by user id. */
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  /** Name supported by this polling action. */
  supports(actionName: string): boolean {
    return actionName === ActionNamesEnum.SLACK_NEW_MESSAGE;
  }

  /** Start polling loop for a user. */
  start(userId: string, emit: (result: ActionResult) => void, config?: any): void {
    this.startPolling(userId, emit, config);
  }

  /** Stop polling loop for a user. */
  stop(userId: string): void {
    this.stopPolling(userId);
  }

  /** Get placeholders for this action. */
  getPlaceholders(): ActionPlaceholder[] {
    return [
      { key: 'message_text', description: 'The content of the new Slack message', example: 'Hello everyone!' },
      { key: 'message_user', description: 'The user ID who sent the message', example: 'U1234567890' },
      { key: 'message_timestamp', description: 'The timestamp of the message', example: '1640995200.123456' },
      { key: 'channel_id', description: 'The channel ID where the message was posted', example: 'C1234567890' },
    ];
  }

  /**
   * Core check to determine if a newer message has arrived.
   * @param userId - The user identifier.
   * @param config - Configuration object containing channel information.
   * @returns A promise resolving to an ActionResult with code and message data.
   */
  async hasNewSlackMessage(userId: string, config?: any): Promise<ActionResult> {
    const channelId = config?.channelId || 'general';
    const cacheKey = `slack:last_message_ts:${userId}:${channelId}`;

    // Ensure provider linked
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Slack);
    if (!linked) {
      this.logger.debug(`[Slack] Provider not linked for user=${userId}`);
      return { code: -1 };
    }

    // List most recent messages in the channel
    const cachedBefore = await this.redisService.getValue(cacheKey);
    this.logger.debug(`[Slack] Listing latest messages for user=${userId} channel=${channelId} (previous cached=${cachedBefore ?? 'none'})`);
    
    let listRes;
    try {
      listRes = await this.authService.oAuth2ApiRequest<{
        messages?: Array<{
          ts: string;
          user: string;
          text: string;
          type: string;
        }>;
        ok: boolean;
      }>(ProviderKeyEnum.Slack, userId, {
        method: 'GET',
        url: 'https://slack.com/api/conversations.history',
        params: {
          channel: channelId,
          limit: 1,
          inclusive: true,
        },
      });
      this.logger.debug(`[Slack] List status=${listRes.status} user=${userId}`);
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(`[Slack] List API error user=${userId} status=${status} msg=${err?.message}`);
      return { code: 1 }; // treat as no change to avoid spamming reaction on transient error
    }

    const messages = listRes.data.messages || [];
    this.logger.debug(`[Slack] Messages fetched count=${messages.length} user=${userId}`);

    if (messages.length === 0) {
      // Always (re)store empty baseline so external expectations see a write
      await this.redisService.setValue(cacheKey, '');
      if (cachedBefore === '') {
        this.logger.debug(`[Slack] Channel still empty (idempotent empty baseline) user=${userId}`);
      } else {
        this.logger.debug(`[Slack] Channel empty baseline set (was=${cachedBefore ?? 'none'}) user=${userId}`);
      }
      return { code: 1 };
    }

    const latestMessage = messages[0];
    const messageTs = latestMessage.ts;
    
    if (!messageTs) {
      this.logger.debug(`[Slack] Latest message missing timestamp user=${userId}`);
      return { code: 1 };
    }

    const cached = cachedBefore; // already fetched earlier
    this.logger.debug(`[Slack] Latest message ts=${messageTs}, cachedTs=${cached ?? 'none'} user=${userId}`);

    if (cached === null) { // first observation (no timestamp)
      await this.redisService.setValue(cacheKey, messageTs);
      this.logger.debug(`[Slack] Baseline initialized ts=${messageTs} user=${userId}`);
      return { code: 1 };
    }

    // Determine if we should trigger:
    // 1. Newer timestamp than cached (and cached not empty string)
    // 2. Previous state was an empty channel baseline (cached === '') and now we have a message
    const isNewerTimestamp = cached !== '' && messageTs > cached;
    const wasEmptyBaseline = cached === '';

    if (isNewerTimestamp || wasEmptyBaseline) {
      await this.redisService.setValue(cacheKey, messageTs);
      this.logger.log(`[Slack] New message detected user=${userId} ts=${messageTs} prevTs=${cached}`);

      // Prepare placeholder data for reactions
      const placeholderData = {
        message_text: latestMessage.text || '',
        message_user: latestMessage.user || '',
        message_timestamp: messageTs,
        channel_id: channelId,
      };

      return {
        code: 0, // trigger
        data: placeholderData,
      };
    }

    this.logger.debug(`[Slack] No new message detected user=${userId} ts=${messageTs} cachedTs=${cached}`);
    return { code: 1 };
  }

  /**
   * Start polling for a user.
   */
  private startPolling(userId: string, emit: (result: ActionResult) => void, config?: any): void {
    if (this.pollIntervals.has(userId)) {
      this.logger.debug(`[Slack] Already polling for user=${userId}, skipping duplicate start`);
      return;
    }

    this.logger.debug(`[Slack] Starting polling for user=${userId} intervalMs=${this.pollIntervalMs}`);
    const intervalId = setInterval(async () => {
      try {
        const result = await this.hasNewSlackMessage(userId, config);
        if (result.code === 0) {
          emit(result);
        }
      } catch (error) {
        this.logger.error(`[Slack] Polling error for user=${userId}: ${error.message}`);
      }
    }, this.pollIntervalMs);

    this.pollIntervals.set(userId, intervalId);
  }

  /**
   * Stop polling for a user.
   */
  private stopPolling(userId: string): void {
    const intervalId = this.pollIntervals.get(userId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollIntervals.delete(userId);
      this.logger.debug(`[Slack] Stopped polling for user=${userId}`);
    } else {
      this.logger.debug(`[Slack] No active polling found for user=${userId}`);
    }
  }
}
