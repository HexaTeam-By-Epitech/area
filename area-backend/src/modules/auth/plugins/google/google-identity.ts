import { google } from 'googleapis';
import { Injectable, UnauthorizedException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IdentityProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore } from 'src/common/interfaces/crypto.type';

/**
 * Google identity plugin implementing ID token sign-in (One Tap or similar).
 */
@Injectable()
export class GoogleIdentity implements IdentityProvider {
  readonly key = 'google' as const;
  private readonly logger = new Logger(GoogleIdentity.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: TokenStore,
  ) {}

  /**
   * Verify a Google ID token and upsert the corresponding identity into the store.
   * Returns the application user id and email.
   */
  async signInWithIdToken(idToken: string): Promise<{ userId: string; email: string }> {
    if (!idToken) throw new UnauthorizedException('Missing idToken');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) throw new InternalServerErrorException('Google client not configured');

    const oauth2 = new google.auth.OAuth2();
    try {
      const ticket = await oauth2.verifyIdToken({ idToken, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload) throw new UnauthorizedException('Invalid Google token payload');

      const sub = payload.sub as string;
      const email = payload.email as string | undefined;
      const emailVerified = payload.email_verified === true;
      const name = (payload.name as string) ?? '';
      const picture = (payload.picture as string) ?? '';

      if (!sub) throw new UnauthorizedException('Google subject missing');
      if (!email || !emailVerified) throw new UnauthorizedException('Email not verified by Google');

      const user = await this.store.upsertIdentityForLogin({
        provider: 'google',
        providerUserId: sub,
        email,
        name,
        avatarUrl: picture,
      });

      return { userId: user.id, email: user.email };
    } catch (e: any) {
      this.logger.error(`Google token verification error: ${e?.message ?? e}`, e?.stack);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /**
   * Build the Google Authorization URL to initiate the login (code) flow.
   * NOTE: We keep this minimal (no state) but could later embed a signed state for CSRF.
   */
  buildLoginUrl(): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_LOGIN_REDIRECT_URI') || this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      this.logger.error('Missing GOOGLE_CLIENT_ID or redirect URI (GOOGLE_LOGIN_REDIRECT_URI / GOOGLE_REDIRECT_URI)');
      throw new InternalServerErrorException('Google OAuth not configured');
    }
    const scopes = ['openid', 'email', 'profile'].join(' ');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    this.logger.debug(`Google login URL generated: ${url}`);
    return url;
  }

  /**
   * Handle the Authorization Code login callback: exchanges code, verifies id_token,
   * upserts identity, and returns user identity info (userId/email). The AuthService
   * wraps this into an application JWT.
   */
  async handleLoginCallback(code: string, _state?: string): Promise<{ userId: string; email: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_LOGIN_REDIRECT_URI') || this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error('Google OAuth not configured (clientId/secret/redirectUri)');
      throw new InternalServerErrorException('Google OAuth not configured');
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    let tokens;
    try {
      const result = await oauth2.getToken({ code, redirect_uri: redirectUri });
      tokens = result.tokens;
    } catch (e: any) {
      this.logger.error(`Google token exchange failed: ${e?.message ?? e}`, e?.stack);
      throw new UnauthorizedException('Token exchange failed');
    }

    const idToken = tokens.id_token;
    if (!idToken) throw new UnauthorizedException('No id_token returned by Google');

    let payload: any;
    try {
      const ticket = await oauth2.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch (e: any) {
      this.logger.error(`Invalid id_token from Google: ${e?.message ?? e}`);
      throw new UnauthorizedException('Invalid id_token from Google');
    }

    const sub = payload?.sub as string | undefined;
    const email = payload?.email as string | undefined;
    const emailVerified = payload?.email_verified === true;
    const name = (payload?.name as string) ?? '';
    const picture = (payload?.picture as string) ?? '';

    if (!sub || !email || !emailVerified) {
      throw new UnauthorizedException('Google account not verified or payload invalid');
    }

    const user = await this.store.upsertIdentityForLogin({
      provider: 'google',
      providerUserId: sub,
      email,
      name,
      avatarUrl: picture,
    });

    return { userId: user.id, email: user.email };
  }
}
