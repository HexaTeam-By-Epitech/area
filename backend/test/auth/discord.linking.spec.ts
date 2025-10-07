import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DiscordLinking } from '../../src/modules/auth/plugins/discord/discord-linking';
import type { TokenCrypto, TokenStore } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../src/modules/auth/core/oauth2-client';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('DiscordLinking (Bot Invitation)', () => {
  let linking: DiscordLinking;
  const cfg = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        DISCORD_CLIENT_ID: 'did',
        DISCORD_CLIENT_SECRET: 'dsecret',
        DISCORD_REDIRECT_URI: 'https://cb/discord',
      };
      return map[k];
    }),
  } as unknown as ConfigService;
  const jwt = { sign: jest.fn(() => 'state.jwt'), verify: jest.fn(() => ({ userId: 'u1' })) } as any as JwtService;
  const store: jest.Mocked<TokenStore> = {
    getLinkedAccount: jest.fn(),
    updateLinkedTokens: jest.fn(),
    upsertIdentityForLogin: jest.fn(),
    findById: jest.fn(),
    linkExternalAccount: jest.fn().mockResolvedValue({ id: 'u1', email: 'e' }),
  } as any;
  const crypto: jest.Mocked<TokenCrypto> = {
    encrypt: jest.fn((s: string) => `enc:${s}`),
    decrypt: jest.fn((s: string) => s.replace(/^enc:/, '')),
  };
  const http: jest.Mocked<OAuth2Client> = {
    request: jest.fn(),
    postForm: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    linking = new DiscordLinking(cfg, jwt as any, store as any, crypto as any, http as any);
  });

  describe('buildLinkUrl', () => {
    it('builds bot invitation URL with bot and applications.commands scopes', () => {
      const url = linking.buildLinkUrl({ userId: 'u1' });
      expect(jwt.sign).toHaveBeenCalled();
      expect(url).toContain('https://discord.com/api/oauth2/authorize?');
      expect(url).toContain('client_id=did');
      expect(url).toContain(encodeURIComponent('https://cb/discord'));
      expect(url).toContain('scope=bot');
      expect(url).toContain('applications.commands');
      expect(url).toContain('state=');
      expect(url).toContain('permissions=2147534848'); // Bot permissions
    });

    it('includes bot permissions for server invitation', () => {
      const url = linking.buildLinkUrl({ userId: 'u1' });
      expect(url).toContain('permissions=');
      // Verify permissions parameter is present for bot invitation
      const urlParams = new URLSearchParams(url.split('?')[1]);
      expect(urlParams.get('permissions')).toBeTruthy();
    });

    it('throws if missing userId', () => {
      expect(() => linking.buildLinkUrl({ userId: '' as any })).toThrow('userId is required for linking');
    });

    it('throws if Discord OAuth not configured', () => {
      const badCfg = { get: jest.fn(() => null) } as unknown as ConfigService;
      const badLinking = new DiscordLinking(badCfg, jwt as any, store as any, crypto as any, http as any);
      expect(() => badLinking.buildLinkUrl({ userId: 'u1' })).toThrow('Discord OAuth not configured');
    });
  });

  describe('handleLinkCallback', () => {
    it('throws on missing code', async () => {
      await expect(linking.handleLinkCallback('' as any, 'x')).rejects.toThrow('Missing code');
    });

    it('throws on invalid state', async () => {
      (jwt.verify as any).mockReturnValueOnce({});
      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Invalid state: userId missing');
    });

    it('exchanges code, fetches user info and guilds, stores tokens with metadata', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 604800,
        scope: 'bot applications.commands identify guilds',
        guild: { id: 'guild-123' },
      });

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'discord-user-123', username: 'testuser' })
      });

      // Mock guilds fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'guild-123', name: 'Test Server', owner: true },
          { id: 'guild-456', name: 'Another Server', owner: false },
        ],
      });

      const out = await linking.handleLinkCallback('code', 'state');

      expect(http.postForm).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.objectContaining({
          grant_type: 'authorization_code',
          code: 'code',
          client_id: 'did',
          client_secret: 'dsecret',
        }),
      );

      // Verify user info fetch
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/users/@me',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      // Verify guilds fetch
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/users/@me/guilds',
        expect.objectContaining({ headers: expect.any(Object) })
      );

      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        provider: 'discord',
        providerUserId: 'discord-user-123',
        accessToken: 'enc:at',
        refreshToken: 'enc:rt',
        scopes: 'bot applications.commands identify guilds',
        metadata: expect.objectContaining({
          username: 'testuser',
          guildId: 'guild-123',
          guilds: expect.any(Array),
          invitedAt: expect.any(String),
        }),
      }));

      expect(out).toEqual({ userId: 'u1' });
    });

    it('handles callback without guild information', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 604800,
        scope: 'bot applications.commands identify',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'discord-user-123', username: 'testuser' })
      });

      const out = await linking.handleLinkCallback('code', 'state');

      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        metadata: expect.objectContaining({
          username: 'testuser',
          guildId: undefined,
          guilds: null,
        }),
      }));

      expect(out).toEqual({ userId: 'u1' });
    });

    it('throws on failed user info fetch', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 604800,
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Failed to fetch Discord userinfo');
    });

    it('continues if guilds fetch fails (non-critical)', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 604800,
        scope: 'bot applications.commands identify guilds',
      });

      // Mock user info fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'discord-user-123', username: 'testuser' })
      });

      // Mock guilds fetch fails
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const out = await linking.handleLinkCallback('code', 'state');

      expect(out).toEqual({ userId: 'u1' });
      expect(store.linkExternalAccount).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('refreshAccessToken', () => {
    it('throws when no refresh token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('No Discord refresh token stored');
    });

    it('refreshes, updates store, returns new token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ access_token: 'new-at', expires_in: 604800 });

      const res = await linking.refreshAccessToken('u1');
      expect(crypto.decrypt).toHaveBeenCalledWith('enc:rt');
      expect(http.postForm).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.objectContaining({
          grant_type: 'refresh_token',
          refresh_token: 'rt',
          client_id: 'did',
          client_secret: 'dsecret',
        }),
      );
      expect(store.updateLinkedTokens).toHaveBeenCalledWith('u1', 'discord', expect.objectContaining({
        accessToken: 'enc:new-at',
      }));
      expect(res).toEqual({ accessToken: 'new-at', expiresIn: 604800 });
    });
  });

  describe('getCurrentAccessToken', () => {
    it('throws when no token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.getCurrentAccessToken('u1')).rejects.toThrow('No Discord access token stored');
    });

    it('decrypts and returns stored token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ access_token: 'enc:stored-token' });
      const token = await linking.getCurrentAccessToken('u1');
      expect(crypto.decrypt).toHaveBeenCalledWith('enc:stored-token');
      expect(token).toBe('stored-token');
    });
  });
});
