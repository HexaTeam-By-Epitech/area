import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleLinking } from '../../src/modules/auth/plugins/google/GoogleLinking';
import type { TokenStore } from '../../src/modules/auth/core/TokenStore';
import type { TokenCrypto } from '../../src/modules/auth/core/TokenCrypto';
import { OAuth2Client } from '../../src/modules/auth/core/OAuth2Client';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('GoogleLinking', () => {
  let linking: GoogleLinking;
  const cfg = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'gid',
        GOOGLE_CLIENT_SECRET: 'gsecret',
        GOOGLE_REDIRECT_URI: 'https://cb/google',
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
    linking = new GoogleLinking(cfg, jwt as any, store as any, crypto as any, http as any);
  });

  describe('buildLinkUrl', () => {
    it('builds URL with default scopes and signed state', () => {
      const url = linking.buildLinkUrl({ userId: 'u1' });
      expect(jwt.sign).toHaveBeenCalled();
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
      expect(url).toContain('client_id=gid');
      expect(url).toContain(encodeURIComponent('https://cb/google'));
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

    it('exchanges code, fetches userinfo, stores tokens encrypted, returns userId', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 1800,
        scope: 'openid email',
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'google-user' }) });

      const out = await linking.handleLinkCallback('code', 'state');
      expect(http.postForm).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.objectContaining({ grant_type: 'authorization_code', code: 'code' }));
      expect(mockFetch).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', expect.objectContaining({ headers: expect.any(Object) }));
      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', provider: 'google', providerUserId: 'google-user',
        accessToken: 'enc:at', refreshToken: 'enc:rt',
      }));
      expect(out).toEqual({ userId: 'u1' });
    });

    it('fails when token exchange yields no access_token', async () => {
      http.postForm.mockResolvedValueOnce({ refresh_token: 'rt' });
      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Google token exchange failed');
    });

    it('fails when userinfo fetch not ok', async () => {
      http.postForm.mockResolvedValueOnce({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: '' });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Failed to fetch Google userinfo');
    });
  });

  describe('refreshAccessToken', () => {
    it('throws when no refresh token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('No Google refresh token stored');
    });

    it('refreshes, updates store, returns new token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ access_token: 'new', expires_in: 1200 });
      const res = await linking.refreshAccessToken('u1');
      expect(http.postForm).toHaveBeenCalled();
      expect(store.updateLinkedTokens).toHaveBeenCalledWith('u1', 'google', expect.objectContaining({ accessToken: 'enc:new' }));
      expect(res).toEqual({ accessToken: 'new', expiresIn: 1200 });
    });
  });

  describe('getCurrentAccessToken', () => {
    it('throws when no token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.getCurrentAccessToken('u1')).rejects.toThrow('No Google access token stored');
    });

    it('decrypts and returns current access token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ access_token: 'enc:at' });
      const tok = await linking.getCurrentAccessToken('u1');
      expect(tok).toBe('at');
    });
  });
});
