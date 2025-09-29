import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SpotifyLinking } from '../../src/modules/auth/plugins/spotify/SpotifyLinking';
import type { TokenStore } from '../../src/modules/auth/core/TokenStore';
import type { TokenCrypto } from '../../src/modules/auth/core/TokenCrypto';
import { OAuth2Client } from '../../src/modules/auth/core/OAuth2Client';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('SpotifyLinking', () => {
  let linking: SpotifyLinking;
  const cfg = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        SPOTIFY_CLIENT_ID: 'sid',
        SPOTIFY_CLIENT_SECRET: 'ssecret',
        SPOTIFY_REDIRECT_URI: 'https://cb/spotify',
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
    linking = new SpotifyLinking(cfg, jwt as any, store as any, crypto as any, http as any);
  });

  describe('buildLinkUrl', () => {
    it('builds URL with default scopes and signed state', () => {
      const url = linking.buildLinkUrl({ userId: 'u1' });
      expect(jwt.sign).toHaveBeenCalled();
      expect(url).toContain('https://accounts.spotify.com/authorize?');
      expect(url).toContain('client_id=sid');
      expect(url).toContain(encodeURIComponent('https://cb/spotify'));
      expect(url).toContain('scope=');
      expect(url).toContain('state=');
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

    it('exchanges code, fetches profile, stores tokens encrypted, returns userId', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 1800,
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'spotify-user' }) });

      const out = await linking.handleLinkCallback('code', 'state');
      expect(http.postForm).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({ grant_type: 'authorization_code', code: 'code' }),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith('https://api.spotify.com/v1/me', expect.objectContaining({ headers: expect.any(Object) }));
      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', provider: 'spotify', providerUserId: 'spotify-user',
        accessToken: 'enc:at', refreshToken: 'enc:rt',
      }));
      expect(out).toEqual({ userId: 'u1' });
    });
  });

  describe('refreshAccessToken', () => {
    it('throws when no refresh token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('No Spotify refresh token stored');
    });

    it('refreshes, updates store, returns new token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ access_token: 'new', expires_in: 1200 });
      const res = await linking.refreshAccessToken('u1');
      expect(http.postForm).toHaveBeenCalled();
      expect(store.updateLinkedTokens).toHaveBeenCalledWith('u1', 'spotify', expect.objectContaining({ accessToken: 'enc:new' }));
      expect(res).toEqual({ accessToken: 'new', expiresIn: 1200 });
    });
  });

  describe('getCurrentAccessToken', () => {
    it('throws when no token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.getCurrentAccessToken('u1')).rejects.toThrow('No Spotify access token stored');
    });

    it('decrypts and returns current access token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ access_token: 'enc:at' });
      const tok = await linking.getCurrentAccessToken('u1');
      expect(tok).toBe('at');
    });
  });
});
