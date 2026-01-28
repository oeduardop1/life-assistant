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
  DebtPaymentHistoryResponse,
  UpcomingInstallmentsResponse,
  DebtProjectionResponse,
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

/**
 * Hook to fetch payment history for a specific debt
 *
 * Returns all payments made on the debt, including:
 * - Which month each installment belongs to (monthYear)
 * - When each payment was actually made (paidAt)
 * - Whether payment was made early (paidEarly)
 *
 * @param debtId - Debt ID
 * @param params - Query parameters (limit, offset)
 */
export function useDebtPaymentHistory(
  debtId: string | undefined,
  params: { limit?: number; offset?: number } = {}
) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.debts(), debtId, 'payments', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
      if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

      const query = searchParams.toString();
      const response = await api.get<DebtPaymentHistoryResponse>(
        `/finance/debts/${debtId}/payments${query ? `?${query}` : ''}`
      );
      return response;
    },
    enabled: api.isAuthenticated && !!debtId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch upcoming installments for a specific month
 *
 * Returns all debt installments due in the specified month (or current month),
 * including their payment status (pending, paid, paid_early, overdue).
 *
 * @param monthYear - Month to query (YYYY-MM format). If omitted, uses current month.
 */
export function useUpcomingInstallments(monthYear?: string) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.debts(), 'upcoming-installments', monthYear],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (monthYear) searchParams.set('monthYear', monthYear);

      const query = searchParams.toString();
      const response = await api.get<UpcomingInstallmentsResponse>(
        `/finance/debts/upcoming-installments${query ? `?${query}` : ''}`
      );
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch payoff projection for a specific debt
 *
 * Calculates estimated payoff date based on payment history velocity.
 * Returns projection with estimated payoff month, remaining months, and velocity info.
 *
 * @param debtId - Debt ID
 */
export function useDebtProjection(debtId: string | undefined) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.debts(), debtId, 'projection'],
    queryFn: async () => {
      const response = await api.get<DebtProjectionResponse>(
        `/finance/debts/${debtId}/projection`
      );
      return response.projection;
    },
    enabled: api.isAuthenticated && !!debtId,
    staleTime: 5 * 60 * 1000, // 5 minutes (projections don't change often)
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
    onMutate: async ({ id, quantity = 1 }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: financeKeys.debts() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData<DebtsListResponse>({
        queryKey: financeKeys.debts(),
      });

      // Optimistically update the cache
      // Note: financeKeys.debts() matches multiple query types (debts list, upcoming-installments, etc.)
      // We only want to update DebtsListResponse queries that have a 'debts' array
      queryClient.setQueriesData<DebtsListResponse>(
        { queryKey: financeKeys.debts() },
        (old) => {
          if (!old || !('debts' in old) || !Array.isArray(old.debts)) return old;
          return {
            ...old,
            debts: old.debts.map((debt) => {
              if (debt.id !== id) return debt;

              const newCurrentInstallment = debt.currentInstallment + quantity;
              const isNowPaidOff = debt.totalInstallments
                ? newCurrentInstallment > debt.totalInstallments
                : false;

              return {
                ...debt,
                currentInstallment: newCurrentInstallment,
                status: isNowPaidOff ? ('paid_off' as const) : debt.status,
              };
            }),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      // Always refetch after error or success
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
