import { Injectable, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LinkingProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore, TokenCrypto } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../core/oauth2-client';

/**
 * Google linking plugin for connecting a Google account to an existing user.
 * Builds consent URL, handles callback to persist encrypted tokens, and
 * supports token refresh and access token retrieval.
 */
@Injectable()
export class GoogleLinking implements LinkingProvider {
  readonly key = 'google' as const;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: TokenStore,
    private readonly crypto: TokenCrypto,
    private readonly http: OAuth2Client,
  ) {}

  /**
   * Build the Google consent URL for linking a provider account to a user.
   * @param params.userId - Target application user id (signed into state)
   * @param params.scopes - Optional list of scopes, defaults to basic + Gmail/Calendar read.
   * @param params.mobile - Optional flag to indicate mobile app flow
   */
  buildLinkUrl(params: { userId: string; scopes?: string[]; mobile?: boolean }): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Google OAuth not configured');
    }
    if (!params.userId) throw new BadRequestException('userId is required for linking');

    const scopes = (params.scopes && params.scopes.length
      ? params.scopes
      : [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/calendar.readonly',
        ]).join(' ');

    const state = this.jwt.sign({ provider: 'google', mode: 'link', userId: params.userId, mobile: params.mobile }, { expiresIn: '10m' });

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
  }

  /**
   * Handle the OAuth linking callback and store encrypted access/refresh tokens.
   * @param code - Authorization code returned by Google
   * @param state - Signed state containing user id
   * @returns The linked user id
   */
  async handleLinkCallback(code: string, state?: string): Promise<{ userId: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Google OAuth not configured');
    }

    const decoded = state ? (this.jwt.verify(state) as any) : null;
    const userId = decoded?.userId as string | undefined;
    if (!userId) throw new BadRequestException('Invalid state: userId missing');

    const tokenRes = await this.http.postForm('https://oauth2.googleapis.com/token', {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const accessToken = tokenRes.access_token as string | undefined;
    const refreshToken = tokenRes.refresh_token as string | undefined;
    const expiresIn = (tokenRes.expires_in as number | undefined) ?? 3600;
    const scopeStr = tokenRes.scope as string | undefined;
    if (!accessToken) throw new UnauthorizedException('Google token exchange failed');

    // Fetch user info to get provider user id (sub)
    const userinfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userinfoResp.ok) throw new UnauthorizedException('Failed to fetch Google userinfo');
    const userinfo = await userinfoResp.json();
    const providerUserId = userinfo?.sub as string | undefined;
    if (!providerUserId) throw new UnauthorizedException('Missing Google subject');

    await this.store.linkExternalAccount({
      userId,
      provider: 'google',
      providerUserId,
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : null,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      scopes: scopeStr ?? null,
    });

    return { userId };
  }

  /**
   * Refresh the Google access token using the stored refresh token.
   * @param userId - Application user id
   * @returns New access token and expiry in seconds
   */
  async refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const account = await this.store.getLinkedAccount(userId, 'google');
    if (!account || !account.refresh_token) throw new BadRequestException('No Google refresh token stored');

    const refreshToken = this.crypto.decrypt(account.refresh_token);
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new InternalServerErrorException('Google OAuth not configured');

    const tokens = await this.http.postForm('https://oauth2.googleapis.com/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const newAccessToken = tokens.access_token as string;
    const expiresIn = (tokens.expires_in as number | undefined) ?? 3600;

    await this.store.updateLinkedTokens(userId, 'google', {
      accessToken: this.crypto.encrypt(newAccessToken),
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    return { accessToken: newAccessToken, expiresIn };
  }

  /**
   * Retrieve and decrypt the current Google access token for the user.
   */
  async getCurrentAccessToken(userId: string): Promise<string> {
    const account = await this.store.getLinkedAccount(userId, 'google');
    if (!account || !account.access_token) throw new BadRequestException('No Google access token stored');
    return this.crypto.decrypt(account.access_token);
  }
}
