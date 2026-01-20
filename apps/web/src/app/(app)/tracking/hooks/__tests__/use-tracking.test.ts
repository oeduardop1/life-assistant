import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useTrackingEntriesFlat,
  useCreateTrackingEntry,
  useDeleteTrackingEntry,
  useTrackingStats,
  useTrackingAggregation,
  trackingKeys,
} from '../use-tracking';

// Mock the useAuthenticatedApi hook
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: mockGet,
    post: mockPost,
    patch: vi.fn(),
    delete: mockDelete,
    isAuthenticated: true,
  }),
}));

// Helper to create a wrapper with React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  function TestQueryProvider({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return TestQueryProvider;
}

describe('useTrackingEntriesFlat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_with_correct_params', async () => {
    mockGet.mockResolvedValue({
      entries: [
        {
          id: 'entry-1',
          type: 'weight',
          area: 'health',
          value: '75.0',
          unit: 'kg',
          entryDate: '2024-01-15',
          entryTime: null,
          source: 'form',
          metadata: {},
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
      ],
      total: 1,
      hasMore: false,
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useTrackingEntriesFlat({ type: 'weight', limit: 10 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('type=weight')
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('limit=10')
    );
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it('should_handle_loading_state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackingEntriesFlat({}), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.entries).toEqual([]);
  });

  it('should_handle_error_state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackingEntriesFlat({}), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useCreateTrackingEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_call_api_correctly', async () => {
    const mockEntry = {
      id: 'new-entry',
      type: 'weight',
      area: 'health',
      value: '75.0',
      unit: 'kg',
      entryDate: '2024-01-15',
    };
    mockPost.mockResolvedValue({ entry: mockEntry });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTrackingEntry(), { wrapper });

    const input = {
      type: 'weight' as const,
      area: 'health' as const,
      value: 75.0,
      unit: 'kg',
      entryDate: '2024-01-15',
    };

    await result.current.mutateAsync(input);

    expect(mockPost).toHaveBeenCalledWith('/tracking', input);
  });

  it('should_invalidate_cache_on_success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    mockPost.mockResolvedValue({
      entry: {
        id: 'new-entry',
        type: 'weight',
        value: '75.0',
      },
    });

    const { result } = renderHook(() => useCreateTrackingEntry(), { wrapper });

    await result.current.mutateAsync({
      type: 'weight' as const,
      area: 'health' as const,
      value: 75.0,
      entryDate: '2024-01-15',
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: trackingKeys.entries() })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: trackingKeys.aggregations() })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: trackingKeys.stats() })
    );
  });
});

describe('useDeleteTrackingEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_remove_from_cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const removeSpy = vi.spyOn(queryClient, 'removeQueries');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    mockDelete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteTrackingEntry(), { wrapper });

    await result.current.mutateAsync('entry-to-delete');

    expect(mockDelete).toHaveBeenCalledWith('/tracking/entry-to-delete');
    expect(removeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: trackingKeys.entry('entry-to-delete') })
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: trackingKeys.entries() })
    );
  });
});

describe('useTrackingStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_transform_response', async () => {
    mockGet.mockResolvedValue({
      stats: {
        byType: { weight: 5, water: 10 },
        total: 15,
      },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackingStats(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/tracking/stats');
    expect(result.current.data).toEqual({
      byType: { weight: 5, water: 10 },
      total: 15,
    });
  });
});

describe('useTrackingAggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_by_date_range', async () => {
    mockGet.mockResolvedValue({
      aggregation: {
        type: 'weight',
        average: 75.5,
        sum: 226.5,
        min: 74.0,
        max: 77.0,
        count: 3,
        latestValue: 75.5,
        previousValue: 75.0,
        variation: 0.67,
      },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useTrackingAggregation({
          type: 'weight',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('type=weight')
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('startDate=2024-01-01')
    );
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('endDate=2024-01-31')
    );
    expect(result.current.data?.average).toBe(75.5);
    expect(result.current.data?.count).toBe(3);
  });

  it('should_not_fetch_when_params_null', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useTrackingAggregation(null), {
      wrapper,
    });

    // Should not have called API since params is null
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });
});
