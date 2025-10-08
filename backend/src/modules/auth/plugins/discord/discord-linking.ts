import { Injectable, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LinkingProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore, TokenCrypto } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../core/oauth2-client';

/**
 * Discord linking plugin for inviting a Discord bot to a server.
 * Builds consent URL with bot scope, handles callback to persist encrypted tokens,
 * and supports token refresh and access token retrieval.
 */
@Injectable()
export class DiscordLinking implements LinkingProvider {
  readonly key = 'discord' as const;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: TokenStore,
    private readonly crypto: TokenCrypto,
    private readonly http: OAuth2Client,
  ) {}

  /**
   * Build the Discord consent URL for inviting the bot to a server.
   * @param params.userId - Target application user id (logged into state)
   * @param params.scopes - Optional list of scopes; defaults include bot scope for server invitation.
   */
  buildLinkUrl(params: { userId: string; scopes?: string[] }): string {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const redirectUri = this.config.get<string>('DISCORD_REDIRECT_URI');
    if (!clientId || !redirectUri) throw new InternalServerErrorException('Discord OAuth not configured');
    if (!params.userId) throw new BadRequestException('userId is required for linking');

    const state = this.jwt.sign({ provider: 'discord', mode: 'link', userId: params.userId }, { expiresIn: '10m' });

    // Default scopes include 'bot' for server invitation and 'identify' for user info
    const scopes = (params.scopes && params.scopes.length ? params.scopes : [
      'identify',
      'guilds',
      'bot',
    ]).join(' ');

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
      // Add bot permissions (you can customize these based on your bot's needs)
      permissions: '8', // Administrator permissions, adjust as needed
    });

    return `https://discord.com/api/oauth2/authorize?${q.toString()}`;
  }

  /**
   * Handle the OAuth linking callback and store encrypted access/refresh tokens.
   * @param code - Authorization code returned by Discord
   * @param state - Signed state containing user id
   * @returns The linked user id
   */
  async handleLinkCallback(code: string, state?: string): Promise<{ userId: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.config.get<string>('DISCORD_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('DISCORD_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Discord OAuth not configured');
    }

    const decoded = state ? (this.jwt.verify(state) as any) : null;
    const userId = decoded?.userId as string | undefined;
    if (!userId) throw new BadRequestException('Invalid state: userId missing');

    // Exchange authorization code for tokens
    const tokenRes = await this.http.postForm('https://discord.com/api/oauth2/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      },
      { 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
    );

    const accessToken = tokenRes.access_token as string | undefined;
    const refreshToken = tokenRes.refresh_token as string | undefined;
    const expiresIn = (tokenRes.expires_in as number | undefined) ?? 604800; // Discord tokens typically expire in 7 days
    const scopeStr = tokenRes.scope as string | undefined;

    if (!accessToken) throw new UnauthorizedException('Discord token exchange failed');

    // Fetch user info to get provider user id
    const userInfoResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResp.ok) throw new UnauthorizedException('Failed to fetch Discord user info');

    const userInfo = await userInfoResp.json();
    const providerUserId = userInfo?.id as string | undefined;

    if (!providerUserId) throw new UnauthorizedException('Missing Discord user id');

    // Store encrypted tokens
    await this.store.linkExternalAccount({
      userId,
      provider: 'discord',
      providerUserId,
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : null,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      scopes: scopeStr ?? null,
    });

    return { userId };
  }

  /**
   * Refresh the Discord access token using the stored refresh token.
   * @param userId - Application user id
   * @returns New access token and expiry in seconds
   */
  async refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const account = await this.store.getLinkedAccount(userId, 'discord');
    if (!account || !account.refresh_token) {
      throw new BadRequestException('No Discord refresh token stored');
    }

    const refreshToken = this.crypto.decrypt(account.refresh_token);
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.config.get<string>('DISCORD_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Discord OAuth not configured');
    }

    const tokens = await this.http.postForm('https://discord.com/api/oauth2/token',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      { 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
    );

    const newAccessToken = tokens.access_token as string;
    const expiresIn = (tokens.expires_in as number | undefined) ?? 604800;

    await this.store.updateLinkedTokens(userId, 'discord', {
      accessToken: this.crypto.encrypt(newAccessToken),
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    return { accessToken: newAccessToken, expiresIn };
  }

  /**
   * Retrieve and decrypt the current Discord access token for the user.
   */
  async getCurrentAccessToken(userId: string): Promise<string> {
    const account = await this.store.getLinkedAccount(userId, 'discord');
    if (!account || !account.access_token) {
      throw new BadRequestException('No Discord access token stored');
    }
    return this.crypto.decrypt(account.access_token);
  }
}

