import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotionLinking } from '../../src/modules/auth/plugins/notion/notion-linking';
import type { TokenCrypto, TokenStore } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../src/modules/auth/core/oauth2-client';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('NotionLinking', () => {
  let notionLinking: NotionLinking;
  const cfg = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        NOTION_CLIENT_ID: 'test-notion-client-id',
        NOTION_CLIENT_SECRET: 'test-notion-client-secret',
        NOTION_REDIRECT_URI: 'http://localhost:3000/auth/notion/callback',
      };
      return map[k];
    }),
  } as unknown as ConfigService;
  const jwt = {
    sign: jest.fn(() => 'test-state-token'),
    verify: jest.fn(() => ({ provider: 'notion', mode: 'link', userId: 'test-user-id' })),
  } as any as JwtService;
  const store: jest.Mocked<TokenStore> = {
    getLinkedAccount: jest.fn(),
    updateLinkedTokens: jest.fn(),
    upsertIdentityForLogin: jest.fn(),
    findById: jest.fn(),
    linkExternalAccount: jest.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@example.com' }),
  } as any;
  const crypto: jest.Mocked<TokenCrypto> = {
    encrypt: jest.fn((s: string) => `encrypted-${s}`),
    decrypt: jest.fn((s: string) => s.replace(/^encrypted-/, '')),
  };
  const http: jest.Mocked<OAuth2Client> = {
    request: jest.fn(),
    postForm: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    notionLinking = new NotionLinking(cfg, jwt as any, store as any, crypto as any, http as any);
  });

  describe('buildLinkUrl', () => {
    beforeEach(() => {
      // Reset cfg.get to return proper values for buildLinkUrl tests
      (cfg.get as jest.Mock).mockImplementation((k: string) => {
        const map: Record<string, string> = {
          NOTION_CLIENT_ID: 'test-notion-client-id',
          NOTION_CLIENT_SECRET: 'test-notion-client-secret',
          NOTION_REDIRECT_URI: 'http://localhost:3000/auth/notion/callback',
        };
        return map[k];
      });
    });

    it('should build a valid Notion OAuth URL', () => {
      const url = notionLinking.buildLinkUrl({ userId: 'test-user-id' });

      expect(url).toContain('https://api.notion.com/v1/oauth/authorize');
      expect(url).toContain('client_id=test-notion-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fnotion%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('owner=user');
      expect(url).toContain('state=test-state-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { provider: 'notion', mode: 'link', userId: 'test-user-id', mobile: undefined },
        { expiresIn: '10m' }
      );
    });

    it('should include mobile flag in state when mobile is true', () => {
      notionLinking.buildLinkUrl({ userId: 'test-user-id', mobile: true });

      expect(jwt.sign).toHaveBeenCalledWith(
        { provider: 'notion', mode: 'link', userId: 'test-user-id', mobile: true },
        { expiresIn: '10m' }
      );
    });

    it('should throw error when Notion OAuth is not configured', () => {
      const originalGet = cfg.get;
      jest.spyOn(cfg, 'get').mockReturnValue(undefined);

      expect(() => notionLinking.buildLinkUrl({ userId: 'test-user-id' }))
        .toThrow('Notion OAuth not configured');
      
      cfg.get = originalGet;
    });

    it('should throw error when userId is missing', () => {
      expect(() => notionLinking.buildLinkUrl({ userId: '' }))
        .toThrow('userId is required for linking');
    });
  });

  describe('handleLinkCallback', () => {
    beforeEach(() => {
      // Reset cfg.get to return proper values for handleLinkCallback tests
      (cfg.get as jest.Mock).mockImplementation((k: string) => {
        const map: Record<string, string> = {
          NOTION_CLIENT_ID: 'test-notion-client-id',
          NOTION_CLIENT_SECRET: 'test-notion-client-secret',
          NOTION_REDIRECT_URI: 'http://localhost:3000/auth/notion/callback',
        };
        return map[k];
      });
    });

    it('should handle callback and store encrypted tokens', async () => {
      const mockTokenResponse = {
        access_token: 'notion-access-token',
        workspace_id: 'notion-workspace-123',
        bot_id: 'notion-bot-456',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await notionLinking.handleLinkCallback('test-code', 'test-state');

      expect(result).toEqual({ userId: 'test-user-id' });
      expect(jwt.verify).toHaveBeenCalledWith('test-state');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.notion.com/v1/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic '),
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'test-code',
            redirect_uri: 'http://localhost:3000/auth/notion/callback',
          }),
        })
      );
      expect(store.linkExternalAccount).toHaveBeenCalledWith({
        userId: 'test-user-id',
        provider: 'notion',
        providerUserId: 'notion-workspace-123',
        accessToken: 'encrypted-notion-access-token',
        refreshToken: null,
        accessTokenExpiresAt: expect.any(Date),
      });
    });

    it('should throw error when code is missing', async () => {
      await expect(notionLinking.handleLinkCallback('', 'test-state'))
        .rejects.toThrow('Missing code');
    });

    it('should throw error when state is invalid', async () => {
      (jwt.verify as any).mockReturnValueOnce({});

      await expect(notionLinking.handleLinkCallback('test-code', 'invalid-state'))
        .rejects.toThrow('Invalid state: userId missing');
    });
  });

  describe('getCurrentAccessToken', () => {
    it('should return decrypted access token', async () => {
      store.getLinkedAccount.mockResolvedValue({
        access_token: 'encrypted-notion-token',
      } as any);

      const token = await notionLinking.getCurrentAccessToken('test-user-id');

      expect(token).toBe('notion-token');
      expect(store.getLinkedAccount).toHaveBeenCalledWith('test-user-id', 'notion');
      expect(crypto.decrypt).toHaveBeenCalledWith('encrypted-notion-token');
    });

    it('should throw error when no token is stored', async () => {
      store.getLinkedAccount.mockResolvedValue(null);

      await expect(notionLinking.getCurrentAccessToken('test-user-id'))
        .rejects.toThrow('No Notion access token stored');
    });
  });

  describe('refreshAccessToken', () => {
    it('should return existing token since Notion tokens dont expire', async () => {
      store.getLinkedAccount.mockResolvedValue({
        access_token: 'encrypted-notion-token',
      } as any);

      const result = await notionLinking.refreshAccessToken('test-user-id');

      expect(result.accessToken).toBe('notion-token');
      expect(result.expiresIn).toBe(100 * 365 * 24 * 60 * 60);
    });
  });
});

