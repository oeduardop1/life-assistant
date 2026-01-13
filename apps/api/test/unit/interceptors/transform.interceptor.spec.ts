import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor.js';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: { requestId: string };
  let mockReflector: Reflector;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(false), // Don't skip transform by default
    } as unknown as Reflector;

    interceptor = new TransformInterceptor(mockReflector);

    mockRequest = {
      requestId: 'req-123',
    };

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(mockRequest),
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of({ id: 1, name: 'test' })),
    };
  });

  it('should_wrap_response_in_standard_format', async () => {
    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    const result = await new Promise((resolve) => {
      observable.subscribe({
        next: (value) => resolve(value),
      });
    });

    expect(result).toEqual({
      success: true,
      data: { id: 1, name: 'test' },
      meta: {
        timestamp: expect.any(String),
        requestId: 'req-123',
      },
    });
  });

  it('should_include_valid_iso_timestamp', async () => {
    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    const result = await new Promise<{ meta: { timestamp: string } }>((resolve) => {
      observable.subscribe({
        next: (value) => resolve(value as { meta: { timestamp: string } }),
      });
    });

    const timestamp = new Date(result.meta.timestamp);
    expect(timestamp.toISOString()).toBe(result.meta.timestamp);
  });

  it('should_handle_null_data', async () => {
    mockCallHandler.handle = vi.fn().mockReturnValue(of(null));

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    const result = await new Promise((resolve) => {
      observable.subscribe({
        next: (value) => resolve(value),
      });
    });

    expect(result).toEqual({
      success: true,
      data: null,
      meta: {
        timestamp: expect.any(String),
        requestId: 'req-123',
      },
    });
  });

  it('should_handle_array_data', async () => {
    const arrayData = [{ id: 1 }, { id: 2 }];
    mockCallHandler.handle = vi.fn().mockReturnValue(of(arrayData));

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    const result = await new Promise((resolve) => {
      observable.subscribe({
        next: (value) => resolve(value),
      });
    });

    expect(result).toEqual({
      success: true,
      data: arrayData,
      meta: {
        timestamp: expect.any(String),
        requestId: 'req-123',
      },
    });
  });

  it('should_handle_primitive_data', async () => {
    mockCallHandler.handle = vi.fn().mockReturnValue(of('simple string'));

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    const result = await new Promise((resolve) => {
      observable.subscribe({
        next: (value) => resolve(value),
      });
    });

    expect(result).toEqual({
      success: true,
      data: 'simple string',
      meta: {
        timestamp: expect.any(String),
        requestId: 'req-123',
      },
    });
  });

  it('should_handle_undefined_request_id', async () => {
    mockRequest.requestId = undefined as unknown as string;

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    const result = await new Promise((resolve) => {
      observable.subscribe({
        next: (value) => resolve(value),
      });
    });

    expect(result).toEqual({
      success: true,
      data: { id: 1, name: 'test' },
      meta: {
        timestamp: expect.any(String),
        requestId: undefined,
      },
    });
  });

  it('should_skip_transform_when_decorator_is_present', async () => {
    // Mock reflector to return true for SkipTransform
    vi.mocked(mockReflector.getAllAndOverride).mockReturnValue(true);

    const rawData = { id: 1, name: 'test' };
    mockCallHandler.handle = vi.fn().mockReturnValue(of(rawData));

    const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

    const result = await new Promise((resolve) => {
      observable.subscribe({
        next: (value) => resolve(value),
      });
    });

    // Should return raw data without wrapping
    expect(result).toEqual(rawData);
  });
});
