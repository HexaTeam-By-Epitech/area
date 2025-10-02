import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../../auth/auth.service';
import { RedisService } from '../../redis/redis.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import type { PollingAction } from '../../../common/interfaces/area.type';

/**
 * Gmail polling action that detects arrival of a new email in the user's primary inbox.
 *
 * Strategy:
 * - Periodically list the most recent message in the INBOX (maxResults=1)
 * - Fetch its metadata to obtain `internalDate` (millisecond epoch as string)
 * - Compare with the last cached internalDate in Redis
 *   - Return 0 (trigger) if a strictly newer internalDate is found (and not the first baseline)
 *   - Return 1 if unchanged or first baseline initialization
 *   - Return -1 if Gmail (Google) provider is not linked for the user
 *
 * Caching semantics:
 * - Redis key: `gmail:last_email_internal_date:${userId}`
 * - First time we see a message and no cached value exists -> store it and return 1 (no trigger on historical mail)
 * - Empty mailbox -> store empty string and return 1
 */
@Injectable()
export class GmailNewMailService implements PollingAction {
  // Intervalle de polling configurable via variable d'environnement
  private readonly pollIntervalMs = Number(process.env.GMAIL_POLL_INTERVAL_MS || 5000);
  private readonly logger = new Logger(GmailNewMailService.name);
  /** Active polling intervals keyed by user id. */
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  /** Name supported by this polling action. */
  supports(actionName: string): boolean {
    return actionName === 'gmail_new_mail';
  }

  /** Start polling loop for a user. */
  start(userId: string, emit: (result: number) => void): void {
    this.startPolling(userId, emit);
  }

  /** Stop polling loop for a user. */
  stop(userId: string): void {
    this.stopPolling(userId);
  }

  /**
   * Core check to determine if a newer email has arrived.
   * Result codes:
   *  - 0: New email detected (internalDate strictly greater than cached)
   *  - 1: No change (includes first baseline population & empty mailbox)
   *  - -1: Gmail provider not linked
   */
  async hasNewGmailEmail(userId: string): Promise<number> {
    const cacheKey = `gmail:last_email_internal_date:${userId}`;
    const cacheIdKey = `gmail:last_email_id:${userId}`;
    const scopeMode = (process.env.GMAIL_SCOPE_MODE || 'INBOX').toUpperCase(); // INBOX | ALL

    // Ensure provider linked
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Google);
    if (!linked) {
      this.logger.debug(`[Gmail] Provider not linked for user=${userId}`);
      return -1;
    }

    // List most recent message (INBOX by default). We rely on recency order.
    const cachedBefore = await this.redisService.getValue(cacheKey);
    this.logger.debug(`[Gmail] Listing latest message for user=${userId} (previous cached=${cachedBefore ?? 'none'})`);
    let lastIdBefore = await this.redisService.getValue(cacheIdKey);
    // Heuristic: if cached id equals cached internalDate (likely due to legacy single-value caching), ignore the id
    if (lastIdBefore && cachedBefore && lastIdBefore === cachedBefore) {
      this.logger.debug(`[Gmail] Cached message id appears to be same as internalDate value; ignoring cachedId user=${userId}`);
      lastIdBefore = null;
    }
    let listRes;
    try {
      listRes = await this.authService.oAuth2ApiRequest<{
        messages?: { id: string; threadId: string }[];
        resultSizeEstimate?: number;
      }>(ProviderKeyEnum.Google, userId, {
        method: 'GET',
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
        params: scopeMode === 'ALL' ? { maxResults: 1 } : { maxResults: 1, labelIds: 'INBOX' },
      });
      this.logger.debug(`[Gmail] List status=${listRes.status} user=${userId}`);
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(`[Gmail] List API error user=${userId} status=${status} msg=${err?.message}`);
      return 1; // treat as no change to avoid spamming reaction on transient error
    }

    let messages = listRes.data.messages || [];
    this.logger.debug(`[Gmail] Messages fetched count=${messages.length} user=${userId}`);

    // Fallback only if INBOX mode
    if (messages.length === 0 && scopeMode !== 'ALL') {
      try {
        const profile = await this.authService.oAuth2ApiRequest<{ emailAddress?: string; messagesTotal?: number; threadsTotal?: number }>(
          ProviderKeyEnum.Google,
          userId,
          { method: 'GET', url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile' },
        );
        this.logger.debug(`[Gmail] Profile messagesTotal=${profile.data.messagesTotal ?? 'unknown'} user=${userId}`);
        if ((profile.data.messagesTotal ?? 0) > 0) {
          const retry = await this.authService.oAuth2ApiRequest<{
            messages?: { id: string; threadId: string }[];
          }>(ProviderKeyEnum.Google, userId, {
            method: 'GET',
            url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
            params: { maxResults: 1 },
          });
          messages = retry.data.messages || [];
          this.logger.debug(`[Gmail] Retry list without labelIds count=${messages.length} user=${userId}`);
        }
      } catch (e: any) {
        this.logger.warn(`[Gmail] Profile or retry failed user=${userId} msg=${e?.message}`);
      }
    }

    if (messages.length === 0) {
      // Always (re)store empty baseline so external expectations see a write
      await this.redisService.setValue(cacheKey, '');
      await this.redisService.setValue(cacheIdKey, '');
      if (cachedBefore === '') {
        this.logger.debug(`[Gmail] Inbox still empty (idempotent empty baseline) user=${userId}`);
      } else {
        this.logger.debug(`[Gmail] Inbox empty baseline set (was=${cachedBefore ?? 'none'}) user=${userId}`);
      }
      return 1;
    }

    const latestId = messages[0].id;
    if (!latestId) {
      this.logger.debug(`[Gmail] Latest item missing id user=${userId}`);
      return 1;
    }

    // Fetch metadata to get internalDate (millisecond epoch as string)
    let msgRes;
    try {
      msgRes = await this.authService.oAuth2ApiRequest<{ internalDate?: string }>(
        ProviderKeyEnum.Google,
        userId,
        {
          method: 'GET',
          url: `https://gmail.googleapis.com/gmail/v1/users/me/messages/${latestId}`,
          params: { format: 'metadata' },
        },
      );
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(`[Gmail] Message metadata error user=${userId} id=${latestId} status=${status} msg=${err?.message}`);
      return 1;
    }

    const internalDate = msgRes.data.internalDate; // e.g. '1730388012345'
    if (!internalDate) {
      this.logger.debug(`[Gmail] Missing internalDate for messageId=${latestId} user=${userId}`);
      return 1;
    }

    const cached = cachedBefore; // already fetched earlier
    const cachedId = lastIdBefore;
    this.logger.debug(`[Gmail] Latest messageId=${latestId} internalDate=${internalDate}, cachedDate=${cached ?? 'none'} cachedId=${cachedId ?? 'none'} user=${userId}`);

    if (cached === null && !cachedId) { // first observation (no timestamp no id)
      await this.redisService.setValue(cacheKey, internalDate);
      await this.redisService.setValue(cacheIdKey, latestId);
      this.logger.debug(`[Gmail] Baseline initialized id=${latestId} internalDate=${internalDate} user=${userId}`);
      return 1;
    }

    // Determine if we should trigger:
    // 1. Newer timestamp than cached (and cached not empty string)
    // 2. Previous state was an empty inbox baseline (cached === '') and now we have a message
    const isNewerTimestamp = cached !== null && cached !== '' && internalDate > cached;
    const wasEmptyBaseline = cached === '';

    if (isNewerTimestamp || wasEmptyBaseline) {
      await this.redisService.setValue(cacheKey, internalDate);
      await this.redisService.setValue(cacheIdKey, latestId);
      this.logger.log(`[Gmail] New email detected user=${userId} messageId=${latestId} internalDate=${internalDate} prevDate=${cached} prevId=${cachedId}`);
      return 0;
    }

    // Only store id if missing (do not treat id-only change with same timestamp as new mail)
    if (!cachedId) {
      await this.redisService.setValue(cacheIdKey, latestId);
    }

    this.logger.debug(`[Gmail] No newer email (timestamp unchanged) user=${userId}`);
    return 1;
  }

  /** Internal: start interval polling. */
  private startPolling(userId: string, callback: (result: number) => void): void {
    if (this.pollIntervals.has(userId)) return;

    const interval = setInterval(async () => {
      try {
        const result = await this.hasNewGmailEmail(userId);
        this.logger.debug(`[Gmail] Poll result user=${userId} code=${result}`);
        callback(result);
      } catch (err: any) {
        this.logger.error(`[Gmail] Poll error for user=${userId}: ${err?.message ?? err}`);
      }
    }, this.pollIntervalMs);

    this.pollIntervals.set(userId, interval);
  }

  /** Internal: stop interval polling. */
  private stopPolling(userId: string): void {
    const interval = this.pollIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(userId);
    }
  }
}
