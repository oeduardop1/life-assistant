'use client';

import { useCallback, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import type {
  MemoryOverview,
  KnowledgeItem,
  KnowledgeItemListResponse,
  ValidateItemResponse,
  ExportMemoryResponse,
  ListItemsFilters,
  CreateKnowledgeItemInput,
  UpdateKnowledgeItemInput,
} from '../types';

// =============================================================================
// Query Keys
// =============================================================================

export const memoryKeys = {
  all: ['memory'] as const,
  overview: () => [...memoryKeys.all, 'overview'] as const,
  items: () => [...memoryKeys.all, 'items'] as const,
  itemsList: (filters: ListItemsFilters) =>
    [...memoryKeys.items(), { filters }] as const,
  item: (id: string) => [...memoryKeys.items(), id] as const,
  export: () => [...memoryKeys.all, 'export'] as const,
};

// =============================================================================
// Memory Overview
// =============================================================================

/**
 * Hook to fetch memory overview (user profile + stats)
 */
export function useMemoryOverview() {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: memoryKeys.overview(),
    queryFn: () => api.get<MemoryOverview>('/memory'),
    enabled: api.isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Knowledge Items List
// =============================================================================

/**
 * Hook to fetch knowledge items with pagination and filters
 */
export function useKnowledgeItems(filters: ListItemsFilters = {}) {
  const api = useAuthenticatedApi();
  const pageSize = filters.limit ?? 20;

  // Build query string from filters
  const buildQueryString = useCallback(
    (pageOffset: number) => {
      const params = new URLSearchParams();

      if (filters.type) params.set('type', filters.type);
      if (filters.area) params.set('area', filters.area);
      if (filters.source) params.set('source', filters.source);
      if (filters.confidenceMin !== undefined)
        params.set('confidenceMin', String(filters.confidenceMin));
      if (filters.confidenceMax !== undefined)
        params.set('confidenceMax', String(filters.confidenceMax));
      if (filters.search) params.set('search', filters.search);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      // Temporal filter (M1.6.1)
      if (filters.includeSuperseded)
        params.set('includeSuperseded', String(filters.includeSuperseded));

      params.set('limit', String(pageSize));
      params.set('offset', String(pageOffset));

      return params.toString();
    },
    [filters, pageSize]
  );

  return useInfiniteQuery({
    queryKey: memoryKeys.itemsList(filters),
    queryFn: ({ pageParam = 0 }) =>
      api.get<KnowledgeItemListResponse>(
        `/memory/items?${buildQueryString(pageParam)}`
      ),
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
 * Flattened list of all knowledge items from infinite query
 */
export function useKnowledgeItemsFlat(filters: ListItemsFilters = {}) {
  const query = useKnowledgeItems(filters);

  const items = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.items) ?? [];
  }, [query.data?.pages]);

  const total = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    items,
    total,
  };
}

// =============================================================================
// Knowledge Item CRUD
// =============================================================================

/**
 * Hook to fetch a single knowledge item by ID
 */
export function useKnowledgeItem(itemId: string | null) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: memoryKeys.item(itemId ?? ''),
    queryFn: () => api.get<KnowledgeItem>(`/memory/items/${itemId}`),
    enabled: api.isAuthenticated && !!itemId,
  });
}

/**
 * Hook to create a new knowledge item
 */
export function useCreateItem() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateKnowledgeItemInput) =>
      api.post<KnowledgeItem>('/memory/items', data),
    onSuccess: () => {
      // Invalidate items list and overview (stats changed)
      queryClient.invalidateQueries({ queryKey: memoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: memoryKeys.overview() });
    },
  });
}

/**
 * Hook to update a knowledge item
 */
export function useUpdateItem() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateKnowledgeItemInput;
    }) => api.patch<KnowledgeItem>(`/memory/items/${itemId}`, data),
    onSuccess: (updatedItem) => {
      // Update cache for the specific item
      queryClient.setQueryData(memoryKeys.item(updatedItem.id), updatedItem);
      // Invalidate items list
      queryClient.invalidateQueries({ queryKey: memoryKeys.items() });
    },
  });
}

/**
 * Hook to delete a knowledge item
 */
export function useDeleteItem() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      api.delete<void>(`/memory/items/${itemId}`),
    onSuccess: (_data, itemId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: memoryKeys.item(itemId) });
      // Invalidate items list and overview (stats changed)
      queryClient.invalidateQueries({ queryKey: memoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: memoryKeys.overview() });
    },
  });
}

/**
 * Hook to validate a knowledge item (set confidence to 1.0)
 */
export function useValidateItem() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) =>
      api.post<ValidateItemResponse>(`/memory/items/${itemId}/validate`),
    onSuccess: (result) => {
      // Update item in cache with new confidence
      queryClient.setQueryData<KnowledgeItem>(
        memoryKeys.item(result.id),
        (old) =>
          old
            ? {
                ...old,
                confidence: result.confidence,
                validatedByUser: result.validatedByUser,
              }
            : old
      );
      // Invalidate items list to reflect confidence change
      queryClient.invalidateQueries({ queryKey: memoryKeys.items() });
    },
  });
}

// =============================================================================
// Export
// =============================================================================

/**
 * Hook to export all knowledge items
 */
export function useExportMemory() {
  const api = useAuthenticatedApi();

  return useMutation({
    mutationFn: () => api.get<ExportMemoryResponse>('/memory/export'),
    onSuccess: (data) => {
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `memory-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
