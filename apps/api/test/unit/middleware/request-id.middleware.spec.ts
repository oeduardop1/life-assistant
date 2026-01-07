import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { RequestIdMiddleware } from '../../../src/common/middleware/request-id.middleware.js';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: vi.fn(),
    };
    nextFunction = vi.fn();
  });

  it('should_generate_request_id_when_not_provided', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect((mockRequest as Record<string, unknown>).requestId).toBeDefined();
    expect(typeof (mockRequest as Record<string, unknown>).requestId).toBe('string');
    expect((mockRequest as Record<string, unknown>).requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should_use_existing_x_request_id_header', () => {
    const existingId = 'existing-request-id-123';
    mockRequest.headers = { 'x-request-id': existingId };

    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect((mockRequest as Record<string, unknown>).requestId).toBe(existingId);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should_set_x_request_id_response_header', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      (mockRequest as Record<string, unknown>).requestId,
    );
  });

  it('should_call_next_function', () => {
    middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('should_generate_unique_ids_for_different_requests', () => {
    const ids: string[] = [];

    for (let i = 0; i < 10; i++) {
      const req: Partial<Request> = { headers: {} };
      middleware.use(req as Request, mockResponse as Response, nextFunction);
      ids.push((req as Record<string, unknown>).requestId as string);
    }

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });
});
