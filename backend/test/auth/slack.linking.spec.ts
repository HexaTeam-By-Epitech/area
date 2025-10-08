import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SlackLinking } from '../../src/modules/auth/plugins/slack/slack-linking';
import type { TokenCrypto, TokenStore } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../src/modules/auth/core/oauth2-client';

describe('SlackLinking', () => {
  let linking: SlackLinking;
  const cfg = {
    get: jest.fn((k: string) => {
      const map: Record<string, string> = {
        SLACK_CLIENT_ID: 'slack-cid',
        SLACK_CLIENT_SECRET: 'slack-secret',
        SLACK_REDIRECT_URI: 'https://cb/slack',
        NODE_ENV: 'test',
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
    linking = new SlackLinking(cfg, jwt as any, store as any, crypto as any, http as any);
  });

  describe('buildLinkUrl', () => {
    it('builds URL with both bot and user scopes and signed state', () => {
      const url = linking.buildLinkUrl({ userId: 'u1' });
      expect(jwt.sign).toHaveBeenCalled();
      expect(url).toContain('https://slack.com/oauth/v2/authorize?');
      expect(url).toContain('client_id=slack-cid');
      expect(url).toContain(encodeURIComponent('https://cb/slack'));
      expect(url).toContain('scope='); // Bot scopes
      expect(url).toContain('user_scope='); // User scopes
      expect(url).toContain('state=');
    });

    it('throws if missing userId', () => {
      expect(() => linking.buildLinkUrl({ userId: '' as any })).toThrow('userId is required for linking');
    });

    it('throws if Slack OAuth not configured', () => {
      const badCfg = { get: jest.fn(() => null) } as unknown as ConfigService;
      const badLinking = new SlackLinking(badCfg, jwt as any, store as any, crypto as any, http as any);
      expect(() => badLinking.buildLinkUrl({ userId: 'u1' })).toThrow('Slack OAuth not configured');
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

    it('throws when Slack returns not ok', async () => {
      http.postForm.mockResolvedValueOnce({ ok: false, error: 'invalid_code' });
      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Slack OAuth error: invalid_code');
    });

    it('throws when missing bot or user token', async () => {
      http.postForm.mockResolvedValueOnce({
        ok: true,
        access_token: 'bot-token',
        // Missing authed_user
        team: { id: 'T123' },
      });
      await expect(linking.handleLinkCallback('code', 'state')).rejects.toThrow('Slack token exchange failed');
    });

    it('exchanges code, stores both bot and user tokens encrypted, returns userId', async () => {
      http.postForm.mockResolvedValueOnce({
        ok: true,
        access_token: 'xoxb-bot-token',
        scope: 'channels:read,chat:write',
        team: { id: 'T123' },
        authed_user: {
          id: 'U456',
          access_token: 'xoxp-user-token',
          refresh_token: 'xoxe-refresh',
          expires_in: 43200,
          scope: 'channels:read,chat:write',
        },
      });

      const out = await linking.handleLinkCallback('code', 'state');

      // Should call OAuth endpoint
      expect(http.postForm).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        expect.objectContaining({ code: 'code', client_id: 'slack-cid', client_secret: 'slack-secret' }),
      );

      // Should store user token as primary
      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        provider: 'slack',
        providerUserId: 'U456@T123',
        accessToken: 'enc:xoxp-user-token',
        refreshToken: 'enc:xoxe-refresh',
        scopes: 'bot:channels:read,chat:write|user:channels:read,chat:write',
      }));

      // Should also try to store bot token separately
      expect(store.linkExternalAccount).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        provider: 'slack_bot',
        providerUserId: 'T123',
        accessToken: 'enc:xoxb-bot-token',
        refreshToken: null,
        accessTokenExpiresAt: null,
      }));

      expect(out).toEqual({ userId: 'u1' });
    });

    it('ignores error when bot token already exists', async () => {
      http.postForm.mockResolvedValueOnce({
        ok: true,
        access_token: 'xoxb-bot-token',
        scope: 'channels:read',
        team: { id: 'T123' },
        authed_user: {
          id: 'U456',
          access_token: 'xoxp-user-token',
          refresh_token: 'xoxe-refresh',
          expires_in: 43200,
          scope: 'channels:read',
        },
      });

      // First call succeeds, second call (bot token) fails
      store.linkExternalAccount
        .mockResolvedValueOnce({ id: 'u1', email: 'e' })
        .mockRejectedValueOnce(new Error('Duplicate entry'));

      const out = await linking.handleLinkCallback('code', 'state');

      // Should not throw, just log warning
      expect(out).toEqual({ userId: 'u1' });
    });
  });

  describe('refreshAccessToken', () => {
    it('throws when no refresh token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('No Slack refresh token stored');
    });

    it('throws when Slack refresh returns not ok', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ ok: false, error: 'invalid_refresh_token' });
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('Slack token refresh error: invalid_refresh_token');
    });

    it('throws when missing new access token in response', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({ ok: true, authed_user: {} });
      await expect(linking.refreshAccessToken('u1')).rejects.toThrow('Slack refresh failed: missing new access token');
    });

    it('refreshes, updates store with new tokens, returns new token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:rt' });
      http.postForm.mockResolvedValueOnce({
        ok: true,
        authed_user: {
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 43200,
        },
      });

      const res = await linking.refreshAccessToken('u1');

      expect(http.postForm).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        expect.objectContaining({ grant_type: 'refresh_token', refresh_token: 'rt' }),
      );
      expect(store.updateLinkedTokens).toHaveBeenCalledWith('u1', 'slack', expect.objectContaining({
        accessToken: 'enc:new-token',
        refreshToken: 'enc:new-refresh',
      }));
      expect(res).toEqual({ accessToken: 'new-token', expiresIn: 43200 });
    });

    it('keeps old refresh token if new one not provided', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ refresh_token: 'enc:old-rt' });
      http.postForm.mockResolvedValueOnce({
        ok: true,
        authed_user: {
          access_token: 'new-token',
          expires_in: 43200,
          // No refresh_token
        },
      });

      await linking.refreshAccessToken('u1');

      expect(store.updateLinkedTokens).toHaveBeenCalledWith('u1', 'slack', expect.objectContaining({
        refreshToken: 'enc:old-rt', // Should keep the old one
      }));
    });
  });

  describe('getCurrentAccessToken', () => {
    it('throws when no token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.getCurrentAccessToken('u1')).rejects.toThrow('No Slack access token stored');
    });

    it('decrypts and returns current user access token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ access_token: 'enc:xoxp-token' });
      const tok = await linking.getCurrentAccessToken('u1');
      expect(store.getLinkedAccount).toHaveBeenCalledWith('u1', 'slack');
      expect(tok).toBe('xoxp-token');
    });
  });

  describe('getBotToken', () => {
    it('throws when no bot token stored', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({});
      await expect(linking.getBotToken('u1')).rejects.toThrow('No Slack bot token stored');
    });

    it('decrypts and returns bot access token', async () => {
      store.getLinkedAccount.mockResolvedValueOnce({ access_token: 'enc:xoxb-token' });
      const tok = await linking.getBotToken('u1');
      expect(store.getLinkedAccount).toHaveBeenCalledWith('u1', 'slack_bot');
      expect(tok).toBe('xoxb-token');
    });
  });
});
