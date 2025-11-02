import { Test, TestingModule } from '@nestjs/testing';
import { SlackSendService } from '../../../src/modules/reactions/slack/send.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { ProviderKeyEnum } from '../../../src/common/interfaces/oauth2.type';

describe('SlackSendService', () => {
  let service: SlackSendService;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackSendService,
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
    }).compile();

    service = module.get<SlackSendService>(SlackSendService);
    authService = module.get(AuthService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('run', () => {
    const userId = 'test-user-id';
    const actionResult = 0;
    const validConfig = {
      channelId: 'C1234567890',
      message: 'Test message',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should send message successfully', async () => {
      usersService.findLinkedAccount.mockResolvedValue({} as any);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { ok: true, ts: '1640995200.123456', channel: 'C1234567890' }
      });

      const result = await service.run(userId, actionResult, validConfig);

      expect(result.success).toBe(true);
      expect(result.messageTs).toBe('1640995200.123456');
      expect(usersService.findLinkedAccount).toHaveBeenCalledWith(userId, ProviderKeyEnum.Slack);
      expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
        ProviderKeyEnum.Slack,
        userId,
        expect.objectContaining({
          method: 'POST',
          url: 'https://slack.com/api/chat.postMessage',
          data: {
            channel: validConfig.channelId,
            text: validConfig.message,
          },
        })
      );
    });

    it('should send message with custom username and icon', async () => {
      const configWithCustomization = {
        ...validConfig,
        username: 'Custom Bot',
        iconEmoji: ':robot_face:',
      };

      usersService.findLinkedAccount.mockResolvedValue({} as any);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { ok: true, ts: '1640995200.123456' }
      });

      const result = await service.run(userId, actionResult, configWithCustomization);

      expect(result.success).toBe(true);
      expect(authService.oAuth2ApiRequest).toHaveBeenCalledWith(
        ProviderKeyEnum.Slack,
        userId,
        expect.objectContaining({
          data: {
            channel: configWithCustomization.channelId,
            text: configWithCustomization.message,
            username: configWithCustomization.username,
            icon_emoji: configWithCustomization.iconEmoji,
          },
        })
      );
    });

    it('should return error when channelId is missing', async () => {
      const invalidConfig = { message: 'Test message' };

      const result = await service.run(userId, actionResult, invalidConfig as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required configuration');
      expect(usersService.findLinkedAccount).not.toHaveBeenCalled();
    });

    it('should return error when message is missing', async () => {
      const invalidConfig = { channelId: 'C1234567890' };

      const result = await service.run(userId, actionResult, invalidConfig as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required configuration');
      expect(usersService.findLinkedAccount).not.toHaveBeenCalled();
    });

    it('should return error when Slack account is not linked', async () => {
      usersService.findLinkedAccount.mockResolvedValue(null);

      const result = await service.run(userId, actionResult, validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack account not linked');
      expect(authService.oAuth2ApiRequest).not.toHaveBeenCalled();
    });

    it('should return error when Slack API returns error', async () => {
      usersService.findLinkedAccount.mockResolvedValue({} as any);
      authService.oAuth2ApiRequest.mockResolvedValue({
        status: 200,
        data: { ok: false, error: 'channel_not_found' }
      });

      const result = await service.run(userId, actionResult, validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack API error: channel_not_found');
    });

    it('should handle API request exceptions', async () => {
      usersService.findLinkedAccount.mockResolvedValue({} as any);
      authService.oAuth2ApiRequest.mockRejectedValue(new Error('Network error'));

      const result = await service.run(userId, actionResult, validConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send Slack message: Network error');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        channelId: 'C1234567890',
        message: 'Test message',
        username: 'Bot',
        iconEmoji: ':robot_face:',
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing channelId', () => {
      const config = { message: 'Test message' };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('channelId is required');
    });

    it('should reject invalid channelId format', () => {
      const config = {
        channelId: 'invalid-channel',
        message: 'Test message',
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('channelId must be a valid Slack channel ID (e.g., C1234567890)');
    });

    it('should reject missing message', () => {
      const config = { channelId: 'C1234567890' };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('message is required');
    });

    it('should reject message that is too long', () => {
      const config = {
        channelId: 'C1234567890',
        message: 'x'.repeat(40001), // Too long
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('message must be less than 40,000 characters');
    });

    it('should reject non-string username', () => {
      const config = {
        channelId: 'C1234567890',
        message: 'Test message',
        username: 123,
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('username must be a string');
    });

    it('should reject non-string iconEmoji', () => {
      const config = {
        channelId: 'C1234567890',
        message: 'Test message',
        iconEmoji: 123,
      };

      const result = service.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('iconEmoji must be a string');
    });

    it('should validate different channel ID formats', () => {
      const validChannelIds = ['C1234567890', 'G1234567890', 'D1234567890']; // Channel, Group, Direct
      const invalidChannelIds = ['general', '1234567890', 'invalid', ''];

      validChannelIds.forEach(channelId => {
        const config = { channelId, message: 'Test' };
        const result = service.validateConfig(config);
        expect(result.valid).toBe(true);
      });

      invalidChannelIds.forEach(channelId => {
        const config = { channelId, message: 'Test' };
        const result = service.validateConfig(config);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('getConfigSchema', () => {
    it('should return correct configuration schema', () => {
      const schema = service.getConfigSchema();

      expect(schema).toHaveLength(4);
      expect(schema[0].name).toBe('channelId');
      expect(schema[0].required).toBe(true);
      expect(schema[1].name).toBe('message');
      expect(schema[1].required).toBe(true);
      expect(schema[2].name).toBe('username');
      expect(schema[2].required).toBe(false);
      expect(schema[3].name).toBe('iconEmoji');
      expect(schema[3].required).toBe(false);
    });
  });
});
