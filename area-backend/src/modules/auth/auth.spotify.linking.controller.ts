import { Controller, Get, Res, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth - Spotify Linking')
@Controller('auth')
export class AuthSpotifyLinkingController {
  constructor(private authService: AuthService) {}

  @Get('spotify/url')
  @ApiOperation({ summary: 'Get Spotify OAuth URL for linking (JSON response; Swagger friendly)' })
  @ApiResponse({ status: 200, description: 'Returns the Spotify OAuth URL', schema: { properties: { url: { type: 'string' } } } })
  getSpotifyAuthUrl(@Query('userId') userId?: string) {
    const url = this.authService.buildSpotifyAuthUrl(userId);
    return { url };
  }

  @Get('spotify')
  @ApiOperation({ summary: 'Start Spotify OAuth to link an account. Requires userId.' })
  @ApiResponse({ status: 302, description: 'Redirect to Spotify consent screen' })
  async startSpotifyOAuth(@Res() res: express.Response, @Query('userId') userId?: string) {
    const url = this.authService.buildSpotifyAuthUrl(userId);
    // Log URL for visibility in server logs even if Swagger cannot follow redirect
    // (The provider also logs at debug level.)
    // eslint-disable-next-line no-console
    console.log(`[Auth][Spotify] Redirecting to: ${url}`);
    return res.redirect(url);
  }

  @Get('spotify/callback')
  @ApiOperation({ summary: 'Spotify OAuth callback (exchanges code and stores tokens)' })
  @ApiResponse({ status: 200, description: 'Spotify OAuth successful' })
  async spotifyCallback(@Query('code') code: string, @Query('state') state?: string) {
    const result = await this.authService.handleSpotifyOAuthCallback(code, state);
    return { message: 'Login successful', ...result };
  }
}
