import { Controller, Get, Post, Res, Body, Param, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from '../auth.service';

/**
 * Controller exposing generic identity-based auth (e.g., ID token sign-in)
 * and OAuth login code flows for any registered provider.
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
   * Starts provider OAuth login (authorization code flow) by redirecting
   * the client to the provider consent screen.
   *
   * @param res - Express response used to perform the HTTP redirect.
   * @param provider - The provider key.
   */
  @Get(':provider/login')
  @ApiOperation({ summary: 'Start provider OAuth login (code flow), if supported' })
  @ApiResponse({ status: 302, description: 'Redirect to provider consent screen' })
  async startLogin(@Res() res: express.Response, @Param('provider') provider: string) {
    const url = this.auth.buildLoginUrl(provider);
    return res.redirect(url);
  }

  /**
   * Handles the OAuth login callback from the provider, exchanging the code
   * for tokens and finalizing the login.
   *
   * @param provider - The provider key.
   * @param code - Authorization code returned by the provider.
   * @param state - Optional opaque state for CSRF protection.
   * @returns Auth result as provided by `AuthService`.
   */
  @Get(':provider/login/callback')
  @ApiOperation({ summary: 'Provider login callback (code flow)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async loginCallback(@Param('provider') provider: string, @Query('code') code: string, @Query('state') state?: string) {
    return this.auth.handleLoginCallback(provider, code, state);
  }
}
