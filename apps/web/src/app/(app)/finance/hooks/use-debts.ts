'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import { financeKeys } from './use-finance';
import type {
  DebtResponse,
  DebtsListResponse,
  CreateDebtInput,
  UpdateDebtInput,
  NegotiateDebtInput,
  DebtQueryParams,
} from '../types';

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch debts list with optional filters
 *
 * @param params - Query parameters for filtering
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useDebts(params: DebtQueryParams = {}) {
  const api = useAuthenticatedApi();
  const { monthYear, status, isNegotiated, limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: financeKeys.debtsList({ monthYear, status, isNegotiated, limit, offset }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (monthYear) searchParams.set('monthYear', monthYear);
      if (status) searchParams.set('status', status);
      if (isNegotiated !== undefined) searchParams.set('isNegotiated', String(isNegotiated));
      if (limit) searchParams.set('limit', String(limit));
      if (offset) searchParams.set('offset', String(offset));

      const query = searchParams.toString();
      const response = await api.get<DebtsListResponse>(
        `/finance/debts${query ? `?${query}` : ''}`
      );
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch ALL debts without month filtering
 * Used for global KPIs/summary that should show total debt situation
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useAllDebts() {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: financeKeys.debtsList({ monthYear: undefined, limit: 100, offset: 0 }),
    queryFn: async () => {
      const response = await api.get<DebtsListResponse>('/finance/debts?limit=100');
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch single debt by ID
 *
 * @param id - Debt ID
 */
export function useDebt(id: string | undefined) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.debts(), id],
    queryFn: async () => {
      const response = await api.get<DebtResponse>(`/finance/debts/${id}`);
      return response.debt;
    },
    enabled: api.isAuthenticated && !!id,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to create a new debt
 */
export function useCreateDebt() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDebtInput) => {
      const response = await api.post<DebtResponse>('/finance/debts', data);
      return response.debt;
    },
    onSuccess: () => {
      // Invalidate debts list and all summaries (debts affect all months)
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/**
 * Hook to update an existing debt
 */
export function useUpdateDebt() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDebtInput }) => {
      const response = await api.patch<DebtResponse>(`/finance/debts/${id}`, data);
      return response.debt;
    },
    onSuccess: () => {
      // Invalidate debts list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/**
 * Hook to delete a debt
 */
export function useDeleteDebt() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/finance/debts/${id}`);
      return id;
    },
    onSuccess: () => {
      // Invalidate debts list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/**
 * Hook to pay installment(s) on a negotiated debt
 * Increments currentInstallment and auto-closes if fully paid
 *
 * @param id - Debt ID
 * @param quantity - Number of installments to pay (default: 1)
 */
export function usePayInstallment() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity = 1 }: { id: string; quantity?: number }) => {
      const response = await api.patch<DebtResponse>(`/finance/debts/${id}/pay-installment`, { quantity });
      return response.debt;
    },
    onSuccess: () => {
      // Invalidate debts list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

/**
 * Hook to negotiate a pending (non-negotiated) debt
 * Sets installment details and marks as negotiated
 */
export function useNegotiateDebt() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: NegotiateDebtInput }) => {
      const response = await api.patch<DebtResponse>(`/finance/debts/${id}/negotiate`, data);
      return response.debt;
    },
    onSuccess: () => {
      // Invalidate debts list and all summaries
      queryClient.invalidateQueries({ queryKey: financeKeys.debts() });
      queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
