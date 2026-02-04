'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import type {
  CustomMetricsListResponse,
  CustomMetricResponse,
  CreateCustomMetricInput,
  UpdateCustomMetricInput,
} from '../types';

// =============================================================================
// Query Keys
// =============================================================================

export const customMetricsKeys = {
  all: ['custom-metrics'] as const,
  list: () => [...customMetricsKeys.all, 'list'] as const,
  listWithInactive: () => [...customMetricsKeys.all, 'list', 'includeInactive'] as const,
  metric: (id: string) => [...customMetricsKeys.all, 'detail', id] as const,
};

// =============================================================================
// List Custom Metrics
// =============================================================================

/**
 * Hook to fetch all custom metric definitions for the current user
 */
export function useCustomMetrics(includeInactive = false) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: includeInactive ? customMetricsKeys.listWithInactive() : customMetricsKeys.list(),
    queryFn: async () => {
      const params = includeInactive ? '?includeInactive=true' : '';
      const response = await api.get<CustomMetricsListResponse>(
        `/tracking/custom-metrics${params}`
      );
      return response.metrics;
    },
    enabled: api.isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Single Custom Metric
// =============================================================================

/**
 * Hook to fetch a single custom metric by ID
 */
export function useCustomMetric(metricId: string | null) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: customMetricsKeys.metric(metricId ?? ''),
    queryFn: async () => {
      const response = await api.get<CustomMetricResponse>(
        `/tracking/custom-metrics/${metricId}`
      );
      return response.metric;
    },
    enabled: api.isAuthenticated && !!metricId,
  });
}

// =============================================================================
// Create Custom Metric
// =============================================================================

/**
 * Hook to create a new custom metric definition
 */
export function useCreateCustomMetric() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomMetricInput) => {
      const response = await api.post<CustomMetricResponse>(
        '/tracking/custom-metrics',
        data
      );
      return response.metric;
    },
    onSuccess: () => {
      // Invalidate custom metrics list
      queryClient.invalidateQueries({ queryKey: customMetricsKeys.list() });
      queryClient.invalidateQueries({ queryKey: customMetricsKeys.listWithInactive() });
    },
  });
}

// =============================================================================
// Update Custom Metric
// =============================================================================

/**
 * Hook to update a custom metric definition
 */
export function useUpdateCustomMetric() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      metricId,
      data,
    }: {
      metricId: string;
      data: UpdateCustomMetricInput;
    }) => {
      const response = await api.patch<CustomMetricResponse>(
        `/tracking/custom-metrics/${metricId}`,
        data
      );
      return response.metric;
    },
    onSuccess: (updatedMetric) => {
      // Update cache for the specific metric
      queryClient.setQueryData(customMetricsKeys.metric(updatedMetric.id), updatedMetric);
      // Invalidate custom metrics list
      queryClient.invalidateQueries({ queryKey: customMetricsKeys.list() });
      queryClient.invalidateQueries({ queryKey: customMetricsKeys.listWithInactive() });
    },
  });
}

// =============================================================================
// Delete Custom Metric
// =============================================================================

/**
 * Hook to delete a custom metric definition (soft delete)
 */
export function useDeleteCustomMetric() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metricId: string) =>
      api.delete<void>(`/tracking/custom-metrics/${metricId}`),
    onSuccess: (_data, metricId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: customMetricsKeys.metric(metricId) });
      // Invalidate custom metrics list
      queryClient.invalidateQueries({ queryKey: customMetricsKeys.list() });
      queryClient.invalidateQueries({ queryKey: customMetricsKeys.listWithInactive() });
    },
  });
}

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * Hook to check if user has any custom metrics
 */
export function useHasCustomMetrics() {
  const { data: metrics, isLoading } = useCustomMetrics();

  return {
    hasCustomMetrics: (metrics?.length ?? 0) > 0,
    isLoading,
    count: metrics?.length ?? 0,
  };
}

/**
 * Hook to get custom metric options for select/dropdown
 * Returns array of { value, label, icon, color, unit } objects
 */
export function useCustomMetricOptions() {
  const { data: metrics, isLoading } = useCustomMetrics();

  const options = (metrics ?? []).map((metric) => ({
    value: metric.id,
    label: metric.name,
    icon: metric.icon,
    color: metric.color,
    unit: metric.unit,
    minValue: metric.minValue ? parseFloat(metric.minValue) : undefined,
    maxValue: metric.maxValue ? parseFloat(metric.maxValue) : undefined,
  }));

  return {
    options,
    isLoading,
  };
}
