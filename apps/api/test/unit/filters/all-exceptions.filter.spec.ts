import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter.js';
import { DomainError } from '../../../src/common/errors/domain.error.js';
import { ApplicationError } from '../../../src/common/errors/application.error.js';
import { AppConfigService } from '../../../src/config/config.service.js';
import { AppLoggerService } from '../../../src/logger/logger.service.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockConfig: Partial<AppConfigService>;
  let mockLogger: Partial<AppLoggerService>;
  let mockResponse: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  let mockRequest: { requestId?: string; user?: { id: string } };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockConfig = {
      isProduction: false,
    };

    mockLogger = {
      setContext: vi.fn().mockReturnThis(),
      logWithContext: vi.fn(),
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    mockRequest = {
      requestId: 'req-123',
      user: { id: 'user-456' },
    };

    mockHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: vi.fn().mockReturnValue(mockResponse),
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;

    filter = new AllExceptionsFilter(
      mockConfig as AppConfigService,
      mockLogger as AppLoggerService,
    );
  });

  it('should_set_exception_filter_context', () => {
    expect(mockLogger.setContext).toHaveBeenCalledWith('ExceptionFilter');
  });

  describe('DomainError handling', () => {
    it('should_format_domain_error', () => {
      const error = new DomainError('Business rule violated');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DOMAIN_ERROR',
          message: 'Business rule violated',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });
  });

  describe('ApplicationError handling', () => {
    it('should_format_application_error', () => {
      const error = new ApplicationError('Resource not found', 'NOT_FOUND', 404);

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });
  });

  describe('HttpException handling', () => {
    it('should_format_http_exception_with_string_response', () => {
      const error = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Bad Request',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });

    it('should_format_http_exception_with_object_response', () => {
      const error = new HttpException(
        { message: 'Validation failed', error: 'VALIDATION_ERROR' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });

    it('should_format_http_exception_with_array_message', () => {
      const error = new HttpException(
        { message: ['Error 1', 'Error 2'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Error 1, Error 2',
          }),
        }),
      );
    });

    it('should_include_details_in_development', () => {
      const error = new HttpException(
        { message: 'Validation failed', details: { field: 'email', reason: 'invalid' } },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: { field: 'email', reason: 'invalid' },
          }),
        }),
      );
    });

    it('should_handle_http_exception_with_no_message_property', () => {
      const error = new HttpException(
        { error: 'CUSTOM_ERROR', details: {} },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'An error occurred',
          }),
        }),
      );
    });
  });

  describe('Unknown error handling', () => {
    it('should_format_unknown_error_in_development', () => {
      const error = new Error('Something went wrong');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });

    it('should_hide_error_details_in_production', () => {
      mockConfig.isProduction = true;
      filter = new AllExceptionsFilter(
        mockConfig as AppConfigService,
        mockLogger as AppLoggerService,
      );

      const error = new Error('Sensitive error details');

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        meta: {
          timestamp: expect.any(String),
          requestId: 'req-123',
        },
      });
    });
  });

  describe('Logging', () => {
    it('should_log_error_with_context', () => {
      const error = new Error('Test error');

      filter.catch(error, mockHost);

      expect(mockLogger.logWithContext).toHaveBeenCalledWith(
        'error',
        'Test error',
        expect.objectContaining({
          requestId: 'req-123',
          userId: 'user-456',
          code: 'INTERNAL_ERROR',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        }),
      );
    });

    it('should_include_stack_in_development', () => {
      const error = new Error('Test error');

      filter.catch(error, mockHost);

      expect(mockLogger.logWithContext).toHaveBeenCalledWith(
        'error',
        'Test error',
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );
    });

    it('should_exclude_stack_in_production', () => {
      mockConfig.isProduction = true;
      filter = new AllExceptionsFilter(
        mockConfig as AppConfigService,
        mockLogger as AppLoggerService,
      );

      const error = new Error('Test error');

      filter.catch(error, mockHost);

      expect(mockLogger.logWithContext).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.objectContaining({
          stack: undefined,
        }),
      );
    });
  });

  describe('Edge cases', () => {
    it('should_handle_missing_request_id', () => {
      mockRequest.requestId = undefined;

      filter.catch(new Error('Test'), mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'unknown',
          }),
        }),
      );
    });

    it('should_handle_missing_user', () => {
      mockRequest.user = undefined;

      filter.catch(new Error('Test'), mockHost);

      expect(mockLogger.logWithContext).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.objectContaining({
          userId: undefined,
        }),
      );
    });

    it('should_handle_non_error_exception', () => {
      filter.catch('string error', mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should_return_unknown_error_for_unmapped_status_code', () => {
      const error = new HttpException('Custom Error', 418); // I'm a teapot

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNKNOWN_ERROR',
          }),
        }),
      );
    });
  });
});
