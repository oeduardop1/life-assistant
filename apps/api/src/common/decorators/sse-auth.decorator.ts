import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../types/request.types';

/**
 * @SseCurrentUser() - Extracts authenticated user ID from SSE request
 *
 * IMPORTANT: This decorator must be used with @UseGuards(SseAuthGuard)
 * The guard handles async JWT verification and attaches user to request.
 * This decorator simply extracts the user ID.
 *
 * @example
 * @UseGuards(SseAuthGuard)
 * @Sse('stream')
 * @Public() // Still need @Public() to bypass global AuthGuard
 * stream(@SseCurrentUser() userId: string): Observable<MessageEvent> {
 *   return this.service.stream(userId);
 * }
 */
export const SseCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    // User should be set by SseAuthGuard
    if (!request.user?.id) {
      throw new UnauthorizedException(
        'User not authenticated. Ensure @UseGuards(SseAuthGuard) is applied to this endpoint.'
      );
    }

    return request.user.id;
  },
);
