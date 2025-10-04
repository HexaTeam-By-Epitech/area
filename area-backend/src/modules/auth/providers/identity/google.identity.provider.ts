import { google } from 'googleapis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../../users/users.service';
import { ProviderKeyEnum as ProviderKey } from 'src/common/interfaces/oauth2.type';
import { UnauthorizedException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';

/**
 * Legacy Google Identity provider supporting both ID token sign-in and
 * Authorization Code login flow. Persists/links users via `UsersService`.
 */
export class GoogleIdentityProvider {
  private readonly logger = new Logger(GoogleIdentityProvider.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Build the Google Authorization URL to initiate the login (code) flow.
   * @returns Redirect URL to Google consent screen.
   */
  buildAuthUrl(): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      this.logger.error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
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
    this.logger.debug(`Google OAuth URL generated: ${url}`);
    return url;
  }

  /**
   * Verify a Google ID token and upsert identity for login.
   * @param idToken - ID token obtained from Google
   * @returns App access token, user id, and email
   */
  async signInWithIdToken(idToken: string): Promise<{ accessToken: string; userId: string; email: string }> {
    if (!idToken) {
      this.logger.warn('Google sign-in failed: missing idToken');
      throw new UnauthorizedException('Missing idToken');
    }
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      this.logger.error('Google sign-in failed: GOOGLE_CLIENT_ID not configured');
      throw new UnauthorizedException('Google client not configured');
    }

    const oauth2 = new google.auth.OAuth2();
    let payload: any;
    try {
      const ticket = await oauth2.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch (e: any) {
      this.logger.error(`Google token verification error: ${e?.message ?? e}`, e?.stack);
      throw new UnauthorizedException('Invalid Google token');
    }
    if (!payload) throw new UnauthorizedException('Invalid Google token payload');

    const sub = payload.sub as string;
    const email = payload.email as string | undefined;
    const emailVerified = payload.email_verified === true;
    const name = (payload.name as string) ?? '';
    const picture = (payload.picture as string) ?? '';

    if (!sub) throw new UnauthorizedException('Google subject missing');
    if (!email || !emailVerified) throw new UnauthorizedException('Email not verified by Google');

    const user = await this.usersService.upsertIdentityForLogin({
      provider: ProviderKey.Google,
      providerUserId: sub,
      email,
      name,
      avatarUrl: picture,
    });

    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, provider: ProviderKey.Google });
    return { accessToken, userId: user.id, email: user.email };
  }

  /**
   * Handle the Authorization Code login callback: exchanges code, verifies id_token,
   * upserts identity, and returns app JWT and user info.
   * @param code - Authorization code from Google
   */
  async handleLoginCallback(code: string): Promise<{ accessToken: string; userId: string; email: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
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

    if (!sub || !email || !emailVerified) throw new UnauthorizedException('Google account not verified or payload invalid');

    const user = await this.usersService.upsertIdentityForLogin({
      provider: ProviderKey.Google,
      providerUserId: sub,
      email,
      name,
      avatarUrl: picture,
    });

    const appJwt = await this.jwtService.signAsync({ sub: user.id, email: user.email, provider: ProviderKey.Google });
    return { accessToken: appJwt, userId: user.id, email: user.email };
  }
}
