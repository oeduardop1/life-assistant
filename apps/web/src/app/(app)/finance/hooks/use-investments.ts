'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import { financeKeys } from './use-finance';
import type {
  InvestmentResponse,
  InvestmentsListResponse,
  CreateInvestmentInput,
  UpdateInvestmentInput,
  UpdateInvestmentValueInput,
  InvestmentQueryParams,
} from '../types';

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch investments list with optional filters
 *
 * @param params - Query parameters for filtering
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useInvestments(params: InvestmentQueryParams = {}) {
  const api = useAuthenticatedApi();
  const { type, limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: financeKeys.investmentsList({ type, limit, offset }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (type) searchParams.set('type', type);
      if (limit) searchParams.set('limit', String(limit));
      if (offset) searchParams.set('offset', String(offset));

      const query = searchParams.toString();
      const response = await api.get<InvestmentsListResponse>(
        `/finance/investments${query ? `?${query}` : ''}`
      );
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch single investment by ID
 *
 * @param id - Investment ID
 */
export function useInvestment(id: string | undefined) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.investments(), id],
    queryFn: async () => {
      const response = await api.get<InvestmentResponse>(`/finance/investments/${id}`);
      return response.investment;
    },
    enabled: api.isAuthenticated && !!id,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to create a new investment
 */
export function useCreateInvestment() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvestmentInput) => {
      const response = await api.post<InvestmentResponse>('/finance/investments', data);
      return response.investment;
    },
    onSuccess: () => {
      // Invalidate investments list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.investments() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/**
 * Hook to update an existing investment
 */
export function useUpdateInvestment() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInvestmentInput }) => {
      const response = await api.patch<InvestmentResponse>(`/finance/investments/${id}`, data);
      return response.investment;
    },
    onSuccess: () => {
      // Invalidate investments list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.investments() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/**
 * Hook to delete an investment
 */
export function useDeleteInvestment() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finance/investments/${id}`);
      return id;
    },
    onSuccess: () => {
      // Invalidate investments list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.investments() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/**
 * Hook to update investment current value
 * Used for quick value updates without editing all fields
 */
export function useUpdateInvestmentValue() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInvestmentValueInput }) => {
      const response = await api.patch<InvestmentResponse>(
        `/finance/investments/${id}/update-value`,
        data
      );
      return response.investment;
    },
    onSuccess: () => {
      // Invalidate investments list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.investments() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
