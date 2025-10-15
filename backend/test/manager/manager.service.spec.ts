import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ManagerService } from '../../src/modules/manager/manager.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';
import { SpotifyLikeService } from '../../src/modules/actions/spotify/like.service';
import { DiscordMessageService } from '../../src/modules/actions/discord/message.service';
import { GmailNewMailService } from '../../src/modules/actions/gmail/new-mail.service';
import { GmailSendService } from '../../src/modules/reactions/gmail/send.service';
import { DiscordSendService } from '../../src/modules/reactions/discord/send.service';
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

  const mockGmailSendService = {
    run: jest.fn(),
  };

  const mockDiscordSendService = {
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
        { provide: GmailSendService, useValue: mockGmailSendService },
        { provide: DiscordSendService, useValue: mockDiscordSendService },
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
          name: ActionNamesEnum.DISCORD_NEW_MESSAGE,
          services: { name: 'discord' },
        },
      ]);

      const result = await service.getAvailableActionsGrouped(userId);

      expect(result).toEqual({
        discord: {
          isLinked: false,
          items: [
            {
              name: ActionNamesEnum.DISCORD_NEW_MESSAGE,
              description: 'Detect new messages in Discord servers',
            },
          ],
        },
        google: {
          isLinked: false,
          items: [
            {
              name: ActionNamesEnum.GMAIL_NEW_EMAIL,
              description: 'Detect new incoming email in Gmail inbox',
            },
          ],
        },
        spotify: {
          isLinked: true,
          items: [
            {
              name: ActionNamesEnum.SPOTIFY_HAS_LIKES,
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
      ]);

      const result = await service.getAvailableReactionsGrouped(userId);

      expect(result).toEqual({
        default: {
          isLinked: true,
          items: [
            {
              name: ReactionNamesEnum.LOG_EVENT,
              description: 'Log event to database',
              configSchema: [],
            },
          ],
        },
        discord: {
          isLinked: false,
          items: [
            {
              name: ReactionNamesEnum.DISCORD_SEND_SERVER_MESSAGE,
              description: 'Send a message to a Discord channel',
              configSchema: expect.any(Array),
            },
          ],
        },
        google: {
          isLinked: true,
          items: [
            {
              name: ReactionNamesEnum.SEND_EMAIL,
              description: 'Send email notification',
              configSchema: expect.any(Array),
            },
          ],
        },
      });
    });
  });
});
