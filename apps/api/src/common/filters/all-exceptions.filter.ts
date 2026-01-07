import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, ApplicationError } from '../errors/index.js';
import { AppConfigService } from '../../config/config.service.js';
import { AppLoggerService } from '../../logger/logger.service.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/request.types.js';

/**
 * AllExceptionsFilter - Catches and formats all exceptions
 *
 * Features:
 * - Standardized error response format
 * - Handles DomainError, ApplicationError, HttpException
 * - Never exposes stack traces in production
 * - Logs errors with context (userId, requestId)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly config: AppConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const requestId = request.requestId || 'unknown';
    const userId = request.user?.id;

    const { status, code, message, details } = this.parseException(exception);

    // Log the error
    this.logger.logWithContext('error', message, {
      requestId,
      userId,
      code,
      statusCode: status,
      stack: !this.config.isProduction ? this.getStack(exception) : undefined,
    });

    // Build error response
    const errorPayload: ApiResponse<null>['error'] = {
      code,
      message,
    };

    // Only include details in development
    if (details && !this.config.isProduction) {
      errorPayload.details = details;
    }

    const errorResponse: ApiResponse<null> = {
      success: false,
      error: errorPayload,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    response.status(status).json(errorResponse);
  }

  private parseException(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    // Handle DomainError
    if (exception instanceof DomainError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'DOMAIN_ERROR',
        message: exception.message,
      };
    }

    // Handle ApplicationError
    if (exception instanceof ApplicationError) {
      return {
        status: exception.statusCode,
        code: exception.code,
        message: exception.message,
      };
    }

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          status,
          code: this.statusToCode(status),
          message: exceptionResponse,
        };
      }

      const responseObject = exceptionResponse as Record<string, unknown>;
      return {
        status,
        code: (responseObject.error as string) || this.statusToCode(status),
        message: this.extractMessage(responseObject),
        details: responseObject.details,
      };
    }

    // Handle unknown errors
    const error = exception as Error;
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: this.config.isProduction
        ? 'An unexpected error occurred'
        : error.message || 'Unknown error',
    };
  }

  private extractMessage(response: Record<string, unknown>): string {
    if (typeof response.message === 'string') {
      return response.message;
    }
    if (Array.isArray(response.message)) {
      return response.message.join(', ');
    }
    return 'An error occurred';
  }

  private statusToCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] ?? 'UNKNOWN_ERROR';
  }

  private getStack(exception: unknown): string | undefined {
    if (exception instanceof Error) {
      return exception.stack;
    }
    return undefined;
  }
}
