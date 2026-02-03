'use client';

import { useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import type {
  TrackingEntryListResponse,
  TrackingEntryResponse,
  TrackingAggregationResponse,
  TrackingStatsResponse,
  ListTrackingFilters,
  GetAggregationsParams,
  CreateTrackingEntryInput,
  UpdateTrackingEntryInput,
  TrackingType,
} from '../types';
import { calendarKeys } from './use-calendar';

// =============================================================================
// Query Keys
// =============================================================================

export const trackingKeys = {
  all: ['tracking'] as const,
  entries: () => [...trackingKeys.all, 'entries'] as const,
  entriesList: (filters: ListTrackingFilters) =>
    [...trackingKeys.entries(), { filters }] as const,
  entry: (id: string) => [...trackingKeys.entries(), id] as const,
  aggregations: () => [...trackingKeys.all, 'aggregations'] as const,
  aggregation: (params: GetAggregationsParams) =>
    [...trackingKeys.aggregations(), params] as const,
  stats: () => [...trackingKeys.all, 'stats'] as const,
};

// =============================================================================
// Tracking Entries List
// =============================================================================

/**
 * Hook to fetch tracking entries with pagination and filters
 */
export function useTrackingEntries(filters: ListTrackingFilters = {}) {
  const api = useAuthenticatedApi();
  const pageSize = filters.limit ?? 20;

  // Build query string from filters
  const buildQueryString = useCallback(
    (pageOffset: number) => {
      const params = new URLSearchParams();

      if (filters.type) params.set('type', filters.type);
      if (filters.area) params.set('area', filters.area);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      params.set('limit', String(pageSize));
      params.set('offset', String(pageOffset));

      return params.toString();
    },
    [filters, pageSize]
  );

  return useInfiniteQuery({
    queryKey: trackingKeys.entriesList(filters),
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get<TrackingEntryListResponse>(
        `/tracking?${buildQueryString(pageParam)}`
      );
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Flattened list of all tracking entries from infinite query
 */
export function useTrackingEntriesFlat(filters: ListTrackingFilters = {}) {
  const query = useTrackingEntries(filters);

  const entries =
    query.data?.pages.flatMap((page) => page.entries) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    entries,
    total,
  };
}

// =============================================================================
// Single Tracking Entry
// =============================================================================

/**
 * Hook to fetch a single tracking entry by ID
 */
export function useTrackingEntry(entryId: string | null) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: trackingKeys.entry(entryId ?? ''),
    queryFn: async () => {
      const response = await api.get<TrackingEntryResponse>(`/tracking/${entryId}`);
      return response.entry;
    },
    enabled: api.isAuthenticated && !!entryId,
  });
}

// =============================================================================
// Tracking Entry CRUD
// =============================================================================

/**
 * Hook to create a new tracking entry
 */
export function useCreateTrackingEntry() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTrackingEntryInput) => {
      const response = await api.post<TrackingEntryResponse>('/tracking', data);
      return response.entry;
    },
    onSuccess: (_, variables) => {
      // Invalidate entries list and stats
      queryClient.invalidateQueries({ queryKey: trackingKeys.entries() });
      queryClient.invalidateQueries({ queryKey: trackingKeys.aggregations() });
      queryClient.invalidateQueries({ queryKey: trackingKeys.stats() });

      // Invalidate calendar queries to update DayDetailModal and CalendarMonth
      if (variables.entryDate) {
        const [year, month] = variables.entryDate.split('-').map(Number);
        queryClient.invalidateQueries({ queryKey: calendarKeys.day(variables.entryDate) });
        queryClient.invalidateQueries({ queryKey: calendarKeys.metricsByDate(variables.entryDate) });
        queryClient.invalidateQueries({ queryKey: calendarKeys.month(year, month) });
      }
    },
  });
}

/**
 * Hook to update a tracking entry
 */
export function useUpdateTrackingEntry() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      data,
    }: {
      entryId: string;
      data: UpdateTrackingEntryInput;
    }) => {
      const response = await api.patch<TrackingEntryResponse>(`/tracking/${entryId}`, data);
      return response.entry;
    },
    onSuccess: (updatedEntry) => {
      // Update cache for the specific entry
      queryClient.setQueryData(trackingKeys.entry(updatedEntry.id), updatedEntry);
      // Invalidate entries list and aggregations
      queryClient.invalidateQueries({ queryKey: trackingKeys.entries() });
      queryClient.invalidateQueries({ queryKey: trackingKeys.aggregations() });
    },
  });
}

/**
 * Hook to delete a tracking entry
 */
export function useDeleteTrackingEntry() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => api.delete<void>(`/tracking/${entryId}`),
    onSuccess: (_data, entryId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: trackingKeys.entry(entryId) });
      // Invalidate entries list and stats
      queryClient.invalidateQueries({ queryKey: trackingKeys.entries() });
      queryClient.invalidateQueries({ queryKey: trackingKeys.aggregations() });
      queryClient.invalidateQueries({ queryKey: trackingKeys.stats() });
    },
  });
}

// =============================================================================
// Aggregations
// =============================================================================

/**
 * Hook to fetch aggregations for a specific tracking type
 */
export function useTrackingAggregation(params: GetAggregationsParams | null) {
  const api = useAuthenticatedApi();

  const buildQueryString = useCallback(() => {
    if (!params) return '';
    const queryParams = new URLSearchParams();
    queryParams.set('type', params.type);
    if (params.startDate) queryParams.set('startDate', params.startDate);
    if (params.endDate) queryParams.set('endDate', params.endDate);
    return queryParams.toString();
  }, [params]);

  return useQuery({
    queryKey: trackingKeys.aggregation(params ?? { type: 'weight' as TrackingType }),
    queryFn: async () => {
      const response = await api.get<TrackingAggregationResponse>(
        `/tracking/aggregations?${buildQueryString()}`
      );
      return response.aggregation;
    },
    enabled: api.isAuthenticated && !!params,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Hook to fetch tracking statistics
 */
export function useTrackingStats() {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: trackingKeys.stats(),
    queryFn: async () => {
      const response = await api.get<TrackingStatsResponse>('/tracking/stats');
      return response.stats;
    },
    enabled: api.isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * Hook to check if user has any tracking data
 */
export function useHasTrackingData() {
  const { data: stats, isLoading } = useTrackingStats();

  return {
    hasData: (stats?.total ?? 0) > 0,
    isLoading,
    total: stats?.total ?? 0,
  };
}
