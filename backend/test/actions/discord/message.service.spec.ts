import { Test, TestingModule } from '@nestjs/testing';
import { DiscordMessageService } from '../../../src/modules/actions/discord/message.service';
import { UsersService } from '../../../src/modules/users/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ActionNamesEnum } from '../../../src/common/interfaces/action-names.enum';

describe('DiscordMessageService', () => {
  let service: DiscordMessageService;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockUsers = {
      findLinkedAccount: jest.fn(),
    };

    const mockAuth = {
      oAuth2ApiRequest: jest.fn(),
    };

    const mockRedis = {
      getValue: jest.fn(),
      setValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordMessageService,
        { provide: UsersService, useValue: mockUsers },
        { provide: AuthService, useValue: mockAuth },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<DiscordMessageService>(DiscordMessageService);
    mockUsersService = module.get(UsersService);
    mockAuthService = module.get(AuthService);
    mockRedisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should support DISCORD_NEW_MESSAGE action', () => {
    expect(service.supports(ActionNamesEnum.DISCORD_NEW_MESSAGE)).toBe(true);
    expect(service.supports('other_action')).toBe(false);
  });

  it('should return code -1 when Discord account not linked', async () => {
    mockUsersService.findLinkedAccount.mockResolvedValue(null);

    const result = await service.hasNewDiscordMessage('user123');

    expect(result.code).toBe(-1);
    expect(mockUsersService.findLinkedAccount).toHaveBeenCalledWith('user123', 'discord');
  });

  it('should return code 1 when no guilds found', async () => {
    mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'linked123' });
    mockAuthService.oAuth2ApiRequest.mockResolvedValue({ data: [] });

    const result = await service.hasNewDiscordMessage('user123');

    expect(result.code).toBe(1);
    expect(mockRedisService.setValue).toHaveBeenCalledWith('discord:last_message_at:user123', '');
  });

  it('should initialize baseline on first message', async () => {
    const mockGuilds = [{ id: 'guild1', name: 'Test Guild' }];
    const mockChannels = [{ id: 'channel1', name: 'general', type: 0 }];
    const mockMessages = [{
      id: 'msg1',
      content: 'Hello world!',
      timestamp: '2023-12-10T15:30:00.000Z',
      author: { username: 'testuser', discriminator: '1234', id: 'user456' },
      channel_id: 'channel1'
    }];

    mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'linked123' });
    mockAuthService.oAuth2ApiRequest
      .mockResolvedValueOnce({ data: mockGuilds })
      .mockResolvedValueOnce({ data: mockChannels })
      .mockResolvedValueOnce({ data: mockMessages });
    mockRedisService.getValue.mockResolvedValue(null);

    const result = await service.hasNewDiscordMessage('user123');

    expect(result.code).toBe(1);
    expect(mockRedisService.setValue).toHaveBeenCalledWith(
      'discord:last_message_at:user123',
      '2023-12-10T15:30:00.000Z'
    );
  });

  it('should detect new message and return code 0 with data', async () => {
    const mockGuilds = [{ id: 'guild1', name: 'Test Guild' }];
    const mockChannels = [{ id: 'channel1', name: 'general', type: 0 }];
    const mockMessages = [{
      id: 'msg2',
      content: 'New message!',
      timestamp: '2023-12-10T16:00:00.000Z',
      author: { username: 'newuser', discriminator: '5678', id: 'user789' },
      channel_id: 'channel1'
    }];

    mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'linked123' });
    mockAuthService.oAuth2ApiRequest
      .mockResolvedValueOnce({ data: mockGuilds })
      .mockResolvedValueOnce({ data: mockChannels })
      .mockResolvedValueOnce({ data: mockMessages });
    mockRedisService.getValue.mockResolvedValue('2023-12-10T15:30:00.000Z');

    const result = await service.hasNewDiscordMessage('user123');

    expect(result.code).toBe(0);
    expect(result.data).toEqual({
      DISCORD_MESSAGE_ID: 'msg2',
      DISCORD_MESSAGE_CONTENT: 'New message!',
      DISCORD_MESSAGE_AUTHOR_USERNAME: 'newuser',
      DISCORD_MESSAGE_AUTHOR_DISCRIMINATOR: '5678',
      DISCORD_MESSAGE_AUTHOR_ID: 'user789',
      DISCORD_MESSAGE_TIMESTAMP: '2023-12-10T16:00:00.000Z',
      DISCORD_MESSAGE_GUILD_NAME: 'Test Guild',
      DISCORD_MESSAGE_CHANNEL_NAME: 'general',
      DISCORD_MESSAGE_CHANNEL_ID: 'channel1',
      DISCORD_MESSAGE_TYPE: '0',
      DISCORD_MESSAGE_EDITED_TIMESTAMP: '',
      DISCORD_MESSAGE_MENTION_EVERYONE: 'false',
      DISCORD_MESSAGE_ATTACHMENTS_COUNT: '0',
      DISCORD_MESSAGE_EMBEDS_COUNT: '0',
    });
  });

  it('should return code 1 when no new messages', async () => {
    const mockGuilds = [{ id: 'guild1', name: 'Test Guild' }];
    const mockChannels = [{ id: 'channel1', name: 'general', type: 0 }];
    const mockMessages = [{
      id: 'msg1',
      content: 'Old message',
      timestamp: '2023-12-10T15:30:00.000Z',
      author: { username: 'testuser', discriminator: '1234', id: 'user456' },
      channel_id: 'channel1'
    }];

    mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'linked123' });
    mockAuthService.oAuth2ApiRequest
      .mockResolvedValueOnce({ data: mockGuilds })
      .mockResolvedValueOnce({ data: mockChannels })
      .mockResolvedValueOnce({ data: mockMessages });
    mockRedisService.getValue.mockResolvedValue('2023-12-10T16:00:00.000Z');

    const result = await service.hasNewDiscordMessage('user123');

    expect(result.code).toBe(1);
  });

  it('should handle API errors gracefully', async () => {
    mockUsersService.findLinkedAccount.mockResolvedValue({ id: 'linked123' });
    mockAuthService.oAuth2ApiRequest.mockRejectedValue(new Error('Discord API Error'));

    const result = await service.hasNewDiscordMessage('user123');

    expect(result.code).toBe(1);
  });

  it('should return correct placeholders', () => {
    const placeholders = service.getPlaceholders();

    expect(placeholders).toHaveLength(14);
    expect(placeholders[0]).toEqual({
      key: 'DISCORD_MESSAGE_ID',
      description: 'The unique ID of the message',
      example: '1234567890123456789',
    });
    expect(placeholders[1]).toEqual({
      key: 'DISCORD_MESSAGE_CONTENT',
      description: 'The content/text of the message',
      example: 'Hello everyone!',
    });
  });

  it('should start and stop polling correctly', () => {
    const mockCallback = jest.fn();
    const userId = 'user123';

    // Start polling
    service.start(userId, mockCallback);
    expect(service['pollIntervals'].has(userId)).toBe(true);

    // Stop polling
    service.stop(userId);
    expect(service['pollIntervals'].has(userId)).toBe(false);
  });
});
