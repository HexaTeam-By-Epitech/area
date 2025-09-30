import { OAuth2LinkProvider } from './OAuth2LinkProvider';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService, ProviderKey } from '../../../users/users.service';
import { UnauthorizedException, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { TokenCryptoUtil } from '../TokenCryptoUtil';

/**
 * Spotify OAuth linker that connects a Spotify account to an existing user.
 * Builds the consent URL, exchanges authorization code, persists encrypted
 * tokens, and links the account to the provided user.
 */
export class SpotifyOAuthLinkProvider implements OAuth2LinkProvider {
  private readonly logger = new Logger(SpotifyOAuthLinkProvider.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly crypto: TokenCryptoUtil,
  ) {}

  /**
   * Build the Spotify consent URL for linking to an existing user.
   * @param userId - Target application user id (embedded in signed state)
   * @param _scopesCsv - Optional scopes (unused; defaults are applied)
   */
  buildAuthUrl(userId: string, _scopesCsv?: string): string {
    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const redirectUri = this.config.get<string>('SPOTIFY_REDIRECT_URI');
    if (!clientId || !redirectUri) {
      this.logger.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI');
      throw new InternalServerErrorException('Spotify OAuth not configured');
    }
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-library-modify',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-top-read',
    ].join(' ');

    // state carries userId for linking
    let state: string | undefined;
    try {
      if (userId) {
        state = this.jwtService.sign({ provider: ProviderKey.Spotify, userId }, { expiresIn: '10m' });
      }
    } catch (e: any) {
      this.logger.warn(`Failed to sign Spotify state: ${e?.message ?? e}`);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      show_dialog: 'true',
    });
    if (state) params.set('state', state);
    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    this.logger.debug(`Spotify OAuth URL generated: ${url}`);
    return url;
  }

  /**
   * Handle the linking callback: exchange the code for tokens, fetch Spotify
   * profile to obtain provider user id, and upsert encrypted tokens.
   * @param code - Authorization code returned by Spotify
   * @param state - Signed state containing userId
   */
  async handleLinkCallback(code: string, state?: string): Promise<{ userId: string; provider: string }> {
    if (!code) throw new BadRequestException('Missing code');

    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('SPOTIFY_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      this.logger.error('Spotify OAuth not configured (clientId/secret/redirectUri)');
      throw new InternalServerErrorException('Spotify OAuth not configured');
    }

    // Extract desired user from state (mandatory for linking)
    let desiredUserId: string | undefined;
    if (state) {
      try {
        const payload: any = await this.jwtService.verifyAsync(state);
        if (payload?.provider === ProviderKey.Spotify && typeof payload?.userId === 'string') {
          desiredUserId = payload.userId;
        }
      } catch (e: any) {
        this.logger.warn(`Invalid Spotify state JWT: ${e?.message ?? e}`);
      }
    }
    if (!desiredUserId) throw new BadRequestException('Missing userId in state for Spotify linking');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      this.logger.error(`Spotify token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
      throw new UnauthorizedException('Token exchange failed');
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token as string | undefined;
    const refreshToken = tokens.refresh_token as string | undefined;
    const expiresIn = tokens.expires_in as number | undefined;

    if (!accessToken) {
      this.logger.error('No access_token returned by Spotify');
      throw new UnauthorizedException('No access_token returned by Spotify');
    }

    // Get user profile from Spotify
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) {
      this.logger.error(`Failed to fetch Spotify profile: ${profileResponse.status} ${profileResponse.statusText}`);
      throw new UnauthorizedException('Failed to fetch Spotify profile');
    }
    const profile = await profileResponse.json();
    const spotifyId = profile.id as string | undefined;
    const email = profile.email as string | undefined;

    if (!spotifyId || !email) {
      this.logger.warn(`Invalid Spotify profile. id=${spotifyId} email=${email}`);
      throw new UnauthorizedException('Spotify profile invalid or email not available');
    }

    // Link Spotify account to the specified existing user
    await this.usersService.linkExternalAccount({
      userId: desiredUserId,
      provider: ProviderKey.Spotify,
      providerUserId: spotifyId,
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : null,
      accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      scopes: (tokens.scope as string) ?? null,
    });

    return { userId: desiredUserId, provider: ProviderKey.Spotify };
  }
}
