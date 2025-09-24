import { Controller, Get, Res, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import express from 'express';
import { AuthService } from './auth.service';

@ApiTags('Auth - Google Linking')
@Controller('auth')
export class AuthGoogleLinkingController {
  constructor(private authService: AuthService) {}

  @Get('google/link')
  @ApiOperation({ summary: 'Start Google OAuth for linking (Gmail/Calendar scopes). Requires userId.' })
  @ApiResponse({ status: 302, description: 'Redirect to Google consent screen for linking' })
  async startGoogleLink(@Res() res: express.Response, @Query('userId') userId: string, @Query('scopes') scopes?: string) {
    const url = this.authService.buildGoogleLinkAuthUrl(userId, scopes);
    return res.redirect(url);
  }

  @Get('google/link/callback')
  @ApiOperation({ summary: 'Google linking callback (stores tokens to linked_accounts). Requires state with userId.' })
  @ApiResponse({ status: 200, description: 'Google account linked' })
  async googleLinkCallback(@Query('code') code: string, @Query('state') state?: string) {
    const result = await this.authService.handleGoogleLinkCallback(code, state);
    return { message: 'Linked successfully', ...result };
  }
}
