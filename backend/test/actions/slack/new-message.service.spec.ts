import { Test, TestingModule } from '@nestjs/testing';
import { SlackNewMessageService } from '../../../src/modules/actions/slack/new-message.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ActionNamesEnum } from '../../../src/common/interfaces/action-names.enum';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

describe('SlackNewMessageService', () => {
  let service: SlackNewMessageService;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackNewMessageService,
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

    service = module.get<SlackNewMessageService>(SlackNewMessageService);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('supports', () => {
    it('should return true for SLACK_NEW_MESSAGE action', () => {
      expect(service.supports(ActionNamesEnum.SLACK_NEW_MESSAGE)).toBe(true);
    });

    it('should return false for other actions', () => {
      expect(service.supports('other_action')).toBe(false);
    });
  });

  describe('hasNewSlackMessage', () => {
    const userId = 'test-user-id';
    const channelId = 'C1234567890';
    const config = { channelId };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return -1 when Slack provider is not linked', async () => {
      usersService.findLinkedAccount.mockResolvedValue(null);

      const result = await service.hasNewSlackMessage(userId, config);

      expect(result.code).toBe(-1);
      expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Slack);
    });

    it('should return 1 when no messages are found in channel', async () => {
      usersService.findLinkedAccount.mockResolvedValue({} as any);
      redisService.getValue.mockResolvedValue(null);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { messages: [], ok: true }
      });

      const result = await service.hasNewSlackMessage(userId, config);

      expect(result.code).toBe(1);
      expect(redisService.setValue).toHaveBeenCalledWith(
        `slack:last_message_ts:${userId}:${channelId}`,
        ''
      );
    });

    it('should return 1 when first time seeing a message (baseline)', async () => {
      const mockMessage = {
        ts: '1640995200.123456',
        user: 'U1234567890',
        text: 'Hello world',
        type: 'message'
      };

      usersService.findLinkedAccount.mockResolvedValue({} as any);
      redisService.getValue.mockResolvedValue(null); // No cached timestamp
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { messages: [mockMessage], ok: true }
      });

      const result = await service.hasNewSlackMessage(userId, config);

      expect(result.code).toBe(1);
      expect(redisService.setValue).toHaveBeenCalledWith(
        `slack:last_message_ts:${userId}:${channelId}`,
        mockMessage.ts
      );
    });

    it('should return 0 when a newer message is detected', async () => {
      const oldTimestamp = '1640995200.123456';
      const newTimestamp = '1640995260.789012';
      const mockMessage = {
        ts: newTimestamp,
        user: 'U1234567890',
        text: 'New message',
        type: 'message'
      };

      usersService.findLinkedAccount.mockResolvedValue({} as any);
      redisService.getValue.mockResolvedValue(oldTimestamp); // Cached older timestamp
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { messages: [mockMessage], ok: true }
      });

      const result = await service.hasNewSlackMessage(userId, config);

      expect(result.code).toBe(0);
      expect(result.data).toEqual({
        message_text: 'New message',
        message_user: 'U1234567890',
        message_timestamp: newTimestamp,
        channel_id: channelId,
      });
      expect(redisService.setValue).toHaveBeenCalledWith(
        `slack:last_message_ts:${userId}:${channelId}`,
        newTimestamp
      );
    });

    it('should return 1 when no newer message is detected', async () => {
      const sameTimestamp = '1640995200.123456';
      const mockMessage = {
        ts: sameTimestamp,
        user: 'U1234567890',
        text: 'Same message',
        type: 'message'
      };

      usersService.findLinkedAccount.mockResolvedValue({} as any);
      redisService.getValue.mockResolvedValue(sameTimestamp); // Same cached timestamp
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { messages: [mockMessage], ok: true }
      });

      const result = await service.hasNewSlackMessage(userId, config);

      expect(result.code).toBe(1);
    });

    it('should return 1 when API request fails', async () => {
      usersService.findLinkedAccount.mockResolvedValue({} as any);
      redisService.getValue.mockResolvedValue(null);
      authService.oAuth2ApiRequest.mockRejectedValue(new Error('API Error'));

      const result = await service.hasNewSlackMessage(userId, config);

      expect(result.code).toBe(1);
    });

    it('should handle empty channel baseline trigger', async () => {
      const mockMessage = {
        ts: '1640995200.123456',
        user: 'U1234567890',
        text: 'First message after empty',
        type: 'message'
      };

      usersService.findLinkedAccount.mockResolvedValue({} as any);
      redisService.getValue.mockResolvedValue(''); // Empty baseline
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { messages: [mockMessage], ok: true }
      });

      const result = await service.hasNewSlackMessage(userId, config);

      expect(result.code).toBe(0);
      expect(result.data).toEqual({
        message_text: 'First message after empty',
        message_user: 'U1234567890',
        message_timestamp: mockMessage.ts,
        channel_id: channelId,
      });
    });

    it('should use default channel when no channelId provided', async () => {
      usersService.findLinkedAccount.mockResolvedValue({} as any);
      redisService.getValue.mockResolvedValue(null);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { messages: [], ok: true }
      });

      await service.hasNewSlackMessage(userId); // No config

      expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
        ProviderKeyEnum.Slack,
        userId,
        expect.objectContaining({
          params: expect.objectContaining({
            channel: 'general'
          })
        })
      );
    });
  });
});
