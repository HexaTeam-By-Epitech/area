import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LinkingProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore, TokenCrypto } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../core/oauth2-client';

/**
 * Slack linking plugin for connecting both a Slack Bot and User account.
 * Builds consent URL, handles callback to persist encrypted tokens, and
 * supports token refresh and access token retrieval.
 *
 * This implementation uses a HYBRID approach requesting BOTH:
 * - Bot Token (workspace-level): For listening to events, accessing channels
 * - User Token (individual): For actions performed as the user
 *
 * This enables IFTTT-like workflows:
 * - Reactions (IF): Use bot token to listen to channels, messages, etc.
 * - Actions (THEN): Use user token to post messages as the user
 *
 * Both tokens are stored per user. Multiple users from the same workspace
 * will trigger multiple bot installations (Slack handles this gracefully).
 */
@Injectable()
export class SlackLinking implements LinkingProvider {
  readonly key = 'slack' as const;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: TokenStore,
    private readonly crypto: TokenCrypto,
    private readonly http: OAuth2Client,
  ) {}

  /**
   * Build the Slack OAuth URL requesting BOTH bot and user tokens.
   * @param params.userId - Target application user id (signed into state)
   * @param params.scopes - Optional list of scopes (not used, uses defaults)
   * @param params.mobile - Optional flag to indicate mobile app flow
   */
  buildLinkUrl(params: { userId: string; scopes?: string[]; mobile?: boolean }): string {
    const clientId = this.config.get<string>('SLACK_CLIENT_ID');
    const redirectUri = this.config.get<string>('SLACK_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Slack OAuth not configured');
    }
    if (!params.userId) throw new BadRequestException('userId is required for linking');

    // Bot scopes: For listening to events (Reactions/IF)
    const botScopes = [
      'channels:read',
      'channels:history',
      'chat:write',
      'users:read',
      'team:read',
    ].join(',');

    // User scopes: For acting as the user (Actions/THEN)
    const userScopes = [
      'channels:read',
      'channels:history',
      'chat:write',
      'users:read',
    ].join(',');

    const state = this.jwt.sign({ provider: 'slack', mode: 'link', userId: params.userId, mobile: params.mobile }, { expiresIn: '10m' });

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: botScopes,        // Bot scopes
      user_scope: userScopes,  // User scopes (both requested!)
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${q.toString()}`;
  }

  /**
   * Handle the OAuth linking callback and store BOTH bot and user tokens.
   * @param code - Authorization code returned by Slack
   * @param state - Signed state containing user id
   * @returns The linked user id
   */
  async handleLinkCallback(code: string, state?: string): Promise<{ userId: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('SLACK_CLIENT_ID');
    const clientSecret = this.config.get<string>('SLACK_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('SLACK_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Slack OAuth not configured');
    }

    const decoded = state ? (this.jwt.verify(state) as any) : null;
    const userId = decoded?.userId as string | undefined;
    if (!userId) throw new BadRequestException('Invalid state: userId missing');

    const tokenRes = await this.http.postForm('https://slack.com/api/oauth.v2.access', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    if (!tokenRes.ok) {
      throw new InternalServerErrorException(`Slack OAuth error: ${tokenRes.error || 'Unknown error'}`);
    }

    // Extract bot token (for reactions/listening)
    const botAccessToken = tokenRes.access_token as string | undefined;
    const botScopes = tokenRes.scope as string | undefined;

    // Extract user token (for actions/posting)
    const authedUser = tokenRes.authed_user as any;
    const userAccessToken = authedUser?.access_token as string | undefined;
    const userRefreshToken = authedUser?.refresh_token as string | undefined;
    const expiresIn = authedUser?.expires_in as number | undefined;
    const slackUserId = authedUser?.id as string | undefined;
    const userScopes = authedUser?.scope as string | undefined;

    const teamId = tokenRes.team?.id as string | undefined;

    if (!botAccessToken || !userAccessToken || !slackUserId || !teamId) {
      throw new InternalServerErrorException('Slack token exchange failed: missing bot token, user token, user id, or team_id');
    }

    // Use slack_user_id@team_id as provider user id (unique per user per workspace)
    const providerUserId = `${slackUserId}@${teamId}`;

    // Store user token as primary (for actions)
    // Store bot token in a metadata field (we'll add this to the schema if needed)
    // For now, we'll use the access_token field for user token (most common use case)
    await this.store.linkExternalAccount({
      userId,
      provider: 'slack',
      providerUserId,
      accessToken: this.crypto.encrypt(userAccessToken),
      refreshToken: userRefreshToken ? this.crypto.encrypt(userRefreshToken) : null,
      accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      scopes: `bot:${botScopes}|user:${userScopes}`,
    });

    // TODO: Store bot token separately for reactions
    // Option 1: Add a metadata JSON field to linked_accounts table
    // Option 2: Create a separate slack_bot_tokens table
    // Option 3: Store as second linked_account with providerUserId = teamId (simpler for now)

    // For now, also store bot token as a separate "account" with team_id as providerUserId
    try {
      await this.store.linkExternalAccount({
        userId,
        provider: 'slack_bot' as any, // Hacky but works without schema changes
        providerUserId: teamId,
        accessToken: this.crypto.encrypt(botAccessToken),
        refreshToken: null, // Bot tokens don't expire
        accessTokenExpiresAt: null,
        scopes: botScopes ?? null,
      });
    } catch (err) {
      // Ignore if already exists (multiple users from same workspace)
      this.config.get('NODE_ENV') !== 'production' && console.warn('Bot token storage failed (may already exist):', err);
    }

    return { userId };
  }

  /**
   * Refresh the Slack user access token using the stored refresh token.
   * Note: User tokens expire and can be refreshed (unlike bot tokens).
   * @param userId - Application user id
   */
  async refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const account = await this.store.getLinkedAccount(userId, 'slack');
    if (!account || !account.refresh_token) throw new BadRequestException('No Slack refresh token stored');

    const refreshToken = this.crypto.decrypt(account.refresh_token);
    const clientId = this.config.get<string>('SLACK_CLIENT_ID');
    const clientSecret = this.config.get<string>('SLACK_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new InternalServerErrorException('Slack OAuth not configured');

    const tokens = await this.http.postForm('https://slack.com/api/oauth.v2.access',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
    );

    if (!tokens.ok) {
      throw new InternalServerErrorException(`Slack token refresh error: ${tokens.error || 'Unknown error'}`);
    }

    const newAccessToken = tokens.authed_user?.access_token as string;
    const newRefreshToken = tokens.authed_user?.refresh_token as string | undefined;
    const expiresIn = (tokens.authed_user?.expires_in as number | undefined) ?? 43200; // Default 12h

    if (!newAccessToken) {
      throw new InternalServerErrorException('Slack refresh failed: missing new access token');
    }

    await this.store.updateLinkedTokens(userId, 'slack', {
      accessToken: this.crypto.encrypt(newAccessToken),
      refreshToken: newRefreshToken ? this.crypto.encrypt(newRefreshToken) : account.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    return { accessToken: newAccessToken, expiresIn };
  }

  /**
   * Retrieve and decrypt the current Slack user access token for the user.
   * This is used for ACTIONS (posting messages as the user).
   */
  async getCurrentAccessToken(userId: string): Promise<string> {
    const account = await this.store.getLinkedAccount(userId, 'slack');
    if (!account || !account.access_token) throw new BadRequestException('No Slack access token stored');
    return this.crypto.decrypt(account.access_token);
  }

  /**
   * Retrieve the bot token for reactions (listening to channels).
   * Returns the bot token associated with the user's workspace.
   */
  async getBotToken(userId: string): Promise<string> {
    const account = await this.store.getLinkedAccount(userId, 'slack_bot' as any);
    if (!account || !account.access_token) throw new BadRequestException('No Slack bot token stored');
    return this.crypto.decrypt(account.access_token);
  }
}
