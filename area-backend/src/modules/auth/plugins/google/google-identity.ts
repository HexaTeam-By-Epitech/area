import { google } from 'googleapis';
import { Injectable, UnauthorizedException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IdentityProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore } from 'src/common/interfaces/crypto.type';

/**
 * Google identity plugin implementing ID token sign-in (One Tap) and OAuth code flow login.
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
   * Build the Google OAuth login URL (authorization code flow).
   * @param userId - Optional user ID for linking identity to existing user
   * @returns The URL to redirect the user to for login.
   */
  buildLoginUrl(userId?: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_IDENTITY_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      throw new InternalServerErrorException('Google identity OAuth not configured');
    }

    const scopes = ['openid', 'email', 'profile'].join(' ');
    const state = this.jwt.sign(
      { provider: 'google', mode: 'identity', userId: userId ?? null },
      { expiresIn: '10m' }
    );

    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
  }

  /**
   * Handle OAuth login callback for identity login (code flow).
   * Supports both:
   * - New user login/registration (when state.userId is null)
   * - Linking identity to existing user (when state.userId is present)
   *
   * @param code - Authorization code returned by Google
   * @param state - Optional signed state containing userId for linking
   * @returns The user id and email
   */
  async handleLoginCallback(code: string, state?: string): Promise<{ userId: string; email: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_IDENTITY_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Google identity OAuth not configured');
    }

    // Decode state to check if this is a linking flow
    const decoded = state ? (this.jwt.verify(state) as any) : null;
    const linkUserId = decoded?.userId as string | undefined;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) throw new UnauthorizedException('Google token exchange failed');
    const tokens = await tokenRes.json();
    const idToken = tokens.id_token as string | undefined;
    if (!idToken) throw new UnauthorizedException('No ID token returned');

    // Verify ID token and extract user info
    const oauth2 = new google.auth.OAuth2();
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

    // If linkUserId is present, link identity to existing user
    if (linkUserId) {
      const user = await this.store.linkIdentityToUser({
        userId: linkUserId,
        provider: 'google',
        providerUserId: sub,
        email,
        name,
        avatarUrl: picture,
      });
      return { userId: user.id, email: user.email };
    }

    // Otherwise, login or create new user
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
