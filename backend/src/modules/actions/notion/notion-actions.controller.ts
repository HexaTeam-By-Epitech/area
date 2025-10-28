import { Controller, Get, UseGuards, Request, Logger, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';

/**
 * Controller for Notion-specific action endpoints.
 * Provides helper endpoints to configure Notion actions.
 */
@ApiTags('Actions - Notion')
@Controller('actions/notion')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class NotionActionsController {
  private readonly logger = new Logger(NotionActionsController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get all databases accessible to the user's linked Notion workspace.
   * This endpoint helps users select which database to monitor for the action.
   * 
   * @returns List of databases with their ID, title, and URL
   */
  @Get('databases')
  @ApiOperation({ 
    summary: 'List available Notion databases',
    description: 'Returns all databases accessible in the linked Notion workspace to help configure the notion_new_database_item action'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of databases retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        databases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
              title: { type: 'string', example: 'My Database' },
              url: { type: 'string', example: 'https://www.notion.so/123e4567e89b12d3a456426614174000' },
              created_time: { type: 'string', example: '2023-12-10T15:30:00.000Z' },
              last_edited_time: { type: 'string', example: '2023-12-10T15:35:00.000Z' },
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Notion account not linked' })
  @ApiResponse({ status: 500, description: 'Failed to fetch databases from Notion API' })
  async getDatabases(@Request() req: any) {
    const userId = req.user.sub;

    // Check if Notion is linked
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Notion);
    if (!linked) {
      this.logger.warn(`[Notion] User ${userId} attempted to fetch databases without linking Notion`);
      return { error: 'Notion account not linked', databases: [] };
    }

    try {
      // Search for all databases accessible to the integration
      const response = await this.authService.oAuth2ApiRequest<{
        results?: any[];
        has_more?: boolean;
        next_cursor?: string | null;
      }>(ProviderKeyEnum.Notion, userId, {
        method: 'POST',
        url: 'https://api.notion.com/v1/search',
        headers: {
          'Notion-Version': '2022-06-28',
        },
        data: {
          filter: {
            property: 'object',
            value: 'database',
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
        },
      });

      const databases = (response.data.results || []).map((db: any) => {
        // Extract database title from title property
        let title = 'Untitled';
        if (db.title && Array.isArray(db.title) && db.title.length > 0) {
          title = db.title.map((t: any) => t.plain_text || '').join('') || 'Untitled';
        }

        return {
          id: db.id,
          title,
          url: db.url,
          created_time: db.created_time,
          last_edited_time: db.last_edited_time,
        };
      });

      this.logger.log(`[Notion] Retrieved ${databases.length} databases for user ${userId}`);
      return { databases };

    } catch (error: any) {
      this.logger.error(`[Notion] Failed to fetch databases for user ${userId}: ${error?.message}`, error?.stack);
      return { 
        error: 'Failed to fetch databases from Notion', 
        message: error?.message || 'Unknown error',
        databases: [] 
      };
    }
  }

  /**
   * Get the schema (properties) of a specific Notion database.
   * This can help users understand what placeholders will be available.
   * 
   * @param req - Request object containing user info and database ID param
   * @returns Database schema with property definitions
   */
  @Get('databases/:databaseId/schema')
  @ApiOperation({ 
    summary: 'Get database schema',
    description: 'Returns the schema (properties) of a specific Notion database to preview available placeholders'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Database schema retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Notion account not linked' })
  @ApiResponse({ status: 404, description: 'Database not found' })
  async getDatabaseSchema(@Request() req: any, @Param('databaseId') databaseId: string) {
    const userId = req.user.sub;

    // Check if Notion is linked
    const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Notion);
    if (!linked) {
      this.logger.warn(`[Notion] User ${userId} attempted to fetch database schema without linking Notion`);
      return { error: 'Notion account not linked' };
    }

    try {
      // Retrieve database metadata including properties
      const response = await this.authService.oAuth2ApiRequest<any>(
        ProviderKeyEnum.Notion, 
        userId, 
        {
          method: 'GET',
          url: `https://api.notion.com/v1/databases/${databaseId}`,
          headers: {
            'Notion-Version': '2022-06-28',
          },
        }
      );

      const database = response.data;
      
      // Extract database title
      let title = 'Untitled';
      if (database.title && Array.isArray(database.title) && database.title.length > 0) {
        title = database.title.map((t: any) => t.plain_text || '').join('') || 'Untitled';
      }

      // Extract properties schema
      const properties = database.properties || {};
      const schema = Object.entries(properties).map(([name, prop]: [string, any]) => {
        const sanitizedKey = `NOTION_PROP_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        return {
          name,
          type: prop.type,
          placeholderKey: sanitizedKey,
        };
      });

      this.logger.log(`[Notion] Retrieved schema for database ${databaseId} (${schema.length} properties) for user ${userId}`);
      
      return { 
        databaseId: database.id,
        title,
        url: database.url,
        properties: schema,
        baseProperties: [
          { key: 'NOTION_ITEM_ID', description: 'The unique ID of the database item' },
          { key: 'NOTION_ITEM_URL', description: 'The URL to view the item in Notion' },
          { key: 'NOTION_ITEM_CREATED_TIME', description: 'When the item was created (ISO 8601 format)' },
          { key: 'NOTION_ITEM_LAST_EDITED_TIME', description: 'When the item was last edited (ISO 8601 format)' },
          { key: 'NOTION_DATABASE_ID', description: 'The ID of the database containing the item' },
        ]
      };

    } catch (error: any) {
      this.logger.error(`[Notion] Failed to fetch database schema ${databaseId} for user ${userId}: ${error?.message}`, error?.stack);
      return { 
        error: 'Failed to fetch database schema from Notion', 
        message: error?.message || 'Unknown error'
      };
    }
  }
}
