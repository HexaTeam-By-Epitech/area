import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DiscordLinking } from '../../src/modules/auth/plugins/discord/discord-linking';
import type { TokenCrypto, TokenStore } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../src/modules/auth/core/oauth2-client';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('DiscordLinking', () => {
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
    it('builds URL with default scopes (including bot) and signed state', () => {
      const url = linking.buildLinkUrl({ userId: 'u1' });
      expect(jwt.sign).toHaveBeenCalled();
      expect(url).toContain('https://discord.com/api/oauth2/authorize?');
      expect(url).toContain('client_id=did');
      expect(url).toContain(encodeURIComponent('https://cb/discord'));
      expect(url).toContain('scope=');
      expect(url).toContain('bot'); // Bot scope for server invitation
      expect(url).toContain('state=');
      expect(url).toContain('permissions=8'); // Bot permissions
    });

    it('throws if missing userId', () => {
      expect(() => linking.buildLinkUrl({ userId: '' as any })).toThrow('userId is required for linking');
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

    it('exchanges code, fetches user info, stores tokens encrypted, returns userId', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 604800,
        scope: 'identify guilds bot',
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'discord-user-123' }) });

      const out = await linking.handleLinkCallback('code', 'state');
      expect(http.postForm).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.objectContaining({ grant_type: 'authorization_code', code: 'code' }),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith('https://discord.com/api/users/@me', expect.objectContaining({ headers: expect.any(Object) }));
      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', provider: 'discord', providerUserId: 'discord-user-123',
        accessToken: 'enc:at', refreshToken: 'enc:rt',
      }));
      expect(out).toEqual({ userId: 'u1' });
    });

    it('throws when Discord user info fetch fails', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 604800,
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });

      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Failed to fetch Discord user info');
    });
  });

  describe('refreshAccessToken', () => {
    it('throws when no refresh token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('No Discord refresh token stored');
    });

    it('refreshes, updates store, returns new token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ access_token: 'new', expires_in: 604800 });
      const res = await linking.refreshAccessToken('u1');
      expect(http.postForm).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.objectContaining({ grant_type: 'refresh_token', refresh_token: 'rt' }),
        expect.any(Object),
      );
      expect(store.updateLinkedTokens).toHaveBeenCalledWith('u1', 'discord', expect.objectContaining({ accessToken: 'enc:new' }));
      expect(res).toEqual({ accessToken: 'new', expiresIn: 604800 });
    });
  });

  describe('getCurrentAccessToken', () => {
    it('throws when no token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.getCurrentAccessToken('u1')).rejects.toThrow('No Discord access token stored');
    });

    it('decrypts and returns current access token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ access_token: 'enc:at' });
      const tok = await linking.getCurrentAccessToken('u1');
      expect(tok).toBe('at');
    });
  });
});

