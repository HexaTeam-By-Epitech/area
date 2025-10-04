import { Controller, Get, Post, Delete, Res, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from '../auth.service';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalAuth } from '../../../common/decorators/optional-auth.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

/**
 * Controller exposing generic identity-based auth (e.g., ID token sign-in)
 * and OAuth login code flows for any registered provider.
 * Supports both public login and authenticated identity linking.
 */
@ApiTags('Auth - Identity (Generic)')
@Controller('auth')
export class GenericAuthIdentityController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Signs in a user using a provider-issued ID token (e.g., Google One Tap).
   *
   * @param provider - Provider key (e.g., `google`, `spotify`).
   * @param token - The opaque ID token string obtained from the provider SDK.
   * @returns Auth result as provided by `AuthService` (e.g., user and session info).
   */
  @Public()
  @Post(':provider/id-token')
  @ApiOperation({ summary: 'Sign-in with provider ID token (e.g., Google One Tap)' })
  @ApiBody({ schema: { properties: { token: { type: 'string' } }, required: ['token'] } })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async loginWithIdToken(@Param('provider') provider: string, @Body('token') token: string) {
    // Delegate token validation and user creation/login to AuthService
    return this.auth.signInWithIdToken(provider, token);
  }

  /**
   * Get the OAuth login URL for the provider without redirecting.
   * Useful for Swagger/Postman testing and frontend applications.
   *
   * Can be used in two modes:
   * - Public (no auth): Returns URL for login/registration
   * - Authenticated: Returns URL for identity linking
   *
   * @param provider - The provider key.
   * @param req - Express request containing optional user from JWT
   * @returns Object containing the OAuth URL
   */
  @OptionalAuth()
  @ApiBearerAuth('JWT-auth')
  @Get(':provider/login/url')
  @ApiOperation({ summary: 'Get provider OAuth login URL. If authenticated, returns URL for identity linking.' })
  @ApiResponse({ status: 200, description: 'Returns the OAuth URL', schema: { properties: { url: { type: 'string' } } } })
  getLoginUrl(@Param('provider') provider: string, @Req() req: express.Request) {
    // Extract userId from JWT if present (optional authentication)
    const user = (req as any).user;
    const userId = user?.sub as string | undefined;

    const url = this.auth.buildLoginUrl(provider, userId);
    return { url };
  }

  /**
   * Starts provider OAuth login (authorization code flow) by redirecting
   * the client to the provider consent screen.
   *
   * Can be used in two modes:
   * - Public (no auth): Creates new user or logs in existing user
   * - Authenticated: Links identity to current user
   *
   * @param res - Express response used to perform the HTTP redirect.
   * @param req - Express request containing optional user from JWT
   * @param provider - The provider key.
   */
  @OptionalAuth()
  @ApiBearerAuth('JWT-auth')
  @Get(':provider/login')
  @ApiOperation({ summary: 'Start provider OAuth login (code flow). If authenticated, links identity to current user.' })
  @ApiResponse({ status: 302, description: 'Redirect to provider consent screen' })
  async startLogin(
    @Res() res: express.Response,
    @Req() req: express.Request,
    @Param('provider') provider: string
  ) {
    // Extract userId from JWT if present (optional authentication)
    const user = (req as any).user;
    const userId = user?.sub as string | undefined;

    const url = this.auth.buildLoginUrl(provider, userId);
    return res.redirect(url);
  }

  /**
   * Handles the OAuth login callback from the provider, exchanging the code
   * for tokens and finalizing the login or identity linking.
   *
   * @param provider - The provider key.
   * @param code - Authorization code returned by the provider.
   * @param state - Optional opaque state for CSRF protection.
   * @returns Auth result as provided by `AuthService`.
   */
  @Public()
  @Get(':provider/login/callback')
  @ApiOperation({ summary: 'Provider login callback (code flow)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async loginCallback(@Param('provider') provider: string, @Query('code') code: string, @Query('state') state?: string) {
    return this.auth.handleLoginCallback(provider, code, state);
  }

  /**
   * Unlink an identity provider from the authenticated user.
   * - If the user has a password_hash: removes the identity only
   * - If the user has no password_hash: deletes the entire user account (prevents lockout)
   *
   * @param provider - The provider key to unlink.
   * @param req - Express request containing user from JWT
   * @returns Confirmation with deletion status
   */
  @Delete(':provider/identity')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unlink identity provider from user. Deletes account if no password exists.' })
  @ApiResponse({ status: 200, description: 'Identity unlinked or account deleted' })
  @ApiResponse({ status: 404, description: 'Identity or user not found' })
  async unlinkIdentity(@Param('provider') provider: string, @Req() req: express.Request) {
    const user = (req as any).user;
    const userId = user?.sub as string;
    return this.auth.unlinkIdentity(provider, userId);
  }
}
