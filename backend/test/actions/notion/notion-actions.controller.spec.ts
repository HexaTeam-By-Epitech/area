import { Test, TestingModule } from '@nestjs/testing';
import { NotionActionsController } from '../../../src/modules/actions/notion/notion-actions.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

describe('NotionActionsController', () => {
  let controller: NotionActionsController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotionActionsController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            oAuth2ApiRequest: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findLinkedAccount: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotionActionsController>(NotionActionsController);
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDatabases', () => {
    const mockReq = {
      user: { sub: 'test-user-id' },
    };

    it('should return error if Notion is not linked', async () => {
      usersService.findLinkedAccount.mockResolvedValue(null);

      const result = await controller.getDatabases(mockReq);

      expect(result.error).toBe('Notion account not linked');
      expect(result.databases).toEqual([]);
      expect(usersService.findLinkedAccount).toHaveBeenCalledWith(
        'test-user-id',
        ProviderKeyEnum.Notion
      );
    });

    it('should return list of databases', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: {
          results: [
            {
              id: 'db-1',
              url: 'https://notion.so/db-1',
              title: [{ plain_text: 'My Database' }],
              created_time: '2023-12-10T15:30:00.000Z',
              last_edited_time: '2023-12-10T15:35:00.000Z',
            },
            {
              id: 'db-2',
              url: 'https://notion.so/db-2',
              title: [],
              created_time: '2023-12-09T10:00:00.000Z',
              last_edited_time: '2023-12-09T10:05:00.000Z',
            },
          ],
        },
      } as any);

      const result = await controller.getDatabases(mockReq);

      expect(result.databases).toHaveLength(2);
      expect(result.databases[0]).toMatchObject({
        id: 'db-1',
        title: 'My Database',
        url: 'https://notion.so/db-1',
      });
      expect(result.databases[1].title).toBe('Untitled');
    });

    it('should handle API errors gracefully', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      authService.oAuth2ApiRequest.mockRejectedValue(new Error('API error'));

      const result = await controller.getDatabases(mockReq);

      expect(result.error).toBe('Failed to fetch databases from Notion');
      expect(result.databases).toEqual([]);
    });
  });

  describe('getDatabaseSchema', () => {
    const mockReq = {
      user: { sub: 'test-user-id' },
    };
    const databaseId = 'test-db-id';

    it('should return error if Notion is not linked', async () => {
      usersService.findLinkedAccount.mockResolvedValue(null);

      const result = await controller.getDatabaseSchema(mockReq, databaseId);

      expect(result.error).toBe('Notion account not linked');
      expect(usersService.findLinkedAccount).toHaveBeenCalledWith(
        'test-user-id',
        ProviderKeyEnum.Notion
      );
    });

    it('should return database schema with properties', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: {
          id: databaseId,
          url: 'https://notion.so/db',
          title: [{ plain_text: 'Test Database' }],
          properties: {
            Name: {
              type: 'title',
            },
            Status: {
              type: 'select',
            },
            'Due Date': {
              type: 'date',
            },
          },
        },
      } as any);

      const result = await controller.getDatabaseSchema(mockReq, databaseId);

      expect(result.databaseId).toBe(databaseId);
      expect(result.title).toBe('Test Database');
      expect(result.properties).toHaveLength(3);
      expect(result.properties).toContainEqual({
        name: 'Name',
        type: 'title',
        placeholderKey: 'NOTION_PROP_NAME',
      });
      expect(result.properties).toContainEqual({
        name: 'Status',
        type: 'select',
        placeholderKey: 'NOTION_PROP_STATUS',
      });
      expect(result.properties).toContainEqual({
        name: 'Due Date',
        type: 'date',
        placeholderKey: 'NOTION_PROP_DUE_DATE',
      });
      expect(result.baseProperties).toBeDefined();
      expect(result.baseProperties.length).toBeGreaterThan(0);
    });

    it('should sanitize property names for placeholder keys', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: {
          id: databaseId,
          url: 'https://notion.so/db',
          title: [{ plain_text: 'DB' }],
          properties: {
            'Property with spaces & symbols!': {
              type: 'text',
            },
          },
        },
      } as any);

      const result = await controller.getDatabaseSchema(mockReq, databaseId);

      expect(result.properties[0].placeholderKey).toBe('NOTION_PROP_PROPERTY_WITH_SPACES___SYMBOLS_');
    });

    it('should handle API errors gracefully', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      authService.oAuth2ApiRequest.mockRejectedValue(new Error('Database not found'));

      const result = await controller.getDatabaseSchema(mockReq, databaseId);

      expect(result.error).toBe('Failed to fetch database schema from Notion');
      expect(result.message).toBe('Database not found');
    });
  });
});

