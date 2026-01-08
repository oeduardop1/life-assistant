import { useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface FetchOptions extends RequestInit {
  data?: unknown;
}

interface ApiError {
  message: string;
  status: number;
  data?: unknown;
}

export function useApi() {
  const request = useCallback(async <T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> => {
    const { data, headers = {}, ...restOptions } = options;

    const config: RequestInit = {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
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

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
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
  }, []);

  const get = useCallback(
    <T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'data'>) =>
      request<T>(endpoint, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    <T>(endpoint: string, data?: unknown, options?: Omit<FetchOptions, 'method' | 'data'>) =>
      request<T>(endpoint, { ...options, method: 'POST', data }),
    [request]
  );

  const put = useCallback(
    <T>(endpoint: string, data?: unknown, options?: Omit<FetchOptions, 'method' | 'data'>) =>
      request<T>(endpoint, { ...options, method: 'PUT', data }),
    [request]
  );

  const del = useCallback(
    <T>(endpoint: string, options?: Omit<FetchOptions, 'method' | 'data'>) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }),
    [request]
  );

  return {
    get,
    post,
    put,
    delete: del,
    request,
  };
}
