import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { AuthenticatedRequest, ApiResponse } from '../types/request.types.js';

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
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
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
