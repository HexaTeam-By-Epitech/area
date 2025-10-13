import { Test, TestingModule } from '@nestjs/testing';
import { DiscordMessageService } from '../../../src/modules/actions/discord/message.service';
import { DiscordBotService } from '../../../src/modules/discord-bot/discord-bot.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { ActionNamesEnum } from '../../../src/common/interfaces/action-names.enum';

describe('DiscordMessageService', () => {
  let service: DiscordMessageService;
  let mockDiscordBotService: jest.Mocked<DiscordBotService>;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockDiscordBot = {
      isReady: jest.fn(),
      getClient: jest.fn(),
    };

    const mockRedis = {
      getValue: jest.fn(),
      setValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordMessageService,
        { provide: DiscordBotService, useValue: mockDiscordBot },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<DiscordMessageService>(DiscordMessageService);
    mockDiscordBotService = module.get(DiscordBotService);
    mockRedisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should support DISCORD_NEW_MESSAGE action', () => {
    expect(service.supports(ActionNamesEnum.DISCORD_NEW_MESSAGE)).toBe(true);
    expect(service.supports('other_action')).toBe(false);
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

  it('should start listening for Discord messages', () => {
    const mockCallback = jest.fn();
    const userId = 'user123';
    const config = { channelId: 'channel123' };
    const mockClient = {
      on: jest.fn(),
    } as any;

    mockDiscordBotService.getClient.mockReturnValue(mockClient);

    service.start(userId, mockCallback, config);

    // Verify the client was fetched
    expect(mockDiscordBotService.getClient).toHaveBeenCalled();
  });

  it('should stop listening for Discord messages', () => {
    const userId = 'user123';

    service.stop(userId);

    // The service should clean up all listeners for this user
    expect(service['activeListeners'].size).toBe(0);
  });

  it('should handle when Discord bot client is not available', () => {
    const mockCallback = jest.fn();
    const userId = 'user123';
    const config = { channelId: 'channel123' };

    mockDiscordBotService.getClient.mockReturnValue(null);

    service.start(userId, mockCallback, config);

    // Bot not available, but should not throw
    expect(mockDiscordBotService.getClient).toHaveBeenCalled();
  });
});
