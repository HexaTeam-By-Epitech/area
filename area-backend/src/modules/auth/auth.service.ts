import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    NotFoundException,
    Logger,
    InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {UsersService} from '../users/users.service';
import {RedisService} from '../redis/redis.service';
import {EmailService} from '../email/email.service';
import {JwtService} from '@nestjs/jwt';
import {ConfigService} from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { ProviderRegistryImpl } from './core/provider-registry-impl';
import type { ProviderKey } from '../../common/interfaces/oauth2.type';
import { PrismaTokenStore } from './core/token-store';
import { AesGcmTokenCrypto } from './core/token-crypto';
import { OAuth2Client } from './core/oauth2-client';
import { GoogleIdentity } from './plugins/google/google-identity';
import { GoogleLinking } from './plugins/google/google-linking';
import { SpotifyLinking } from './plugins/spotify/spotify-linking';

/**
 * Authentication service handling email/password flows, verification,
 * and pluggable OAuth/OIDC identity + linking workflows (Google, Spotify, ...).
 *
 * Exposes helpers to build/login/link URLs, handle callbacks, refresh tokens,
 * and perform provider API requests with automatic refresh.
 */
@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private redisService: RedisService,
        private emailService: EmailService,
        private readonly config: ConfigService,
        private readonly jwtService: JwtService,
        private readonly cryptoSvc: AesGcmTokenCrypto,
        private readonly tokenStore: PrismaTokenStore,
        private readonly http: OAuth2Client,
    ) {}

    /**
     * Provider registry composed at runtime (lazy). Registers built-in plugins
     * for Google and Spotify using the configured TokenStore/Crypto/HTTP.
     */
    private get providers() {
        if (!(this as any)._providers) {
            const reg = new ProviderRegistryImpl();
            // Register built-in plugins
            reg.addIdentity(new GoogleIdentity(this.config, this.jwtService, this.tokenStore));
            reg.addLinking(new GoogleLinking(this.config, this.jwtService, this.tokenStore, this.cryptoSvc, this.http));
            reg.addLinking(new SpotifyLinking(this.config, this.jwtService, this.tokenStore, this.cryptoSvc, this.http));
            (this as any)._providers = reg;
        }
        return (this as any)._providers as ProviderRegistryImpl;
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
     * Validates a user's credentials and generates a JWT token.
     * Throws UnauthorizedException if credentials are invalid or user is not verified.
     * @param email - The user's email address
     * @param password - The user's plain password
     * @returns JWT access token and user info
     */
    async validateUser(email: string, password: string): Promise<{ accessToken: string; userId: string; email: string }> {
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

        // Generate JWT token
        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
            provider: 'email',
        });

        return {
            accessToken,
            userId: user.id,
            email: user.email,
        };
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
     * Generic identity login via ID token (e.g., Google One Tap).
     * @param provider - Provider key (e.g., 'google')
     * @param idToken - Provider-issued ID token
     * @returns Application JWT and user info
     */
    async signInWithIdToken(provider: ProviderKey, idToken: string): Promise<{ accessToken: string; userId: string; email: string }> {
        const p = this.providers.getIdentity(provider);
        if (!p || !p.signInWithIdToken) throw new BadRequestException(`Provider ${provider} does not support id-token sign-in`);
        const { userId, email } = await p.signInWithIdToken(idToken);
        const appJwt = await this.jwtService.signAsync({ sub: userId, email, provider });
        return { accessToken: appJwt, userId, email };
    }

    // Generic URL builders
    buildAuthUrl(provider: ProviderKey, opts: { userId: string; scopes?: string[] }): string {
        const p = this.providers.getLinking(provider);
        if (!p) throw new BadRequestException(`Linking not supported for provider ${provider}`);
        return p.buildLinkUrl({ userId: opts.userId, scopes: opts.scopes });
    }

    /** Build an OAuth login URL for the provider (code flow). */
    buildLoginUrl(provider: ProviderKey): string {
        const p = this.providers.getIdentity(provider);
        if (!p || !p.buildLoginUrl) throw new BadRequestException(`Login URL not supported for provider ${provider}`);
        return p.buildLoginUrl();
    }

    /** Handle provider login callback (code flow) and issue an application JWT. */
    async handleLoginCallback(provider: ProviderKey, code: string, state?: string): Promise<{ accessToken: string; userId: string; email: string }> {
        const p = this.providers.getIdentity(provider);
        if (!p || !p.handleLoginCallback) throw new BadRequestException(`Login callback not supported for provider ${provider}`);
        const { userId, email } = await p.handleLoginCallback(code, state);
        const appJwt = await this.jwtService.signAsync({ sub: userId, email, provider });
        return { accessToken: appJwt, userId, email };
    }

    /** Handle OAuth linking callback and issue an application JWT for the linked user. */
    async handleOAuthCallback(provider: ProviderKey, code: string, state?: string): Promise<{ accessToken: string; userId: string; email: string }> {
        const link = this.providers.getLinking(provider);
        if (!link) throw new BadRequestException(`Linking not supported for provider ${provider}`);
        const { userId } = await link.handleLinkCallback(code, state);
        const user = await this.usersService.findById(userId);
        const appJwt = await this.jwtService.signAsync({ sub: user!.id, email: user!.email, provider });
        return { accessToken: appJwt, userId: user!.id, email: user!.email };
    }

    /** Refresh a provider access token for a given user via the provider plugin. */
    async refreshAccessToken(provider: ProviderKey, userId: string): Promise<{ accessToken: string; expiresIn: number }> {
        if (!userId) throw new BadRequestException('Missing userId');
        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('User not found');
        const link = this.providers.getLinking(provider);
        if (!link) throw new BadRequestException(`Refresh not supported for provider ${provider}`);
        return link.refreshAccessToken(userId);
    }

    /** Get the current access token (decrypt if stored) via the provider plugin. */
    async getCurrentAccessToken(provider: ProviderKey, userId: string): Promise<string> {
        const link = this.providers.getLinking(provider);
        if (!link) throw new BadRequestException(`Provider ${provider} not supported`);
        return link.getCurrentAccessToken(userId);
    }

    /**
     * Perform an API request with automatic token refresh and single retry on 401.
     * - Uses user's current access token
     * - On 401, refreshes using stored refresh_token, updates DB, and retries once
     */
    async oAuth2ApiRequest<T = any>(provider: ProviderKey, userId: string, config: AxiosRequestConfig): Promise<{ data: T; status: number }> {
        if (!userId) throw new BadRequestException('Missing userId');

        const doRequest = async (bearer: string) => {
            const headers = {
                ...(config.headers || {}),
                Authorization: `Bearer ${bearer}`,
            } as Record<string, string>;
            return axios.request<T>({ ...config, headers });
        };

        let accessToken = await this.getCurrentAccessToken(provider, userId);
        try {
            const res = await doRequest(accessToken);
            return { data: res.data, status: res.status };
        } catch (err: any) {
            const status = err?.response?.status;
            if (status !== 401) throw err;
            const refreshed = await this.refreshAccessToken(provider, userId);
            accessToken = refreshed.accessToken;
            const res2 = await doRequest(accessToken);
            return { data: res2.data, status: res2.status };
        }
    }

    // Unlink a provider from a user (remove linked account)
    async unlinkProvider(provider: ProviderKey, userId: string): Promise<{ provider: string; userId: string }> {
        if (!userId) throw new BadRequestException('Missing userId');
        const user = await this.usersService.findById(userId);
        if (!user) throw new NotFoundException('User not found');
        await this.usersService.unlinkLinkedAccount(userId, provider as any);
        this.logger.log(`Unlinked provider ${String(provider)} for user ${userId}`);
        return { provider: String(provider), userId };
    }
}
