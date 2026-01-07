import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() - Marks a route as publicly accessible
 *
 * Routes marked with this decorator bypass AuthGuard.
 * Use for endpoints that don't require authentication.
 *
 * @example
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
