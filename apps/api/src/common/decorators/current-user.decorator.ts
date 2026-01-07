import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser } from '../types/request.types.js';

/**
 * @CurrentUser() - Extracts authenticated user from request
 *
 * Returns the user object attached by AuthGuard.
 * Returns undefined if route is public or user not authenticated.
 *
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return { id: user.id, email: user.email };
 * }
 *
 * @example
 * // Get specific property
 * @Get('notes')
 * getNotes(@CurrentUser('id') userId: string) {
 *   return this.notesService.findByUser(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    // If a specific property is requested, return just that property
    if (data) {
      return user[data];
    }

    return user;
  },
);
