import { Test, TestingModule } from '@nestjs/testing';
import { DiscordSendService, DiscordSendConfig } from '../../../src/modules/reactions/discord/send.service';
import { DiscordBotService } from '../../../src/modules/discord-bot/discord-bot.service';
import { Logger } from '@nestjs/common';

// Mock fetch globalement
global.fetch = jest.fn();

describe('DiscordSendService', () => {
  let service: DiscordSendService;
  let discordBotService: DiscordBotService;

  const mockDiscordBotService = {
    isReady: jest.fn(),
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordSendService,
        {
          provide: DiscordBotService,
          useValue: mockDiscordBotService,
        },
      ],
    }).compile();

    service = module.get<DiscordSendService>(DiscordSendService);
    discordBotService = module.get<DiscordBotService>(DiscordBotService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should successfully send a Discord message', async () => {
    const userId = 'test-user-id';
    const config: DiscordSendConfig = {
      channelId: '123456789012345678',
      message: 'Hello from AREA!'
    };

    // Mock Discord bot is ready
    mockDiscordBotService.isReady.mockReturnValue(true);

    // Mock successful message send
    mockDiscordBotService.sendMessage.mockResolvedValue({
      id: 'message-id-123',
      content: config.message,
    });

    const result = await service.run(userId, config);

    expect(result).toEqual({
      success: true,
      messageId: 'message-id-123',
    });

    expect(mockDiscordBotService.isReady).toHaveBeenCalled();
    expect(mockDiscordBotService.sendMessage).toHaveBeenCalledWith(
      config.channelId,
      config.message
    );
  });

  it('should throw error when Discord bot is not ready', async () => {
    const userId = 'test-user-id';
    const config: DiscordSendConfig = {
      channelId: '123456789012345678',
      message: 'Hello from AREA!'
    };

    // Mock Discord bot is not ready
    mockDiscordBotService.isReady.mockReturnValue(false);

    await expect(service.run(userId, config)).rejects.toThrow('Discord bot not available');
  });

  it('should throw error when sending message fails', async () => {
    const userId = 'test-user-id';
    const config: DiscordSendConfig = {
      channelId: '123456789012345678',
      message: 'Hello from AREA!'
    };

    // Mock Discord bot is ready
    mockDiscordBotService.isReady.mockReturnValue(true);

    // Mock message send returns null (failure)
    mockDiscordBotService.sendMessage.mockResolvedValue(null);

    await expect(service.run(userId, config)).rejects.toThrow('Failed to send message via Discord bot');
  });

  it('should throw error when Discord bot throws an error', async () => {
    const userId = 'test-user-id';
    const config: DiscordSendConfig = {
      channelId: '123456789012345678',
      message: 'Hello from AREA!'
    };

    // Mock Discord bot is ready
    mockDiscordBotService.isReady.mockReturnValue(true);

    // Mock Discord bot throws error
    mockDiscordBotService.sendMessage.mockRejectedValue(new Error('Channel not found'));

    await expect(service.run(userId, config)).rejects.toThrow();
  });
});
