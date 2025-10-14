import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * JWT payload interface representing authenticated user data
 */
export interface JwtPayload {
  sub: string;        // User ID
  email: string;      // User email
  provider?: string;  // Auth provider (e.g., 'google', 'email')
  iat?: number;       // Issued at (timestamp)
  exp?: number;       // Expiration (timestamp)
}

/**
 * Decorator to extract authenticated user from request
 *
 * Usage:
 * @Get('profile')
 * getProfile(@GetUser() user: JwtPayload) {
 *   return { userId: user.sub, email: user.email };
 * }
 *
 * Extract specific field:
 * @Get('profile')
 * getProfile(@GetUser('sub') userId: string) {
 *   return { userId };
 * }
 */
export const GetUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    return data ? user?.[data] : user;
  },
);
