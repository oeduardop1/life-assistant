import {
  Injectable,
  NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Response } from 'express';
import { type Observable, tap } from 'rxjs';
import { AppLoggerService } from '../../logger/logger.service.js';
import type { AuthenticatedRequest } from '../types/request.types.js';

/**
 * LoggingInterceptor - Logs incoming requests and outgoing responses
 *
 * Logs include:
 * - request_id (from RequestIdMiddleware)
 * - user_id (from AuthGuard, if authenticated)
 * - HTTP method and URL
 * - Response status code
 * - Response time in milliseconds
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, requestId } = request;
    const userId = request.user?.id;

    const startTime = Date.now();

    // Log incoming request
    this.logger.logWithContext('info', `${method} ${url}`, {
      requestId,
      userId,
      type: 'request',
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.logWithContext('info', `${method} ${url} ${String(statusCode)}`, {
            requestId,
            userId,
            type: 'response',
            statusCode,
            durationMs: duration,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          // Error logging is handled by AllExceptionsFilter
          // Here we just log the timing
          this.logger.logWithContext('error', `${method} ${url} ERROR`, {
            requestId,
            userId,
            type: 'response',
            error: error.message,
            durationMs: duration,
          });
        },
      }),
    );
  }
}
