'use client';

import { useCallback } from 'react';
import { useAuthContext } from '@/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface FetchOptions extends RequestInit {
  data?: unknown;
}

interface ApiError {
  message: string;
  status: number;
  data?: unknown;
}

/**
 * Standard API response wrapper from TransformInterceptor
 * @see ENGINEERING.md - API Response Format
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * useAuthenticatedApi - API hook with auth token
 *
 * Automatically includes the Bearer token from the current session.
 */
export function useAuthenticatedApi() {
  const { session } = useAuthContext();

  const request = useCallback(
    async <T>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
      const { data, headers = {}, ...restOptions } = options;

      if (!session?.access_token) {
        throw {
          message: 'Not authenticated',
          status: 401,
        } as ApiError;
      }

      const config: RequestInit = {
        ...restOptions,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...headers,
        },
      };

      if (data) {
        config.body = JSON.stringify(data);
      }

      const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

      try {
        const response = await fetch(url, config);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error: ApiError = {
            message: errorData.message || `HTTP Error ${response.status}`,
            status: response.status,
            data: errorData,
          };
          throw error;
        }

        // Handle 204 No Content and 202 Accepted with empty body
        if (response.status === 204) {
          return {} as T;
        }

        // Unwrap API response from TransformInterceptor format
        const json = (await response.json()) as ApiResponse<T>;
        return json.data;
      } catch (error) {
        if (error && typeof error === 'object' && 'status' in error) {
          throw error;
        }

        // Network or other errors
        throw {
          message: error instanceof Error ? error.message : 'Network error',
          status: 0,
        } as ApiError;
      }
    },
    [session?.access_token]
  );

  const get = useCallback(
    <T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'data'>) =>
      request<T>(endpoint, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    <T>(
      endpoint: string,
      data?: unknown,
      options?: Omit<FetchOptions, 'method' | 'data'>
    ) => request<T>(endpoint, { ...options, method: 'POST', data }),
    [request]
  );

  const put = useCallback(
    <T>(
      endpoint: string,
      data?: unknown,
      options?: Omit<FetchOptions, 'method' | 'data'>
    ) => request<T>(endpoint, { ...options, method: 'PUT', data }),
    [request]
  );

  const del = useCallback(
    <T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'data'>) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }),
    [request]
  );

  /**
   * Get SSE endpoint URL with auth token as query param
   * (EventSource doesn't support custom headers)
   */
  const getSseUrl = useCallback(
    (endpoint: string) => {
      const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
      const urlObj = new URL(url);
      if (session?.access_token) {
        urlObj.searchParams.set('token', session.access_token);
      }
      return urlObj.toString();
    },
    [session?.access_token]
  );

  return {
    get,
    post,
    put,
    delete: del,
    request,
    getSseUrl,
    isAuthenticated: !!session?.access_token,
  };
}
