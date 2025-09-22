import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    NotFoundException,
    Logger, InternalServerErrorException
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {UsersService} from '../users/users.service';
import {RedisService} from '../redis/redis.service';
import {EmailService} from '../email/email.service';
import {JwtService} from '@nestjs/jwt';
import {ConfigService} from '@nestjs/config';
import {google} from 'googleapis';


@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private redisService: RedisService,
        private emailService: EmailService,
        private readonly config: ConfigService,
        private readonly jwtService: JwtService
    ) {
    }

    /**
     * Registers a new user with the given email and password.
     * Creates an unverified user and sends a verification email.
     * Throws ConflictException if the email is already in use.
     * @param email - The user's email address
     * @param password - The user's plain password
     * @returns The created user object
     */
    async register(email: string, password: string) {
        // Check if the email is already registered
        const existing = await this.usersService.findByEmail(email);
        if (existing) {
            throw new ConflictException('Email already in use');
        }

        // Hash the password before saving
        const hash = await bcrypt.hash(password, 10);

        // Create user with is_verified set to false
        const user = await this.usersService.createUser({
            email,
            password_hash: hash,
            is_verified: false,
        });

        // Send verification email
        await this.sendVerificationEmail(email);
        this.logger.log(`User registered successfully: ${email}`);

        return user;
    }

    /**
     * Validates a user's credentials.
     * Throws UnauthorizedException if credentials are invalid or user is not verified.
     * @param email - The user's email address
     * @param password - The user's plain password
     * @returns The user object if validation succeeds
     */
    async validateUser(email: string, password: string) {
        // Find user by email
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user is verified
        if (!user.is_verified) {
            this.logger.warn(`Login attempt for unverified account: ${email}`);
            throw new UnauthorizedException('Account not verified. Please check your email for verification code.');
        }

        // Ensure the user has a password hash
        if (!user.password_hash) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Compare the provided password with the stored hash
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            this.logger.warn(`Invalid password attempt for: ${email}`);
            throw new UnauthorizedException('Invalid credentials');
        }

        this.logger.log(`User logged in successfully: ${email}`);
        return user;
    }

    /**
     * Sends a verification email with a 6-digit code
     * The code is stored in Redis with 10-minute expiration
     * @param email - Recipient email address
     */
    async sendVerificationEmail(email: string): Promise<void> {
        // Generate a 6-digit verification code
        const verificationCode = this.emailService.generateVerificationCode();

        // Store the code in Redis with 10-minute expiration (600 seconds)
        const redisKey = `verification:${email}`;
        await this.redisService.setVerificationCode(redisKey, verificationCode, 600);
        this.logger.log(`Verification code stored in Redis for: ${email}`);

        // Send the email with the code
        await this.emailService.sendVerificationEmail(email, verificationCode);
    }

    /**
     * Verifies a verification code for a given email
     * @param email - Email address to verify
     * @param verificationCode - 6-digit verification code
     * @returns true if verification succeeds, false otherwise
     */
    async verifyEmail(email: string, verificationCode: string): Promise<boolean> {
        // Retrieve the code stored in Redis
        const redisKey = `verification:${email}`;
        const storedCode = await this.redisService.getVerificationCode(redisKey);

        if (!storedCode) {
            this.logger.warn(`Verification attempt with expired/invalid code for: ${email}`);
            throw new BadRequestException('Verification code expired or invalid');
        }

        // Verify that the code matches
        if (storedCode !== verificationCode) {
            this.logger.warn(`Verification attempt with incorrect code for: ${email}`);
            throw new BadRequestException('Incorrect verification code');
        }

        // Find the user and mark as verified
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Update verification status
        await this.usersService.updateUser(user.id, {is_verified: true});
        this.logger.log(`User email verified successfully: ${email}`);

        // Remove the code from Redis after use
        await this.redisService.deleteVerificationCode(redisKey);
        this.logger.log(`Verification code removed from Redis for: ${email}`);

        return true;
    }

    /**
     * Resends a verification code for a given email
     * @param email - Email address to resend the code to
     */
    async resendVerificationEmail(email: string): Promise<void> {
        // Check that the user exists
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check that the user is not already verified
        if (user.is_verified) {
            this.logger.warn(`Resend verification requested for already verified account: ${email}`);
            throw new BadRequestException('This account is already verified');
        }

        // Send a new verification code
        await this.sendVerificationEmail(email);
        this.logger.log(`Verification email resent for: ${email}`);
    }

    /**
     * Verify a Google ID token coming from the frontend and sign-in/up the user.
     * Returns an application access token and basic profile info.
     */
    async signInWithGoogleIdToken(idToken: string): Promise<{ accessToken: string; userId: string; email: string }> {
        if (!idToken) {
            this.logger.warn('Google sign-in failed: missing idToken');
            throw new UnauthorizedException('Missing idToken');
        }

        const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
        if (!clientId) {
            this.logger.error('Google sign-in failed: GOOGLE_CLIENT_ID not configured');
            throw new UnauthorizedException('Google client not configured');
        }

        this.logger.debug(`Google sign-in attempt. GOOGLE_CLIENT_ID=${clientId.substring(0, 6)}... len=${clientId.length}`);

        const oauth2 = new google.auth.OAuth2();
        let payload: any;
        try {
            const ticket = await oauth2.verifyIdToken({
                idToken,
                audience: clientId,
            });
            payload = ticket.getPayload();
            this.logger.debug(`Google token verified. aud=${payload?.aud}, sub=${payload?.sub}, email=${payload?.email}, email_verified=${payload?.email_verified}`);
        } catch (e: any) {
            this.logger.error(`Google token verification error: ${e?.message ?? e}`, e?.stack);
            throw new UnauthorizedException('Invalid Google token');
        }

        if (!payload) {
            this.logger.error('Google token payload is empty after verification');
            throw new UnauthorizedException('Invalid Google token payload');
        }

        const sub = payload.sub as string;
        const email = payload.email as string | undefined;
        const emailVerified = payload.email_verified === true;
        const name = (payload.name as string) ?? '';
        const picture = (payload.picture as string) ?? '';

        if (!sub) {
            this.logger.warn('Google token missing subject (sub)');
            throw new UnauthorizedException('Google subject missing');
        }
        if (!email || !emailVerified) {
            this.logger.warn(`Google email not verified or missing. email=${email} verified=${emailVerified}`);
            throw new UnauthorizedException('Email not verified by Google');
        }

        this.logger.debug(`Upserting OAuth user. provider=google sub=${sub} email=${email}`);

        const user = await this.usersService.upsertOAuthUser({
            provider: 'google',
            providerId: 1,
            providerUserId: sub,
            email,
            name,
            avatarUrl: picture,
        });

        this.logger.debug(`OAuth user upserted. userId=${user.id}`);

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            provider: 'google',
        });

        this.logger.log(`Google sign-in successful for ${email} (userId=${user.id})`);

        return {accessToken, userId: user.id, email: user.email};
    }

    private get encKey() {
        const k = this.config.get<string>('TOKENS_ENC_KEY');
        if (!k) throw new InternalServerErrorException('TOKENS_ENC_KEY missing');
        return k;
    }

    private encrypt(plain: string): string {
        const key = Buffer.from(this.encKey);
        const buf = Buffer.from(plain, 'utf8');
        const out = Buffer.alloc(buf.length);
        for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key[i % key.length];
        return out.toString('base64');
    }

    decrypt(b64: string): string {
        const key = Buffer.from(this.encKey);
        const buf = Buffer.from(b64, 'base64');
        const out = Buffer.alloc(buf.length);
        for (let i = 0; i < buf.length; i++) out[i] = buf[i] ^ key[i % key.length];
        return out.toString('utf8');
    }

    buildGoogleAuthUrl(): string {
        const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
        const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
        if (!clientId || !redirectUri) {
            this.logger.error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
            throw new InternalServerErrorException('Google OAuth not configured');
        }
        const scopes = [
            'openid',
            'email',
            'profile',
        ].join(' ');
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

    async handleGoogleOAuthCallback(code: string): Promise<{ accessToken: string; userId: string; email: string }> {
        if (!code) {
            throw new BadRequestException('Missing code');
        }

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
            const result = await oauth2.getToken({code, redirect_uri: redirectUri});
            tokens = result.tokens;
        } catch (e: any) {
            this.logger.error(`Google token exchange failed: ${e?.message ?? e}`, e?.stack);
            throw new UnauthorizedException('Token exchange failed');
        }

        const idToken = tokens.id_token;
        if (!idToken) {
            this.logger.error('No id_token returned by Google');
            throw new UnauthorizedException('No id_token returned by Google');
        }

        let payload: any;
        try {
            const ticket = await oauth2.verifyIdToken({
                idToken,
                audience: clientId,
            });
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
            this.logger.warn(`Invalid Google payload. sub=${sub} email=${email} verified=${emailVerified}`);
            throw new UnauthorizedException('Google account not verified or payload invalid');
        }

        const accessTokenGoogle = tokens.access_token ?? null;
        const refreshTokenGoogle = tokens.refresh_token ?? null;

        let expiresIn: number | undefined;
        if (typeof tokens.expiry_date === 'number') {
            expiresIn = Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000));
        } else if (typeof (tokens as any).expires_in === 'number') {
            expiresIn = (tokens as any).expires_in as number;
        }

        const user = await this.usersService.upsertOAuthUser({
            provider: 'google',
            providerId: 1,
            providerUserId: sub,
            email,
            name,
            avatarUrl: picture,
            accessToken: accessTokenGoogle ? this.encrypt(accessTokenGoogle) : null,
            refreshToken: refreshTokenGoogle ? this.encrypt(refreshTokenGoogle) : null,
            accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        });

        const appJwt = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            provider: 'google',
        });

        this.logger.log(`Google OAuth code flow successful for ${email} (userId=${user.id})`);
        return {accessToken: appJwt, userId: user.id, email: user.email};
    }

    async refreshGoogleAccessToken(userId: string): Promise<{ googleAccessToken: string; expiresIn: number }> {
        if (!userId) throw new BadRequestException('Missing userId');

        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const account = await this.usersService.findUserOAuthAccount(userId, 'google');
        if (!account || !account.refresh_token) {
            throw new BadRequestException('No Google refresh token stored');
        }

        const refreshToken = this.decrypt(account.refresh_token);

        const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
        const oauth2 = new google.auth.OAuth2(clientId, clientSecret);

        oauth2.setCredentials({refresh_token: refreshToken});

        try {
            const {credentials} = await oauth2.refreshAccessToken();
            const newAccess = credentials.access_token!;
            let expiresIn = 0;
            if (typeof credentials.expiry_date === 'number') {
                expiresIn = Math.max(0, Math.floor((credentials.expiry_date - Date.now()) / 1000));
            } else if (typeof (credentials as any).expires_in === 'number') {
                expiresIn = (credentials as any).expires_in as number;
            }

            await this.usersService.updateOAuthTokens(userId, 'google', {
                accessToken: this.encrypt(newAccess),
                accessTokenExpiresAt: new Date(Date.now() + (expiresIn ?? 0) * 1000),
            });

            return {googleAccessToken: newAccess, expiresIn};
        } catch (e: any) {
            this.logger.error(`Failed to refresh Google access token: ${e?.message ?? e}`, e?.stack);
            throw new UnauthorizedException('Failed to refresh Google token');
        }
    }

    buildSpotifyAuthUrl(userId?: string): string {
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
            'user-top-read'
        ].join(' ');
        // Encode optional state with a short-lived JWT to carry userId safely
        let state: string | undefined;
        try {
            if (userId) {
                state = this.jwtService.sign({ provider: 'spotify', userId }, { expiresIn: '10m' });
            }
        } catch (e: any) {
            this.logger.warn(`Failed to sign Spotify state: ${e?.message ?? e}`);
        }

        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            scope: scopes,
            show_dialog: 'true'
        });
        if (state) params.set('state', state);
        const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
        this.logger.debug(`Spotify OAuth URL generated: ${url}`);
        return url;
    }

    async handleSpotifyOAuthCallback(code: string, state?: string): Promise<{ accessToken: string; userId: string; email: string }> {
        if (!code) {
            throw new BadRequestException('Missing code');
        }

        const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
        const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');
        const redirectUri = this.config.get<string>('SPOTIFY_REDIRECT_URI');
        if (!clientId || !clientSecret || !redirectUri) {
            this.logger.error('Spotify OAuth not configured (clientId/secret/redirectUri)');
            throw new InternalServerErrorException('Spotify OAuth not configured');
        }

        // Try to extract desired user from state
        let desiredUserId: string | undefined;
        if (state) {
            try {
                const payload: any = await this.jwtService.verifyAsync(state);
                if (payload?.provider === 'spotify' && typeof payload?.userId === 'string') {
                    desiredUserId = payload.userId;
                }
            } catch (e: any) {
                this.logger.warn(`Invalid Spotify state JWT: ${e?.message ?? e}`);
            }
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri
            })
        });

        if (!tokenResponse.ok) {
            this.logger.error(`Spotify token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
            throw new UnauthorizedException('Token exchange failed');
        }

        const tokens = await tokenResponse.json();
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        const expiresIn = tokens.expires_in;

        if (!accessToken) {
            this.logger.error('No access_token returned by Spotify');
            throw new UnauthorizedException('No access_token returned by Spotify');
        }

        // Get user profile from Spotify
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!profileResponse.ok) {
            this.logger.error(`Failed to fetch Spotify profile: ${profileResponse.status} ${profileResponse.statusText}`);
            throw new UnauthorizedException('Failed to fetch Spotify profile');
        }

        const profile = await profileResponse.json();
        const spotifyId = profile.id;
        const email = profile.email;
        const name = profile.display_name || '';
        const avatarUrl = profile.images?.[0]?.url || '';

        if (!spotifyId || !email) {
            this.logger.warn(`Invalid Spotify profile. id=${spotifyId} email=${email}`);
            throw new UnauthorizedException('Spotify profile invalid or email not available');
        }

        const user = await this.usersService.upsertOAuthUser({
            provider: 'spotify',
            providerId: 2, // Assuming 2 is the ID for Spotify in your providers table
            providerUserId: spotifyId,
            email,
            name,
            avatarUrl,
            accessToken: this.encrypt(accessToken),
            refreshToken: refreshToken ? this.encrypt(refreshToken) : null,
            accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
            targetUserId: desiredUserId,
        });

        const appJwt = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            provider: 'spotify',
        });

        this.logger.log(`Spotify OAuth code flow successful for ${email} (userId=${user.id})`);
        return {accessToken: appJwt, userId: user.id, email: user.email};
    }

    async refreshSpotifyAccessToken(userId: string): Promise<{ spotifyAccessToken: string; expiresIn: number }> {
        if (!userId) throw new BadRequestException('Missing userId');

        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        const account = await this.usersService.findUserOAuthAccount(userId, 'spotify');
        if (!account || !account.refresh_token) {
            throw new BadRequestException('No Spotify refresh token stored');
        }

        const refreshToken = this.decrypt(account.refresh_token);

        const clientId = this.config.get<string>('SPOTIFY_CLIENT_ID');
        const clientSecret = this.config.get<string>('SPOTIFY_CLIENT_SECRET');

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const tokens = await response.json();
            const newAccessToken = tokens.access_token;
            const expiresIn = tokens.expires_in || 3600;

            await this.usersService.updateOAuthTokens(userId, 'spotify', {
                accessToken: this.encrypt(newAccessToken),
                accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
            });

            return {spotifyAccessToken: newAccessToken, expiresIn};
        } catch (e: any) {
            this.logger.error(`Failed to refresh Spotify access token: ${e?.message ?? e}`, e?.stack);
            throw new UnauthorizedException('Failed to refresh Spotify token');
        }
    }
}
