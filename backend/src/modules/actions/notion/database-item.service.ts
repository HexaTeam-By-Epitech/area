import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../../auth/auth.service';
import { RedisService } from '../../redis/redis.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import type { PollingAction, ActionResult, ActionPlaceholder } from '../../../common/interfaces/area.type';
import { ActionNamesEnum } from '../../../common/interfaces/action-names.enum';

/**
 * Interface for Notion database item data
 */
interface NotionDatabaseItemData {
  NOTION_ITEM_ID: string;
  NOTION_ITEM_URL: string;
  NOTION_ITEM_CREATED_TIME: string;
  NOTION_ITEM_LAST_EDITED_TIME: string;
  NOTION_DATABASE_ID: string;
  [key: string]: string; // Dynamic properties from database schema
}

/**
 * Notion polling action that detects new items added to a database.
 *
 * Strategy:
 * - Periodically queries the specified Notion database sorted by created_time descending
 * - Fetches the most recent item and compares its created_time with cached value in Redis
 * - Extracts all properties from the database item to make them available as placeholders
 * - Returns 0 (trigger) if a newer item is found
 * - Returns 1 if unchanged or first baseline initialization
 * - Returns -1 if Notion provider is not linked for the user
 *
 * Caching semantics:
 * - Redis key: `notion:last_item_created_time:${userId}:${databaseId}`
 * - First time we see an item and no cached value exists -> store it and return 1 (no trigger on historical items)
 * - Empty database -> store empty string and return 1
 */
@Injectable()
export class NotionDatabaseItemService implements PollingAction {
  private readonly pollIntervalMs = Number(process.env.NOTION_POLL_INTERVAL_MS || 10000);
  private readonly logger = new Logger(NotionDatabaseItemService.name);
  /** Active polling intervals keyed by user id. */
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  /** Name supported by this polling action. */
  supports(actionName: string): boolean {
    return actionName === ActionNamesEnum.NOTION_NEW_DATABASE_ITEM;
  }

  /** Start polling loop for a user. */
  start(userId: string, emit: (result: ActionResult) => void, config?: { databaseId?: string }): void {
    if (!config?.databaseId) {
      this.logger.error(`[Notion] No databaseId provided for user=${userId}`);
      return;
    }
    this.startPolling(userId, emit, config.databaseId);
  }

  /** Stop polling loop for a user. */
  stop(userId: string): void {
    this.stopPolling(userId);
  }

  /**
   * Core check to determine if a new database item has been added.
   * @param userId - The user identifier.
   * @param config - Configuration object containing the databaseId to monitor.
   * @returns A promise resolving to an ActionResult with code and item data.
   */
  async hasNewDatabaseItem(userId: string, config?: { databaseId?: string }): Promise<ActionResult> {
    if (!config?.databaseId) {
      this.logger.error(`[Notion] No databaseId provided for user=${userId}`);
      return { code: -1 };
    }

    const databaseId = config.databaseId;
    const cacheKey = `notion:last_item_created_time:${userId}:${databaseId}`;

    // Ensure provider linked
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Notion);
    if (!linked) {
      this.logger.debug(`[Notion] Provider not linked for user=${userId}`);
      return { code: -1 };
    }

    const cachedBefore = await this.redisService.getValue(cacheKey);
    this.logger.debug(`[Notion] Checking database ${databaseId} for user=${userId} (previous cached=${cachedBefore ?? 'none'})`);

    let queryRes;
    try {
      // Query the database sorted by created_time descending to get the most recent item
      queryRes = await this.authService.oAuth2ApiRequest<{
        results?: any[];
        has_more?: boolean;
      }>(ProviderKeyEnum.Notion, userId, {
        method: 'POST',
        url: `https://api.notion.com/v1/databases/${databaseId}/query`,
        headers: {
          'Notion-Version': '2022-06-28',
        },
        data: {
          sorts: [
            {
              timestamp: 'created_time',
              direction: 'descending',
            },
          ],
          page_size: 1,
        },
      });
      this.logger.debug(`[Notion] Query status=${queryRes.status} user=${userId}`);
    } catch (err: any) {
      const status = err?.response?.status;
      this.logger.error(`[Notion] Query API error user=${userId} status=${status} msg=${err?.message}`);
      return { code: 1 }; // treat as no change to avoid spamming reaction on transient error
    }

    const results = queryRes.data.results || [];
    this.logger.debug(`[Notion] Items fetched count=${results.length} user=${userId}`);

    if (results.length === 0) {
      // Empty database - store empty baseline
      await this.redisService.setValue(cacheKey, '');
      if (cachedBefore === '') {
        this.logger.debug(`[Notion] Database still empty (idempotent empty baseline) user=${userId}`);
      } else {
        this.logger.debug(`[Notion] Database empty baseline set (was=${cachedBefore ?? 'none'}) user=${userId}`);
      }
      return { code: 1 };
    }

    const latestItem = results[0];
    const createdTime = latestItem.created_time;

    if (!createdTime) {
      this.logger.debug(`[Notion] Latest item missing created_time user=${userId}`);
      return { code: 1 };
    }

    // Check if this is a new item
    if (!cachedBefore) {
      // First time - store baseline and don't trigger
      await this.redisService.setValue(cacheKey, createdTime);
      this.logger.debug(`[Notion] Baseline set to ${createdTime} user=${userId}`);
      return { code: 1 };
    }

    // Check if there's a newer item (same strategy as Spotify)
    // Using > comparison prevents false triggers when items are deleted
    if (createdTime > cachedBefore) {
      // New item detected - extract all properties as placeholders
      const itemData = this.extractItemData(latestItem, databaseId);
      await this.redisService.setValue(cacheKey, createdTime);
      
      this.logger.log(`[Notion] New database item detected for user=${userId} itemId=${latestItem.id} created_time=${createdTime}`);
      return { code: 0, data: itemData };
    }

    // No new item (unchanged or older due to deletion)
    this.logger.debug(`[Notion] No new item for user=${userId} (latest=${createdTime}, cached=${cachedBefore})`);
    return { code: 1 };
  }

  /**
   * Extract data from a Notion database item for use as placeholders.
   * Handles dynamic properties based on the database schema.
   */
  private extractItemData(item: any, databaseId: string): NotionDatabaseItemData {
    const data: NotionDatabaseItemData = {
      NOTION_ITEM_ID: item.id || '',
      NOTION_ITEM_URL: item.url || '',
      NOTION_ITEM_CREATED_TIME: item.created_time || '',
      NOTION_ITEM_LAST_EDITED_TIME: item.last_edited_time || '',
      NOTION_DATABASE_ID: databaseId,
    };

    // Extract properties dynamically
    const properties = item.properties || {};
    for (const [propertyName, propertyValue] of Object.entries(properties)) {
      const value = this.extractPropertyValue(propertyValue as any);
      if (value !== null) {
        // Create a sanitized key for the placeholder
        const sanitizedKey = `NOTION_PROP_${propertyName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        data[sanitizedKey] = value;
      }
    }

    return data;
  }

  /**
   * Extract the actual value from a Notion property based on its type.
   */
  private extractPropertyValue(property: any): string | null {
    if (!property || !property.type) return null;

    try {
      switch (property.type) {
        case 'title':
          return property.title?.map((t: any) => t.plain_text).join('') || '';
        case 'rich_text':
          return property.rich_text?.map((t: any) => t.plain_text).join('') || '';
        case 'number':
          return property.number !== null && property.number !== undefined ? String(property.number) : '';
        case 'select':
          return property.select?.name || '';
        case 'multi_select':
          return property.multi_select?.map((s: any) => s.name).join(', ') || '';
        case 'date':
          return property.date?.start || '';
        case 'checkbox':
          return property.checkbox ? 'true' : 'false';
        case 'url':
          return property.url || '';
        case 'email':
          return property.email || '';
        case 'phone_number':
          return property.phone_number || '';
        case 'status':
          return property.status?.name || '';
        case 'people':
          return property.people?.map((p: any) => p.name || p.id).join(', ') || '';
        case 'files':
          return property.files?.map((f: any) => f.name || f.file?.url || f.external?.url).filter(Boolean).join(', ') || '';
        case 'relation':
          return property.relation?.map((r: any) => r.id).join(', ') || '';
        case 'formula':
          // Formulas can have different result types
          if (property.formula?.type === 'string') return property.formula.string || '';
          if (property.formula?.type === 'number') return String(property.formula.number);
          if (property.formula?.type === 'boolean') return property.formula.boolean ? 'true' : 'false';
          if (property.formula?.type === 'date') return property.formula.date?.start || '';
          return '';
        case 'rollup':
          // Rollups can have different result types
          if (property.rollup?.type === 'number') return String(property.rollup.number);
          if (property.rollup?.type === 'array') return property.rollup.array?.length ? String(property.rollup.array.length) : '0';
          return '';
        default:
          return '';
      }
    } catch (err) {
      this.logger.warn(`[Notion] Error extracting property type=${property.type}: ${err}`);
      return null;
    }
  }

  /**
   * Returns the list of base placeholders available for this action.
   * Note: Dynamic property placeholders are determined at runtime based on the database schema.
   */
  getPlaceholders(): ActionPlaceholder[] {
    return [
      {
        key: 'NOTION_ITEM_ID',
        description: 'The unique ID of the database item',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
      {
        key: 'NOTION_ITEM_URL',
        description: 'The URL to view the item in Notion',
        example: 'https://www.notion.so/Page-Title-123e4567e89b12d3a456426614174000',
      },
      {
        key: 'NOTION_ITEM_CREATED_TIME',
        description: 'When the item was created (ISO 8601 format)',
        example: '2023-12-10T15:30:00.000Z',
      },
      {
        key: 'NOTION_ITEM_LAST_EDITED_TIME',
        description: 'When the item was last edited (ISO 8601 format)',
        example: '2023-12-10T15:35:00.000Z',
      },
      {
        key: 'NOTION_DATABASE_ID',
        description: 'The ID of the database containing the item',
        example: '123e4567e89b12d3a456426614174000',
      },
      {
        key: 'NOTION_PROP_*',
        description: 'Dynamic properties from the database (e.g., NOTION_PROP_NAME, NOTION_PROP_STATUS)',
        example: 'Property values vary by database schema',
      },
    ];
  }

  /**
   * Start polling for new database items.
   */
  private startPolling(userId: string, emit: (result: ActionResult) => void, databaseId: string): void {
    const key = `${userId}:${databaseId}`;
    if (this.pollIntervals.has(key)) {
      this.logger.warn(`[Notion] Already polling for user=${userId} database=${databaseId}`);
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const result = await this.hasNewDatabaseItem(userId, { databaseId });
        if (result.code === 0) {
          emit(result);
        }
      } catch (err: any) {
        this.logger.error(`[Notion] Polling error for user=${userId}: ${err?.message}`);
      }
    }, this.pollIntervalMs);

    this.pollIntervals.set(key, intervalId);
    this.logger.log(`[Notion] Started polling for user=${userId} database=${databaseId} interval=${this.pollIntervalMs}ms`);
  }

  /**
   * Stop polling for a user.
   */
  private stopPolling(userId: string): void {
    const keysToRemove: string[] = [];

    for (const [key, intervalId] of this.pollIntervals.entries()) {
      if (key.startsWith(userId)) {
        clearInterval(intervalId);
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => this.pollIntervals.delete(key));
    if (keysToRemove.length > 0) {
      this.logger.log(`[Notion] Stopped polling for user=${userId} (${keysToRemove.length} databases)`);
    }
  }
}

