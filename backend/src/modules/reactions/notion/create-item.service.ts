import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../../auth/auth.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import type { Reactions, Field } from '../../../common/interfaces/area.type';

interface NotionCreateItemParams {
  databaseId: string;
  /** Raw Notion properties JSON as string (optional). If provided and valid, overrides other property fields. */
  propertiesJson?: string;
  /** Convenience: Notion title property name (e.g., "Name") */
  titlePropertyName?: string;
  /** Convenience: Page title text value */
  title?: string;
}

@Injectable()
export class NotionCreateDatabaseItemService implements Reactions {
  private readonly logger = new Logger(NotionCreateDatabaseItemService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // Replace special NOW tokens in Notion date properties with current ISO timestamp
  private replaceNowTokensInProperties(properties: any): any {
    if (!properties || typeof properties !== 'object') return properties;

    const NOW_TOKENS = new Set<string>(['__NOW__', '$NOW', 'NOW', '{{NOW}}', 'now']);
    const isNowToken = (val: unknown): boolean => typeof val === 'string' && NOW_TOKENS.has(val.trim());
    const nowIso = new Date().toISOString();

    try {
      for (const key of Object.keys(properties)) {
        const propVal = properties[key];
        if (!propVal || typeof propVal !== 'object') continue;

        if (Object.prototype.hasOwnProperty.call(propVal, 'date')) {
          const dateVal = propVal.date;
          if (dateVal == null) continue;
          if (typeof dateVal === 'string') {
            if (isNowToken(dateVal)) {
              propVal.date = { start: nowIso };
            }
          } else if (typeof dateVal === 'object') {
            if (isNowToken((dateVal as any).start)) {
              (dateVal as any).start = nowIso;
            }
            if (isNowToken((dateVal as any).end)) {
              (dateVal as any).end = nowIso;
            }
          }
        }
      }
    } catch (e) {
      // In case of unexpected structure, log and proceed without blocking
      this.logger.warn(`[Notion] Failed to process NOW tokens in properties: ${e instanceof Error ? e.message : String(e)}`);
    }

    return properties;
  }

  async run(userId: string, params: NotionCreateItemParams): Promise<void> {
    const { databaseId } = params || ({} as NotionCreateItemParams);

    if (!databaseId) {
      this.logger.warn(`[Notion] Missing or invalid databaseId for user=${userId}`);
      throw new Error('Notion databaseId is required');
    }

    // Ensure provider is linked for the user
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Notion);
    if (!linked) {
      this.logger.warn(`[Notion] User ${userId} does not have a linked Notion account`);
      throw new Error('Notion account not linked');
    }

    // Build properties payload
    let properties: any | undefined;
    if (params.propertiesJson && params.propertiesJson.trim().length > 0) {
      try {
        const parsed = JSON.parse(params.propertiesJson);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('propertiesJson must be a JSON object');
        }
        // Inject dynamic NOW resolution for date properties
        properties = this.replaceNowTokensInProperties(parsed);
      } catch (err: any) {
        this.logger.warn(`[Notion] Invalid propertiesJson for user=${userId}: ${err?.message}`);
        throw new Error('Invalid propertiesJson: must be valid JSON object');
      }
    } else if (params.titlePropertyName && params.title !== undefined) {
      properties = {
        [params.titlePropertyName]: {
          title: [
            {
              type: 'text',
              text: { content: String(params.title) },
            },
          ],
        },
      };
    } else {
      // Allow creating an empty page (Notion permits creating pages with no properties)
      properties = {};
    }

    // Create the page in the database
    try {
      const res = await this.authService.oAuth2ApiRequest<any>(ProviderKeyEnum.Notion, userId, {
        method: 'POST',
        url: 'https://api.notion.com/v1/pages',
        headers: {
          'Notion-Version': '2022-06-28',
        },
        data: {
          parent: { database_id: databaseId },
          properties,
        },
      });

      const page = res?.data;
      const pageId: string = page?.id || '';
      this.logger.log(`[Notion] Created page ${pageId} in database ${databaseId} for user=${userId}`);
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      this.logger.error(`[Notion] Failed to create page for user=${userId} status=${status} body=${JSON.stringify(body)}`);
      throw new Error('Failed to create Notion database item');
    }
  }

  getFields(): Field[] {
    return [
      { name: 'databaseId', type: 'string', required: true },
      { name: 'titlePropertyName', type: 'string', required: false },
      { name: 'title', type: 'string', required: false },
      { name: 'propertiesJson', type: 'string', required: false },
    ];
  }
}
