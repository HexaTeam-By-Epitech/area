import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ManagerService } from '../../src/modules/manager/manager.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';
import { SpotifyLikeService } from '../../src/modules/actions/spotify/like.service';
import { DiscordMessageService } from '../../src/modules/actions/discord/message.service';
import { GmailNewMailService } from '../../src/modules/actions/gmail/new-mail.service';
import { NotionDatabaseItemService } from '../../src/modules/actions/notion/database-item.service';
import { GmailSendService } from '../../src/modules/reactions/gmail/send.service';
import { DiscordSendService } from '../../src/modules/reactions/discord/send.service';
import { SpotifyLikeReactionService } from '../../src/modules/reactions/spotify/like.service';
import { ActionPollingService } from '../../src/modules/manager/polling/action-polling.service';
import { PlaceholderReplacementService } from '../../src/common/services/placeholder-replacement.service';
import { ActionNamesEnum, ReactionNamesEnum } from '../../src/common/interfaces/action-names.enum';

describe('ManagerService', () => {
  let service: ManagerService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    users: { findUnique: jest.fn() },
    actions: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    reactions: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    services: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    areas: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]), // Return empty array by default
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    oauth_providers: {
      findFirst: jest.fn(),
    },
    linked_accounts: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    event_logs: {
      create: jest.fn(),
    },
  };

  const mockRedisService = {
    getValue: jest.fn(),
    setValue: jest.fn(),
    deleteVerificationCode: jest.fn(),
  };

  const mockSpotifyLikeService = {
    supports: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    hasNewSpotifyLike: jest.fn(),
    getPlaceholders: jest.fn(),
  };

  const mockGmailNewMailService = {
    supports: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    hasNewGmailEmail: jest.fn(),
    getPlaceholders: jest.fn(),
  };

  const mockNotionDatabaseItemService = {
    supports: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    hasNewDatabaseItem: jest.fn(),
    getPlaceholders: jest.fn(),
  };

  const mockGmailSendService = {
    run: jest.fn(),
  };

  const mockDiscordSendService = {
    run: jest.fn(),
  };

  const mockSpotifyLikeReactionService = {
    run: jest.fn(),
  };

  const mockDiscordMessageService = {
    supports: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    hasNewDiscordMessage: jest.fn(),
    getPlaceholders: jest.fn(),
  };

  const mockActionPollingService = {
    register: jest.fn(),
    supports: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    getPlaceholders: jest.fn(),
  };

  const mockPlaceholderService = {
    replaceInConfig: jest.fn((config) => config),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: SpotifyLikeService, useValue: mockSpotifyLikeService },
        { provide: DiscordMessageService, useValue: mockDiscordMessageService },
        { provide: GmailNewMailService, useValue: mockGmailNewMailService },
        { provide: NotionDatabaseItemService, useValue: mockNotionDatabaseItemService },
        { provide: GmailSendService, useValue: mockGmailSendService },
        { provide: DiscordSendService, useValue: mockDiscordSendService },
        { provide: SpotifyLikeReactionService, useValue: mockSpotifyLikeReactionService },
        { provide: ActionPollingService, useValue: mockActionPollingService },
        { provide: PlaceholderReplacementService, useValue: mockPlaceholderService },
      ],
    }).compile();

    service = module.get<ManagerService>(ManagerService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Initialize the service
    await service.onModuleInit();
  });

  describe('Provider validation', () => {
    it('should throw BadRequestException when user has not linked required provider for action', async () => {
      const userId = 'user-123';
      const actionName = ActionNamesEnum.SPOTIFY_HAS_LIKES;
      const reactionName = ReactionNamesEnum.LOG_EVENT;

      // Mock: Spotify provider exists
      mockPrismaService.oauth_providers.findFirst.mockResolvedValue({
        id: 1,
        name: 'spotify',
      });

      // Mock: User has NOT linked Spotify
      mockPrismaService.linked_accounts.findFirst.mockResolvedValue(null);

      // Mock: User exists
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });

      await expect(
        service.bindAction(userId, actionName, reactionName, {}),
      ).rejects.toThrow('You must link your spotify account before using this action or reaction');
    });

    it('should throw BadRequestException when user has not linked required provider for reaction', async () => {
      const userId = 'user-123';
      const actionName = ActionNamesEnum.SPOTIFY_HAS_LIKES;
      const reactionName = ReactionNamesEnum.SEND_EMAIL;
      const validConfig = {
        to: 'recipient@example.com',
        subject: 'Test subject',
        body: 'Test body',
      };

      // Mock: Providers exist
      // First call for spotify, second call for google
      mockPrismaService.oauth_providers.findFirst
        .mockResolvedValueOnce({ id: 1, name: 'spotify' }) // For spotify action
        .mockResolvedValueOnce({ id: 2, name: 'google' });  // For google reaction

      // Mock: User has linked Spotify but NOT Google
      // First call for spotify (linked), second call for google (not linked)
      mockPrismaService.linked_accounts.findFirst
        .mockResolvedValueOnce({
          id: 'linked-1',
          user_id: userId,
          provider_id: 1,
          is_active: true,
          deleted_at: null,
        })
        .mockResolvedValueOnce(null); // Google not linked

      // Mock: User exists
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });

      await expect(
        service.bindAction(userId, actionName, reactionName, {}, validConfig),
      ).rejects.toThrow('You must link your google account before using this action or reaction');
    });

    it('should allow binding when user has linked all required providers', async () => {
      const userId = 'user-123';
      const actionName = ActionNamesEnum.SPOTIFY_HAS_LIKES;
      const reactionName = ReactionNamesEnum.LOG_EVENT;

      // Mock: Spotify provider exists and is linked
      mockPrismaService.oauth_providers.findFirst.mockResolvedValue({
        id: 1,
        name: 'spotify',
      });

      mockPrismaService.linked_accounts.findFirst.mockResolvedValue({
        id: 'linked-1',
        user_id: userId,
        provider_id: 1,
        is_active: true,
        deleted_at: null,
      });

      // Mock: User exists
      mockPrismaService.users.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });

      // Mock: Service exists
      mockPrismaService.services.findFirst.mockResolvedValue({
        id: 'service-1',
        name: 'default',
        is_active: true,
      });

      // Mock: Action exists
      mockPrismaService.actions.findFirst.mockResolvedValue({
        id: 'action-1',
        service_id: 'service-1',
        name: actionName,
        is_active: true,
      });

      // Mock: Reaction exists
      mockPrismaService.reactions.findFirst.mockResolvedValue({
        id: 'reaction-1',
        service_id: 'service-1',
        name: reactionName,
        is_active: true,
      });

      // Mock: Area creation
      mockPrismaService.areas.create.mockResolvedValue({
        id: 'area-123',
        user_id: userId,
        action_id: 'action-1',
        reaction_id: 'reaction-1',
        is_active: true,
      });

      mockRedisService.setValue.mockResolvedValue(undefined);
      mockActionPollingService.supports.mockReturnValue(true);
      mockActionPollingService.start.mockReturnValue(undefined);

      const areaId = await service.bindAction(userId, actionName, reactionName, {});

      expect(areaId).toBe('area-123');
    });
  });

  describe('getAvailableActionsGrouped', () => {
    it('should return actions grouped by provider with link status', async () => {
      const userId = 'user-123';

      // Mock: User has linked Spotify but not Google or Discord
      mockPrismaService.linked_accounts.findMany.mockResolvedValue([
        {
          oauth_providers: { name: 'spotify' },
        },
      ]);

      // Mock: Actions from database
      mockPrismaService.actions.findMany.mockResolvedValue([
        {
          name: ActionNamesEnum.SPOTIFY_HAS_LIKES,
          services: { name: 'spotify' },
        },
        {
          name: ActionNamesEnum.GMAIL_NEW_EMAIL,
          services: { name: 'google' },
        },
        {
          name: ActionNamesEnum.DISCORD_NEW_SERVER_MESSAGE,
          services: { name: 'discord' },
        },
        {
          name: ActionNamesEnum.NOTION_NEW_DATABASE_ITEM,
          services: { name: 'notion' },
        },
      ]);

      const result = await service.getAvailableActionsGrouped(userId);

      expect(result).toEqual({
        discord: {
          isLinked: false,
          items: [
            {
              name: ActionNamesEnum.DISCORD_NEW_SERVER_MESSAGE,
              displayName: 'New Discord Message',
              description: 'Detect new messages in Discord servers',
            },
          ],
        },
        google: {
          isLinked: false,
          items: [
            {
              name: ActionNamesEnum.GMAIL_NEW_EMAIL,
              displayName: 'New Email Received',
              description: 'Detect new incoming email in Gmail inbox',
            },
          ],
        },
        notion: {
          isLinked: false,
          items: [
            {
              name: ActionNamesEnum.NOTION_NEW_DATABASE_ITEM,
              displayName: 'New Notion Page',
              description: 'Detect new items added to a Notion database',
            },
          ],
        },
        spotify: {
          isLinked: true,
          items: [
            {
              name: ActionNamesEnum.SPOTIFY_HAS_LIKES,
              displayName: 'New Liked Song',
              description: 'Check if user has liked songs on Spotify',
            },
          ],
        },
      });
    });

    it('should mark default provider as always linked', async () => {
      const userId = 'user-123';

      mockPrismaService.linked_accounts.findMany.mockResolvedValue([]);
      mockPrismaService.actions.findMany.mockResolvedValue([]);

      const result = await service.getAvailableActionsGrouped(userId);

      // Default provider should be linked even if no linked accounts
      expect(result).toBeDefined();
    });
  });

  describe('getAvailableReactionsGrouped', () => {
    it('should return reactions grouped by provider with link status', async () => {
      const userId = 'user-123';

      // Mock: User has linked Google but not Discord
      mockPrismaService.linked_accounts.findMany.mockResolvedValue([
        {
          oauth_providers: { name: 'google' },
        },
      ]);

      // Mock: Reactions from database
      mockPrismaService.reactions.findMany.mockResolvedValue([
        {
          name: ReactionNamesEnum.SEND_EMAIL,
          services: { name: 'google' },
        },
        {
          name: ReactionNamesEnum.LOG_EVENT,
          services: { name: 'default' },
        },
        {
          name: ReactionNamesEnum.DISCORD_SEND_SERVER_MESSAGE,
          services: { name: 'discord' },
        },
        {
          name: ReactionNamesEnum.SPOTIFY_LIKE_TRACK,
          services: { name: 'spotify' },
        },
      ]);

      const result = await service.getAvailableReactionsGrouped(userId);

      expect(result).toEqual({
        default: {
          isLinked: true,
          items: [
            {
              name: ReactionNamesEnum.LOG_EVENT,
              displayName: 'Log to Console',
              description: 'Log event to database',
            },
          ],
        },
        discord: {
          isLinked: false,
          items: [
            {
              name: ReactionNamesEnum.DISCORD_SEND_SERVER_MESSAGE,
              displayName: 'Send Discord Message',
              description: 'Send a message to a Discord channel',
            },
          ],
        },
        google: {
          isLinked: true,
          items: [
            {
              name: ReactionNamesEnum.SEND_EMAIL,
              displayName: 'Send Email',
              description: 'Send email notification',
            },
          ],
        },
        spotify: {
          isLinked: false,
          items: [
            {
              name: ReactionNamesEnum.SPOTIFY_LIKE_TRACK,
              displayName: 'Like Spotify Track',
              description: 'Like (save) a track to your Spotify library',
            },
          ],
        },
      });
    });
  });

  describe('getReactionConfigSchema', () => {
    it('should return config schema for a reaction', () => {
      const schema = service.getReactionConfigSchema(ReactionNamesEnum.SEND_EMAIL);
      
      expect(schema).toEqual([
        {
          name: 'to',
          type: 'email',
          required: true,
          label: 'Recipient email',
          placeholder: 'recipient@example.com'
        },
        {
          name: 'subject',
          type: 'string',
          required: true,
          label: 'Email subject',
          placeholder: 'Notification from AREA'
        },
        {
          name: 'body',
          type: 'string',
          required: true,
          label: 'Email body',
          placeholder: 'Your message here...'
        }
      ]);
    });

    it('should throw NotFoundException for unknown reaction', () => {
      expect(() => {
        service.getReactionConfigSchema('unknown_reaction');
      }).toThrow('Reaction \'unknown_reaction\' not found');
    });

    it('should return empty array for reactions without config schema', () => {
      const schema = service.getReactionConfigSchema(ReactionNamesEnum.LOG_EVENT);
      expect(schema).toEqual([]);
    });
  });

  describe('getActionConfigSchema', () => {
    it('should return config schema for an action with config', () => {
      const schema = service.getActionConfigSchema(ActionNamesEnum.DISCORD_NEW_SERVER_MESSAGE);
      
      expect(schema).toEqual([
        {
          name: 'channelId',
          type: 'string',
          required: true,
          label: 'Discord Channel ID',
          placeholder: '123456789012345678'
        }
      ]);
    });

    it('should return config schema for Notion action', () => {
      const schema = service.getActionConfigSchema(ActionNamesEnum.NOTION_NEW_DATABASE_ITEM);
      
      expect(schema).toEqual([
        {
          name: 'databaseId',
          type: 'string',
          required: true,
          label: 'Notion Database ID',
          placeholder: '123e4567e89b12d3a456426614174000'
        }
      ]);
    });

    it('should throw NotFoundException for unknown action', () => {
      expect(() => {
        service.getActionConfigSchema('unknown_action');
      }).toThrow('Action \'unknown_action\' not found');
    });

    it('should return empty array for actions without config schema', () => {
      const schema = service.getActionConfigSchema(ActionNamesEnum.SPOTIFY_HAS_LIKES);
      expect(schema).toEqual([]);
    });
  });
});
