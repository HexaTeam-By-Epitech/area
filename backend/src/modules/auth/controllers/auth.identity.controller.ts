import { Controller, Get, Post, Delete, Res, Body, Param, Query, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from '../auth.service';
import { Public } from '../../../common/decorators/public.decorator';
import { OptionalAuth } from '../../../common/decorators/optional-auth.decorator';

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
  getLoginUrl(
    @Param('provider') provider: string,
    @Req() req: express.Request,
    @Query('mobile') mobile?: string
  ) {
    // Extract userId from JWT if present (optional authentication)
    const user = (req as any).user;
    const userId = user?.sub as string | undefined;

    const url = this.auth.buildLoginUrl(provider, userId ? { userId, mobile: mobile === 'true' } : { mobile: mobile === 'true' });
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

    const url = this.auth.buildLoginUrl(provider, userId ? { userId } : undefined);
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
  @ApiResponse({ status: 302, description: 'Redirects to frontend with result' })
  async loginCallback(
    @Res() res: express.Response,
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state?: string
  ) {
    // Helper to decode state and check if mobile
    const getStateData = (stateStr?: string): { isMobile: boolean; hasUserId: boolean } => {
      try {
        if (!stateStr) return { isMobile: false, hasUserId: false };

        const parts = stateStr.split('.');
        if (parts.length !== 3) return { isMobile: false, hasUserId: false };

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return { isMobile: payload.mobile === true, hasUserId: !!payload.userId };
      } catch {
        return { isMobile: false, hasUserId: false };
      }
    };

    try {
      const result = await this.auth.handleLoginCallback(provider, code, state);
      const { isMobile, hasUserId } = getStateData(state);

      if (isMobile) {
        // Mobile flow - redirect to mobile app
        const mobileRedirectUri = process.env.MOBILE_REDIRECT_URI || 'area://oauth';

        if (hasUserId) {
          // Identity linking on mobile
          return res.redirect(`${mobileRedirectUri}?provider=${provider}&status=success&type=identity`);
        } else {
          // Login on mobile - redirect with auth data in URL
          return res.redirect(`${mobileRedirectUri}?provider=${provider}&status=success&type=login&accessToken=${encodeURIComponent(result.accessToken)}&userId=${encodeURIComponent(result.userId)}&email=${encodeURIComponent(result.email)}`);
        }
      } else {
        // Web flow
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

        if (hasUserId) {
          // Identity linking flow - redirect to settings
          return res.redirect(`${frontendUrl}/home/settings?provider=${provider}&status=success`);
        } else {
          // Regular login flow - return JSON
          return res.json(result);
        }
      }
    } catch (error) {
      const { isMobile, hasUserId } = getStateData(state);
      const errorMessage = error instanceof Error ? error.message : 'OAuth login failed';

      if (isMobile) {
        const mobileRedirectUri = process.env.MOBILE_REDIRECT_URI || 'area://oauth';
        return res.redirect(`${mobileRedirectUri}?provider=${provider}&status=error&message=${encodeURIComponent(errorMessage)}`);
      } else {
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

        if (hasUserId) {
          // Was trying to link identity - redirect to settings with error
          return res.redirect(`${frontendUrl}/home/settings?provider=${provider}&status=error&message=${encodeURIComponent(errorMessage)}`);
        } else {
          // Was trying to login - return error JSON
          return res.status(401).json({ message: errorMessage });
        }
      }
    }
  }

  /**
   * Get linked identity providers for the authenticated user.
   * Returns a list of identity providers (e.g., 'google') that are linked for sign-in.
   *
   * @param req - Express request containing user from JWT
   * @returns Object containing array of linked provider names
   */
  @Get('linked-identities')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get linked identity providers for the current user' })
  @ApiResponse({ status: 200, description: 'Returns linked identity providers', schema: { properties: { providers: { type: 'array', items: { type: 'string' } } } } })
  async getLinkedIdentities(@Req() req: express.Request) {
    const user = (req as any).user;
    const userId = user?.sub as string;
    return this.auth.getLinkedIdentities(userId);
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
