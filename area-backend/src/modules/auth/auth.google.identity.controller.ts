import { Controller, Get, Post, Res, Body, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth - Google Identity')
@Controller('auth')
export class AuthGoogleIdentityController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth (Authorization Code flow)' })
  @ApiResponse({ status: 302, description: 'Redirect to Google consent screen' })
  async startGoogleOAuth(@Res() res: express.Response) {
    const url = this.authService.buildGoogleAuthUrl();
    return res.redirect(url);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login with Google ID token' })
  @ApiBody({ schema: { properties: { token: { type: 'string' } }, required: ['token'] } })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async loginWithGoogle(@Body('token') token: string) {
    return this.authService.signInWithGoogleIdToken(token);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback (exchanges code and stores tokens)' })
  @ApiResponse({ status: 200, description: 'Google OAuth successful' })
  async googleCallback(@Query('code') code: string) {
    const result = await this.authService.handleGoogleOAuthCallback(code);
    return { message: 'Login successful', ...result };
  }
}
