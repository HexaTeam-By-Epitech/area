import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for marking routes as optional auth
 */
export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/**
 * Decorator to mark routes as optional authentication.
 * The JWT guard will attempt to parse the token if present,
 * but won't reject if no token is provided.
 *
 * This is useful for endpoints that behave differently based on authentication state.
 *
 * Usage:
 * @OptionalAuth()
 * @Get('endpoint')
 * optionalAuthRoute(@Req() req) {
 *   if (req.user) {
 *     // User is authenticated
 *   } else {
 *     // User is not authenticated
 *   }
 * }
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
