import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for marking routes as public
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (bypassing JWT authentication)
 *
 * Usage:
 * @Public()
 * @Get('public-endpoint')
 * publicRoute() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
