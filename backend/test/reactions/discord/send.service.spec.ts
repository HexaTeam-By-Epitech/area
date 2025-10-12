import { Test, TestingModule } from '@nestjs/testing';
import { DiscordSendService, DiscordSendConfig } from './send.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

// Mock fetch globalement
global.fetch = jest.fn();

describe('DiscordSendService', () => {
  let service: DiscordSendService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    oauth_providers: {
      findFirst: jest.fn(),
    },
    linked_accounts: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordSendService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DiscordSendService>(DiscordSendService);
    prismaService = module.get<PrismaService>(PrismaService);

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

    // Mock Discord provider
    mockPrismaService.oauth_providers.findFirst.mockResolvedValue({
      id: 1,
      name: 'discord',
    });

    // Mock linked account
    mockPrismaService.linked_accounts.findFirst.mockResolvedValue({
      id: 'link-id',
      user_id: userId,
      provider_id: 1,
      access_token: 'test-bot-token',
      is_active: true,
      deleted_at: null,
    });

    // Mock successful Discord API response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'message-id-123',
        content: config.message,
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await service.run(userId, config);

    expect(result).toEqual({
      success: true,
      messageId: 'message-id-123',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `https://discord.com/api/v10/channels/${config.channelId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bot test-bot-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: config.message,
        }),
      }
    );
  });

  it('should throw error when Discord provider is not found', async () => {
    const userId = 'test-user-id';
    const config: DiscordSendConfig = {
      channelId: '123456789012345678',
      message: 'Hello from AREA!'
    };

    // Mock no Discord provider found
    mockPrismaService.oauth_providers.findFirst.mockResolvedValue(null);

    await expect(service.run(userId, config)).rejects.toThrow('Discord provider not configured');
  });

  it('should throw error when user has no Discord account linked', async () => {
    const userId = 'test-user-id';
    const config: DiscordSendConfig = {
      channelId: '123456789012345678',
      message: 'Hello from AREA!'
    };

    // Mock Discord provider exists
    mockPrismaService.oauth_providers.findFirst.mockResolvedValue({
      id: 1,
      name: 'discord',
    });

    // Mock no linked account
    mockPrismaService.linked_accounts.findFirst.mockResolvedValue(null);

    await expect(service.run(userId, config)).rejects.toThrow('Discord not linked for this user');
  });

  it('should throw error when Discord API returns error', async () => {
    const userId = 'test-user-id';
    const config: DiscordSendConfig = {
      channelId: '123456789012345678',
      message: 'Hello from AREA!'
    };

    // Mock Discord provider and linked account
    mockPrismaService.oauth_providers.findFirst.mockResolvedValue({
      id: 1,
      name: 'discord',
    });

    mockPrismaService.linked_accounts.findFirst.mockResolvedValue({
      id: 'link-id',
      user_id: userId,
      provider_id: 1,
      access_token: 'test-bot-token',
      is_active: true,
      deleted_at: null,
    });

    // Mock Discord API error response
    const mockResponse = {
      ok: false,
      status: 403,
      text: jest.fn().mockResolvedValue('Forbidden'),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(service.run(userId, config)).rejects.toThrow('Failed to send Discord message: 403');
  });
});
