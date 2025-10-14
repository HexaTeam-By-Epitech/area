import { OAuth2LinkProvider } from './link.provider';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../../users/users.service';
import { ProviderKeyEnum as ProviderKey } from 'src/common/interfaces/oauth2.type';
import { UnauthorizedException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { AesGcmTokenCrypto } from '../../core/token-crypto';

/**
 * Google OAuth linker that connects a Google account to an existing user.
 *
 * Handles building the consent URL, exchanging the authorization code for
 * tokens, persisting encrypted tokens, and refreshing/retrieving access tokens.
 */
export class GoogleOAuthLinkProvider implements OAuth2LinkProvider {
  private readonly logger = new Logger(GoogleOAuthLinkProvider.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly crypto: AesGcmTokenCrypto,
  ) {}

  /**
   * Build the Google consent URL for linking to an existing user.
   * @param userId - Target application user ID (embedded in signed state)
   * @param scopesCsv - Optional comma-separated scopes. Defaults to basic + Gmail/Calendar read.
   */
  buildAuthUrl(userId: string, scopesCsv?: string): string {
    if (!userId) throw new BadRequestException('userId is required for linking');
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      this.logger.error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
      throw new InternalServerErrorException('Google OAuth not configured');
    }
    const scopes = (scopesCsv && scopesCsv.length
      ? scopesCsv.split(',')
      : [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/calendar.readonly',
        ]).join(' ');
    const state = this.jwtService.sign({ provider: ProviderKey.Google, mode: 'link', userId }, { expiresIn: '10m' });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle the linking callback: exchange code, verify id_token to get the
   * Google subject, and upsert encrypted tokens into `linked_accounts`.
   * @param code - Authorization code returned by Google
   * @param state - Signed state containing userId
   * @returns The linked user id and provider key
   */
  async handleLinkCallback(code: string, state?: string): Promise<{ userId: string; provider: string }> {
    if (!code) throw new BadRequestException('Missing code');
    if (!state) throw new BadRequestException('Missing state');

    let desiredUserId: string | undefined;
    try {
      const payload: any = await this.jwtService.verifyAsync(state);
      if (payload?.provider === ProviderKey.Google && payload?.mode === 'link' && typeof payload?.userId === 'string') {
        desiredUserId = payload.userId;
      }
    } catch (e: any) {
      this.logger.warn(`Invalid Google link state JWT: ${e?.message ?? e}`);
    }
    if (!desiredUserId) throw new BadRequestException('Invalid or missing userId in state');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error('Google OAuth not configured (clientId/secret/redirectUri)');
      throw new InternalServerErrorException('Google OAuth not configured');
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    let tokens: any;
    try {
      const result = await oauth2.getToken({ code, redirect_uri: redirectUri });
      tokens = result.tokens;
    } catch (e: any) {
      this.logger.error(`Google token exchange failed: ${e?.message ?? e}`, e?.stack);
      throw new UnauthorizedException('Token exchange failed');
    }

    const accessTokenGoogle = tokens.access_token ?? null;
    const refreshTokenGoogle = tokens.refresh_token ?? null;
    let expiresIn: number | undefined;
    if (typeof tokens.expiry_date === 'number') {
      expiresIn = Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000));
    } else if (typeof (tokens as any).expires_in === 'number') {
      expiresIn = (tokens as any).expires_in as number;
    }

    // Retrieve Google user info to obtain provider_user_id
    const idToken = tokens.id_token;
    let providerUserId = '';
    if (idToken) {
      try {
        const ticket = await oauth2.verifyIdToken({ idToken, audience: clientId });
        const payload = ticket.getPayload();
        providerUserId = (payload?.sub as string) || '';
      } catch (e: any) {
        this.logger.warn(`Failed to verify Google id_token for linking: ${e?.message ?? e}`);
      }
    }

    if (!accessTokenGoogle || !refreshTokenGoogle) {
      throw new UnauthorizedException('Google did not return access/refresh tokens');
    }

    await this.usersService.linkExternalAccount({
      userId: desiredUserId,
      provider: ProviderKey.Google,
      providerUserId: providerUserId || 'google-link',
      accessToken: this.crypto.encrypt(accessTokenGoogle),
      refreshToken: this.crypto.encrypt(refreshTokenGoogle),
      accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      scopes: (tokens.scope as string) ?? null,
    });

    return { userId: desiredUserId, provider: ProviderKey.Google };
  }
}
