import { Controller, Get, Req, Redirect } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import type { Request } from 'express';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Redirect root to Swagger docs and exclude from Swagger documentation
  @Public()
  @ApiExcludeEndpoint()
  @Get()
  @Redirect('/docs', 302)
  rootToDocs() {
    return;
  }

  @Public()
  @Get('about.json')
  getAbout(@Req() req: Request) {
    // Extract client IP from request
    const clientIp = this.getClientIp(req);
    return this.appService.getAbout(clientIp);
  }

  private getClientIp(req: Request): string {
    // Check various headers that might contain the real IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fallback to socket IP
    return req.socket.remoteAddress || 'unknown';
  }
}
