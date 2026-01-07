import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

/** Header name for request ID */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Extends Express Request to include requestId
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * RequestIdMiddleware - Generates unique request ID for tracing
 *
 * Features:
 * - Generates UUID v4 for each request
 * - Respects existing X-Request-ID header (for load balancer forwarding)
 * - Sets response header for client correlation
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Use existing header if present (from load balancer/proxy)
    // Otherwise generate a new UUID
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string) || randomUUID();

    // Attach to request object for use in logging/interceptors
    req.requestId = requestId;

    // Set response header for client correlation
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
