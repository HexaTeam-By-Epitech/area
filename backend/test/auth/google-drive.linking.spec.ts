import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleDriveLinking } from '../../src/modules/auth/plugins/google/google-drive-linking';
import type { TokenStore, TokenCrypto } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../src/modules/auth/core/oauth2-client';

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('GoogleDriveLinking', () => {
  let linking: GoogleDriveLinking;
  const cfg = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        GOOGLE_CLIENT_ID: 'gid',
        GOOGLE_CLIENT_SECRET: 'gsecret',
        GOOGLE_REDIRECT_URI: 'https://cb/google',
        GOOGLE_DRIVE_REDIRECT_URI: 'https://cb/google-drive',
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
    linking = new GoogleDriveLinking(cfg, jwt as any, store as any, crypto as any, http as any);
  });

  describe('buildLinkUrl', () => {
    it('builds URL with Google Drive scopes and signed state', () => {
      const url = linking.buildLinkUrl({ userId: 'u1' });
      expect(jwt.sign).toHaveBeenCalledWith(
        { provider: 'google_drive', mode: 'link', userId: 'u1', mobile: undefined },
        { expiresIn: '10m' }
      );
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?');
      expect(url).toContain('client_id=gid');
      expect(url).toContain(encodeURIComponent('https://cb/google-drive'));
      expect(url).toContain('scope=');
      expect(url).toContain('drive');
      expect(url).toContain('state=');
    });

    it('throws if missing userId', () => {
      expect(() => linking.buildLinkUrl({ userId: '' as any })).toThrow('userId is required for linking');
    });

    it('supports custom scopes', () => {
      const url = linking.buildLinkUrl({ 
        userId: 'u1', 
        scopes: ['https://www.googleapis.com/auth/drive.file'] 
      });
      expect(url).toContain('drive.file');
    });

    it('supports mobile flag', () => {
      const url = linking.buildLinkUrl({ userId: 'u1', mobile: true });
      expect(jwt.sign).toHaveBeenCalledWith(
        { provider: 'google_drive', mode: 'link', userId: 'u1', mobile: true },
        { expiresIn: '10m' }
      );
    });

    it('falls back to GOOGLE_REDIRECT_URI if GOOGLE_DRIVE_REDIRECT_URI is not set', () => {
      const cfgFallback = {
        get: jest.fn((k: string) => {
          const map: Record<string, string> = {
            GOOGLE_CLIENT_ID: 'gid',
            GOOGLE_CLIENT_SECRET: 'gsecret',
            GOOGLE_REDIRECT_URI: 'https://cb/google',
          };
          return map[k];
        }),
      } as unknown as ConfigService;
      const linkingFallback = new GoogleDriveLinking(cfgFallback, jwt as any, store as any, crypto as any, http as any);
      const url = linkingFallback.buildLinkUrl({ userId: 'u1' });
      expect(url).toContain(encodeURIComponent('https://cb/google'));
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

    it('exchanges code, fetches userinfo, stores tokens encrypted with google_drive provider, returns userId', async () => {
      http.postForm.mockResolvedValueOnce({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 1800,
        scope: 'openid email https://www.googleapis.com/auth/drive',
      });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ sub: 'google-drive-user' }) });

      const out = await linking.handleLinkCallback('code', 'state');
      expect(http.postForm).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.objectContaining({ 
        grant_type: 'authorization_code', 
        code: 'code',
        redirect_uri: 'https://cb/google-drive'
      }));
      expect(mockFetch).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v3/userinfo', expect.objectContaining({ 
        headers: expect.any(Object) 
      }));
      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1', 
        provider: 'google_drive', 
        providerUserId: 'google-drive-user',
        accessToken: 'enc:at', 
        refreshToken: 'enc:rt',
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

    it('fails when userinfo does not contain sub', async () => {
      http.postForm.mockResolvedValueOnce({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: '' });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ email: 'test@example.com' }) });
      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Missing Google subject');
    });
  });

  describe('refreshAccessToken', () => {
    it('throws when no refresh token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('No Google Drive refresh token stored');
    });

    it('refreshes, updates store with google_drive provider, returns new token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ access_token: 'new', expires_in: 1200 });
      const res = await linking.refreshAccessToken('u1');
      expect(http.postForm).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', expect.objectContaining({
        grant_type: 'refresh_token',
        refresh_token: 'rt',
      }));
      expect(store.updateLinkedTokens).toHaveBeenCalledWith('u1', 'google_drive', expect.objectContaining({ 
        accessToken: 'enc:new' 
      }));
      expect(res).toEqual({ accessToken: 'new', expiresIn: 1200 });
    });

    it('uses default expiresIn if not provided', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ access_token: 'new' });
      const res = await linking.refreshAccessToken('u1');
      expect(res.expiresIn).toBe(3600);
    });
  });

  describe('getCurrentAccessToken', () => {
    it('throws when no token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.getCurrentAccessToken('u1')).rejects.toThrow('No Google Drive access token stored');
    });

    it('decrypts and returns current access token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ access_token: 'enc:at' });
      const tok = await linking.getCurrentAccessToken('u1');
      expect(tok).toBe('at');
    });
  });

  describe('key property', () => {
    it('should have google_drive as the provider key', () => {
      expect(linking.key).toBe('google_drive');
    });
  });
});
