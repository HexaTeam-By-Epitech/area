import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LinkingProvider } from '../../../../common/interfaces/oauth2.type';
import type { TokenStore, TokenCrypto } from 'src/common/interfaces/crypto.type';
import { OAuth2Client } from '../../core/oauth2-client';

/**
 * Spotify linking plugin for connecting a Spotify account to an existing user.
 * Builds consent URL, handles callback to persist encrypted tokens, and
 * supports token refresh and access token retrieval.
 */
@Injectable()
export class SpotifyLinking implements LinkingProvider {
  readonly key = 'spotify' as const;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly store: TokenStore,
    private readonly crypto: TokenCrypto,
    private readonly http: OAuth2Client,
  ) {}

  /**
   * Build the Spotify consent URL for linking a provider account to a user.
   * @param params.userId - Target application user id (signed into state)
   * @param params.scopes - Optional list of scopes; defaults cover common Spotify permissions.
   * @param params.mobile - Optional flag to indicate mobile app flow
   */
  buildLinkUrl(params: { userId: string; scopes?: string[]; mobile?: boolean }): string {
    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const redirectUri = this.config.get<string>('SPOTIFY_REDIRECT_URI');
    if (!clientId || !redirectUri) throw new InternalServerErrorException('Spotify OAuth not configured');
    if (!params.userId) throw new BadRequestException('userId is required for linking');

    const state = this.jwt.sign({ provider: 'spotify', mode: 'link', userId: params.userId, mobile: params.mobile }, { expiresIn: '10m' });
    const scopes = (params.scopes && params.scopes.length ? params.scopes : [
      'user-read-private','user-read-email',
      'playlist-read-private','playlist-read-collaborative','playlist-modify-public','playlist-modify-private',
      'user-library-read','user-library-modify',
      'user-read-playback-state','user-modify-playback-state',
      'user-read-currently-playing','user-read-recently-played',
      'user-top-read',
    ]).join(' ');

    const q = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      show_dialog: 'true',
    });
    return `https://accounts.spotify.com/authorize?${q.toString()}`;
  }

  /**
   * Handle the OAuth linking callback and store encrypted access/refresh tokens.
   * @param code - Authorization code returned by Spotify
   * @param state - Signed state containing user id
   * @returns The linked user id
   */
  async handleLinkCallback(code: string, state?: string): Promise<{ userId: string }> {
    if (!code) throw new BadRequestException('Missing code');
    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('SPOTIFY_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) throw new InternalServerErrorException('Spotify OAuth not configured');

    const decoded = state ? this.jwt.verify(state) as any : null;
    const userId = decoded?.userId as string | undefined;
    if (!userId) throw new BadRequestException('Invalid state: userId missing');

    const tokenRes = await this.http.postForm('https://accounts.spotify.com/api/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      },
      { 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
    );

    const accessToken = tokenRes.access_token as string;
    const refreshToken = tokenRes.refresh_token as string | undefined;
    const expiresIn = (tokenRes.expires_in as number | undefined) ?? 3600;

    // Get profile to retrieve provider user id
    const profileResp = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!profileResp.ok) throw new Error(`Spotify profile HTTP ${profileResp.status}`);
    const profile = await profileResp.json();
    const providerUserId = profile?.id as string;

    await this.store.linkExternalAccount({
      userId,
      provider: 'spotify',
      providerUserId,
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: refreshToken ? this.crypto.encrypt(refreshToken) : null,
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    return { userId };
  }

  /**
   * Refresh the Spotify access token using the stored refresh token.
   * @param userId - Application user id
   * @returns New access token and expiry in seconds
   */
  async refreshAccessToken(userId: string): Promise<{ accessToken: string; expiresIn: number }> {
    const account = await this.store.getLinkedAccount(userId, 'spotify');
    if (!account || !account.refresh_token) throw new BadRequestException('No Spotify refresh token stored');

    const refreshToken = this.crypto.decrypt(account.refresh_token);
    const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
    const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new InternalServerErrorException('Spotify OAuth not configured');

    const tokens = await this.http.postForm('https://accounts.spotify.com/api/token',
      { grant_type: 'refresh_token', refresh_token: refreshToken },
      { 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
    );

    const newAccessToken = tokens.access_token as string;
    const expiresIn = (tokens.expires_in as number | undefined) ?? 3600;

    await this.store.updateLinkedTokens(userId, 'spotify', {
      accessToken: this.crypto.encrypt(newAccessToken),
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    return { accessToken: newAccessToken, expiresIn };
  }

  /**
   * Retrieve and decrypt the current Spotify access token for the user.
   */
  async getCurrentAccessToken(userId: string): Promise<string> {
    const account = await this.store.getLinkedAccount(userId, 'spotify');
    if (!account || !account.access_token) throw new BadRequestException('No Spotify access token stored');
    return this.crypto.decrypt(account.access_token);
  }
}
