import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator';

/**
 * JWT Authentication Guard
 *
 * Protects routes by validating JWT tokens from the Authorization header.
 * - Routes marked with @Public() decorator bypass authentication
 * - Routes marked with @OptionalAuth() attempt to parse token but don't require it
 * - In development mode with DISABLE_AUTH_IN_DEV=true, all auth checks are bypassed
 * - Validates JWT signature and expiration
 * - Attaches user payload to request object
 */
@Injectable()
export class JwtAuthGuard {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route is marked as optional auth
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check if auth is disabled in development mode
    const disableAuth = this.configService.get<string>('DISABLE_AUTH_IN_DEV') === 'true';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    if (disableAuth && nodeEnv === 'development') {
      this.logger.warn('⚠️  Authentication is DISABLED in development mode');
      // Inject a mock user for development
      const request = context.switchToHttp().getRequest();
      request.user = {
        sub: '00000000-0000-0000-0000-000000000000',
        email: 'dev@localhost',
        provider: 'dev',
      };
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    // For optional auth routes, parse token if present but don't require it
    if (isOptionalAuth) {
      if (token) {
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: this.configService.get<string>('JWT_SECRET'),
          });
          // Attach user payload to request for use in route handlers
          request.user = payload;
        } catch (error) {
          // Invalid token on optional auth - just ignore and continue without user
          this.logger.debug('Optional auth: Invalid token provided, continuing without authentication');
        }
      }
      return true;
    }

    // For protected routes, require valid token
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Attach user payload to request for use in route handlers
      request.user = payload;
    } catch (error) {
      this.logger.error('JWT verification failed', error);
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }

  /**
   * Extracts JWT token from Authorization header
   * Expected format: "Bearer <token>"
   */
  private extractTokenFromHeader(request: any): string | undefined {
    const authorization = request.headers?.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
