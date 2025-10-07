import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LinkingProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore, TokenCrypto } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../core/oauth2-client';

/**
 * Discord bot invitation plugin for inviting the application's Discord bot to a server.
 * This is NOT a standard OAuth login flow - it's specifically designed to add the bot
 * to a Discord server (guild) with the necessary permissions.
 *
 * The OAuth flow invites the bot to a Discord server, granting the application
 * the necessary permissions to interact with the server. The bot will be added with
 * the permissions specified in the authorization URL.
 */
@Injectable()
export class DiscordLinking implements LinkingProvider {
  readonly key = 'discord' as const;
  private readonly logger = new Logger(DiscordLinking.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: TokenStore,
    private readonly crypto: TokenCrypto,
    private readonly http: OAuth2Client,
  ) {}

  /**
   * Build the Discord bot invitation URL for adding the bot to a server.
   * This URL will prompt the user to select a server and invite the bot.
   *
   * Important: This uses the 'bot' scope which allows bot invitation.
   * The 'applications.commands' scope is also included for slash commands.
   *
   * @param params.userId - Target application user id (signed into state)
   * @param params.scopes - Optional list of scopes, defaults to bot + applications.commands.
   * @param params.mobile - Optional flag to indicate mobile app flow
   */
  buildLinkUrl(params: { userId: string; scopes?: string[]; mobile?: boolean }): string {
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const redirectUri = this.config.get<string>('DISCORD_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Discord OAuth not configured');
    }
    if (!params.userId) throw new BadRequestException('userId is required for linking');

    // For bot invitation, we primarily need the 'bot' and 'applications.commands' scopes
    // We can optionally add 'identify' and 'guilds' to get server info
    const scopes = (params.scopes && params.scopes.length
      ? params.scopes
      : [
          'bot',
          'applications.commands',
          'identify',
          'guilds',
        ]).join(' ');

    const state = this.jwt.sign({ provider: 'discord', mode: 'link', userId: params.userId, mobile: params.mobile }, { expiresIn: '10m' });

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
      // Bot permissions (bitfield): https://discord.com/developers/docs/topics/permissions
      // 8 = Administrator (use with caution in production)
      // Recommended: use more specific permissions like:
      // 2048 = Read Messages, 2147483648 = Send Messages, etc.
      permissions: '2147534848', // Read Messages, Send Messages, Manage Messages, Embed Links, Attach Files, Read Message History, Add Reactions
    });
    return `https://discord.com/api/oauth2/authorize?${q.toString()}`;
  }

  /**
   * Handle the Discord bot invitation callback.
   * After the user authorizes the bot on their server, Discord redirects here with a code.
   * We exchange the code for access/refresh tokens and store the guild (server) information.
   *
   * @param code - Authorization code returned by Discord
   * @param state - Signed state containing user id
   * @returns The linked user id and guild information
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

    // Exchange code for access token
    const tokenRes = await this.http.postForm('https://discord.com/api/oauth2/token', {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const accessToken = tokenRes.access_token as string | undefined;
    const refreshToken = tokenRes.refresh_token as string | undefined;
    const expiresIn = (tokenRes.expires_in as number | undefined) ?? 604800; // Discord tokens last 7 days by default
    const scopeStr = tokenRes.scope as string | undefined;
    const guildId = tokenRes.guild?.id as string | undefined; // Guild info if bot was added

    if (!accessToken) throw new UnauthorizedException('Discord token exchange failed');

    // Fetch user info to get Discord user id
    const userinfoResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userinfoResp.ok) throw new UnauthorizedException('Failed to fetch Discord userinfo');
    const userinfo = await userinfoResp.json();
    const providerUserId = userinfo?.id as string | undefined;
    const username = userinfo?.username as string | undefined;

    if (!providerUserId) throw new UnauthorizedException('Missing Discord user id');

    // Fetch guilds (servers) the user has access to
    let guildsInfo = null;
    if (scopeStr?.includes('guilds')) {
      try {
        const guildsResp = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (guildsResp.ok) {
          guildsInfo = await guildsResp.json();
        }
      } catch (err) {
        // Non-critical, continue without guild info
        console.warn('Failed to fetch Discord guilds:', err);
      }
    }

    // Store the linked account with bot invitation information
    await this.store.linkExternalAccount({
      userId,
      provider: 'discord',
      providerUserId,
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : null,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      scopes: scopeStr ?? null,
      // Store additional metadata about the bot invitation
      metadata: {
        username,
        guildId,
        guilds: guildsInfo,
        invitedAt: new Date().toISOString(),
      } as any,
    });

    return { userId };
  }

  /**
   * Refresh the Discord access token using the stored refresh token.
   * This allows the bot to maintain access to the server even after the initial token expires.
   *
   * @param userId - Application user id
   * @returns New access token and expiry in seconds
   */
  async refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const account = await this.store.getLinkedAccount(userId, 'discord');
    if (!account || !account.refresh_token) throw new BadRequestException('No Discord refresh token stored');

    const refreshToken = this.crypto.decrypt(account.refresh_token);
    const clientId = this.config.get<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.config.get<string>('DISCORD_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new InternalServerErrorException('Discord OAuth not configured');

    const tokens = await this.http.postForm('https://discord.com/api/oauth2/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

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
   * This token can be used to make API calls to Discord on behalf of the bot.
   */
  async getCurrentAccessToken(userId: string): Promise<string> {
    const account = await this.store.getLinkedAccount(userId, 'discord');
    if (!account || !account.access_token) throw new BadRequestException('No Discord access token stored');
    return this.crypto.decrypt(account.access_token);
  }
}
