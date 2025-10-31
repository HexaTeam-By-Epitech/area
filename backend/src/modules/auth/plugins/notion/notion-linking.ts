import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LinkingProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore, TokenCrypto } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../core/oauth2-client';

/**
 * Notion linking plugin for connecting a Notion workspace to an existing user.
 * Builds consent URL, handles callback to persist encrypted tokens, and
 * supports token refresh and access token retrieval.
 */
@Injectable()
export class NotionLinking implements LinkingProvider {
  readonly key = 'notion' as const;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: TokenStore,
    private readonly crypto: TokenCrypto,
    private readonly http: OAuth2Client,
  ) {}

  /**
   * Build the Notion consent URL for linking a Notion workspace to a user.
   * This will redirect the user to Notion to authorize the integration.
   * @param params.userId - Target application user id (signed into state)
   * @param params.scopes - Optional list of scopes (Notion doesn't use traditional scopes)
   * @param params.mobile - Optional flag to indicate mobile app flow
   */
  buildLinkUrl(params: { userId: string; scopes?: string[]; mobile?: boolean }): string {
    const clientId = this.config.get<string>('NOTION_CLIENT_ID');
    const redirectUri = this.config.get<string>('NOTION_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Notion OAuth not configured');
    }
    if (!params.userId) throw new BadRequestException('userId is required for linking');

    const state = this.jwt.sign(
      { provider: 'notion', mode: 'link', userId: params.userId, mobile: params.mobile },
      { expiresIn: '10m' }
    );

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      owner: 'user',
      state,
    });

    return `https://api.notion.com/v1/oauth/authorize?${q.toString()}`;
  }

  /**
   * Handle the OAuth linking callback and store encrypted access token.
   * Notion OAuth tokens don't expire, so no refresh token is needed.
   * @param code - Authorization code returned by Notion
   * @param state - Signed state containing user id
   * @returns The linked user id
   */
  async handleLinkCallback(code: string, state?: string): Promise<{ userId: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('NOTION_CLIENT_ID');
    const clientSecret = this.config.get<string>('NOTION_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('NOTION_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Notion OAuth not configured');
    }

    const decoded = state ? (this.jwt.verify(state) as any) : null;
    const userId = decoded?.userId as string | undefined;
    if (!userId) throw new BadRequestException('Invalid state: userId missing');

    // Exchange code for access token
    // Notion uses Basic Auth with client_id:client_secret encoded in base64
    // and expects JSON body, not form-urlencoded
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '');
      throw new BadRequestException(`Notion token exchange failed: ${errorText}`);
    }

    const tokenRes = await tokenResponse.json();

    const accessToken = tokenRes.access_token as string | undefined;
    const workspaceId = tokenRes.workspace_id as string | undefined;
    const botId = tokenRes.bot_id as string | undefined;
    
    if (!accessToken) throw new BadRequestException('Notion token exchange failed');

    // Use workspace_id as providerUserId, or bot_id if workspace_id is not available
    const providerUserId = workspaceId || botId || 'notion-workspace';

    // Notion tokens don't expire, so we set a far future date
    await this.store.linkExternalAccount({
      userId,
      provider: 'notion',
      providerUserId,
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: null, // Notion doesn't provide refresh tokens
      accessTokenExpiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
    });

    return { userId };
  }

  /**
   * Refresh the Notion access token.
   * Note: Notion access tokens don't expire, so this method just returns the existing token.
   * @param userId - Application user id
   * @returns Current access token with a long expiry
   */
  async refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const account = await this.store.getLinkedAccount(userId, 'notion');
    if (!account || !account.access_token) {
      throw new BadRequestException('No Notion access token stored');
    }

    const accessToken = this.crypto.decrypt(account.access_token);
    // Return a very long expiry since Notion tokens don't expire
    return { accessToken, expiresIn: 100 * 365 * 24 * 60 * 60 }; // 100 years in seconds
  }

  /**
   * Retrieve and decrypt the current Notion access token for the user.
   */
  async getCurrentAccessToken(userId: string): Promise<string> {
    const account = await this.store.getLinkedAccount(userId, 'notion');
    if (!account || !account.access_token) {
      throw new BadRequestException('No Notion access token stored');
    }
    return this.crypto.decrypt(account.access_token);
  }
}

