import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import type { AuthenticatedRequest, ApiResponse } from '../types/request.types';
import { SKIP_TRANSFORM_KEY } from '../decorators';

/**
 * TransformInterceptor - Wraps all responses in standard format
 *
 * Response format:
 * {
 *   success: true,
 *   data: <response>,
 *   meta: {
 *     timestamp: string,
 *     requestId: string
 *   }
 * }
 *
 * Use @SkipTransform() decorator to bypass this interceptor for
 * endpoints that need raw responses (SSE, file downloads, etc.)
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    // Check if endpoint should skip transformation
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestId = request.requestId;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      })),
    );
  }
}
