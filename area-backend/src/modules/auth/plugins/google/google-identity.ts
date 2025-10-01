import { google } from 'googleapis';
import { Injectable, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
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
}
