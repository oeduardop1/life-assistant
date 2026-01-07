import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../../../src/common/interceptors/logging.interceptor.js';
import { AppLoggerService } from '../../../src/logger/logger.service.js';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: Partial<AppLoggerService>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: {
    method: string;
    url: string;
    requestId: string;
    user?: { id: string };
  };
  let mockResponse: { statusCode: number };

  beforeEach(() => {
    vi.useFakeTimers();

    mockLogger = {
      setContext: vi.fn().mockReturnThis(),
      logWithContext: vi.fn(),
    };

    interceptor = new LoggingInterceptor(mockLogger as AppLoggerService);

    mockRequest = {
      method: 'GET',
      url: '/api/test',
      requestId: 'req-123',
    };

    mockResponse = {
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
        getResponse: vi.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ data: 'test' })),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should_set_http_context', () => {
    expect(mockLogger.setContext).toHaveBeenCalledWith('HTTP');
  });

  it('should_log_incoming_request', async () => {
    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    await new Promise<void>((resolve) => {
      observable.subscribe({
        complete: () => resolve(),
      });
    });

    expect(mockLogger.logWithContext).toHaveBeenCalledWith(
      'info',
      'GET /api/test',
      expect.objectContaining({
        requestId: 'req-123',
        type: 'request',
      }),
    );
  });

  it('should_log_response_with_status_and_duration', async () => {
    vi.advanceTimersByTime(100);

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    await new Promise<void>((resolve) => {
      observable.subscribe({
        complete: () => resolve(),
      });
    });

    expect(mockLogger.logWithContext).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('GET /api/test'),
      expect.objectContaining({
        requestId: 'req-123',
        type: 'response',
        statusCode: 200,
        durationMs: expect.any(Number),
      }),
    );
  });

  it('should_include_user_id_when_authenticated', async () => {
    mockRequest.user = { id: 'user-456' };

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    await new Promise<void>((resolve) => {
      observable.subscribe({
        complete: () => resolve(),
      });
    });

    expect(mockLogger.logWithContext).toHaveBeenCalledWith(
      'info',
      'GET /api/test',
      expect.objectContaining({
        userId: 'user-456',
      }),
    );
  });

  it('should_log_error_on_exception', async () => {
    const error = new Error('Test error');
    mockCallHandler.handle = vi.fn().mockReturnValue(throwError(() => error));

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    await new Promise<void>((resolve, reject) => {
      observable.subscribe({
        error: () => resolve(),
        complete: () => reject(new Error('Should have errored')),
      });
    });

    expect(mockLogger.logWithContext).toHaveBeenCalledWith(
      'error',
      'GET /api/test ERROR',
      expect.objectContaining({
        requestId: 'req-123',
        type: 'response',
        error: 'Test error',
        durationMs: expect.any(Number),
      }),
    );
  });

  it('should_handle_missing_user', async () => {
    mockRequest.user = undefined;

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    await new Promise<void>((resolve) => {
      observable.subscribe({
        complete: () => resolve(),
      });
    });

    expect(mockLogger.logWithContext).toHaveBeenCalledWith(
      'info',
      'GET /api/test',
      expect.objectContaining({
        userId: undefined,
      }),
    );
  });
});
