import { Test, TestingModule } from '@nestjs/testing';
import { NotionDatabaseItemService } from '../../../src/modules/actions/notion/database-item.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ActionNamesEnum } from '../../../src/common/interfaces/action-names.enum';

describe('NotionDatabaseItemService', () => {
  let service: NotionDatabaseItemService;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionDatabaseItemService,
        {
          provide: UsersService,
          useValue: {
            findLinkedAccount: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            oAuth2ApiRequest: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getValue: jest.fn(),
            setValue: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotionDatabaseItemService>(NotionDatabaseItemService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('supports', () => {
    it('should support NOTION_NEW_DATABASE_ITEM action', () => {
      expect(service.supports(ActionNamesEnum.NOTION_NEW_DATABASE_ITEM)).toBe(true);
    });

    it('should not support other actions', () => {
      expect(service.supports('other_action')).toBe(false);
    });
  });

  describe('hasNewDatabaseItem', () => {
    const userId = 'test-user-id';
    const databaseId = 'test-database-id';

    it('should return -1 if no databaseId is provided', async () => {
      const result = await service.hasNewDatabaseItem(userId, {});
      expect(result.code).toBe(-1);
    });

    it('should return -1 if Notion is not linked', async () => {
      usersService.findLinkedAccount.mockResolvedValue(null);

      const result = await service.hasNewDatabaseItem(userId, { databaseId });
      expect(result.code).toBe(-1);
    });

    it('should return 1 for empty database on first check', async () => {
      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      redisService.getValue.mockResolvedValue(null);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { results: [] },
      } as any);

      const result = await service.hasNewDatabaseItem(userId, { databaseId });
      expect(result.code).toBe(1);
      expect(redisService.setValue).toHaveBeenCalledWith(
        `notion:last_item_created_time:${userId}:${databaseId}`,
        ''
      );
    });

    it('should return 1 for first item (baseline)', async () => {
      const mockItem = {
        id: 'item-1',
        url: 'https://notion.so/item-1',
        created_time: '2023-12-10T15:30:00.000Z',
        last_edited_time: '2023-12-10T15:30:00.000Z',
        properties: {
          Name: {
            type: 'title',
            title: [{ plain_text: 'Test Item' }],
          },
        },
      };

      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      redisService.getValue.mockResolvedValue(null);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { results: [mockItem] },
      } as any);

      const result = await service.hasNewDatabaseItem(userId, { databaseId });
      expect(result.code).toBe(1);
      expect(redisService.setValue).toHaveBeenCalledWith(
        `notion:last_item_created_time:${userId}:${databaseId}`,
        '2023-12-10T15:30:00.000Z'
      );
    });

    it('should return 0 for new item with data', async () => {
      const mockItem = {
        id: 'item-2',
        url: 'https://notion.so/item-2',
        created_time: '2023-12-10T16:00:00.000Z',
        last_edited_time: '2023-12-10T16:00:00.000Z',
        properties: {
          Name: {
            type: 'title',
            title: [{ plain_text: 'New Item' }],
          },
          Status: {
            type: 'select',
            select: { name: 'In Progress' },
          },
        },
      };

      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      redisService.getValue.mockResolvedValue('2023-12-10T15:30:00.000Z');
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { results: [mockItem] },
      } as any);

      const result = await service.hasNewDatabaseItem(userId, { databaseId });
      expect(result.code).toBe(0);
      expect(result.data).toBeDefined();
      expect(result.data?.NOTION_ITEM_ID).toBe('item-2');
      expect(result.data?.NOTION_PROP_NAME).toBe('New Item');
      expect(result.data?.NOTION_PROP_STATUS).toBe('In Progress');
    });

    it('should return 1 if no new item (same created_time)', async () => {
      const mockItem = {
        id: 'item-1',
        url: 'https://notion.so/item-1',
        created_time: '2023-12-10T15:30:00.000Z',
        last_edited_time: '2023-12-10T15:30:00.000Z',
        properties: {},
      };

      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      redisService.getValue.mockResolvedValue('2023-12-10T15:30:00.000Z');
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { results: [mockItem] },
      } as any);

      const result = await service.hasNewDatabaseItem(userId, { databaseId });
      expect(result.code).toBe(1);
    });

    it('should return 1 when an item is deleted (older created_time)', async () => {
      // Simulates: item-3 (newest) was cached, then deleted
      // Now item-2 (older) is the most recent, should NOT trigger
      const olderItem = {
        id: 'item-2',
        url: 'https://notion.so/item-2',
        created_time: '2023-12-10T15:00:00.000Z',
        last_edited_time: '2023-12-10T15:00:00.000Z',
        properties: {},
      };

      usersService.findLinkedAccount.mockResolvedValue({ provider: 'notion' } as any);
      redisService.getValue.mockResolvedValue('2023-12-10T16:00:00.000Z'); // Newer timestamp in cache
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { results: [olderItem] },
      } as any);

      const result = await service.hasNewDatabaseItem(userId, { databaseId });
      expect(result.code).toBe(1); // Should NOT trigger on deletion
      // Cache should NOT be updated when item is older
      expect(redisService.setValue).not.toHaveBeenCalled();
    });
  });

  describe('getPlaceholders', () => {
    it('should return list of available placeholders', () => {
      const placeholders = service.getPlaceholders();
      expect(placeholders).toBeInstanceOf(Array);
      expect(placeholders.length).toBeGreaterThan(0);
      expect(placeholders.some(p => p.key === 'NOTION_ITEM_ID')).toBe(true);
      expect(placeholders.some(p => p.key === 'NOTION_PROP_*')).toBe(true);
    });
  });
});

