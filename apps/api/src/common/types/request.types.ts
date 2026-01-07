import type { Request } from 'express';

/**
 * User payload extracted from JWT token
 */
export interface JwtPayload {
  /** User ID (from Supabase auth.users.id) */
  sub: string;
  /** Email address */
  email?: string;
  /** Token issued at timestamp */
  iat?: number;
  /** Token expiration timestamp */
  exp?: number;
  /** Audience */
  aud?: string;
  /** Role (from app_metadata) */
  role?: string;
}

/**
 * Authenticated user attached to request
 */
export interface AuthenticatedUser {
  /** User ID (UUID) */
  id: string;
  /** Email address */
  email?: string | undefined;
  /** User role */
  role?: string | undefined;
}

/**
 * Extended Express Request with authentication and request ID
 */
export interface AuthenticatedRequest extends Request {
  /** Authenticated user (set by AuthGuard) */
  user?: AuthenticatedUser;
  /** Unique request ID (set by RequestIdMiddleware) */
  requestId: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
