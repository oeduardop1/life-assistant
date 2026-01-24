'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import { financeKeys } from './use-finance';
import type {
  Income,
  IncomeResponse,
  IncomesListResponse,
  CreateIncomeInput,
  UpdateIncomeInput,
  IncomeQueryParams,
} from '../types';

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch incomes list with optional filters
 *
 * @param params - Query parameters for filtering
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useIncomes(params: IncomeQueryParams = {}) {
  const api = useAuthenticatedApi();
  const { monthYear, type, isRecurring, limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: financeKeys.incomesList({ monthYear, type, isRecurring, limit, offset }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (monthYear) searchParams.set('monthYear', monthYear);
      if (type) searchParams.set('type', type);
      if (isRecurring !== undefined) searchParams.set('isRecurring', String(isRecurring));
      if (limit) searchParams.set('limit', String(limit));
      if (offset) searchParams.set('offset', String(offset));

      const query = searchParams.toString();
      const response = await api.get<IncomesListResponse>(
        `/finance/incomes${query ? `?${query}` : ''}`
      );
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch single income by ID
 *
 * @param id - Income ID
 */
export function useIncome(id: string | undefined) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.incomes(), id],
    queryFn: async () => {
      const response = await api.get<IncomeResponse>(`/finance/incomes/${id}`);
      return response.income;
    },
    enabled: api.isAuthenticated && !!id,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to create a new income
 */
export function useCreateIncome() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateIncomeInput) => {
      const response = await api.post<IncomeResponse>('/finance/incomes', data);
      return response.income;
    },
    onSuccess: (_, variables) => {
      // Invalidate incomes list and summary for the month
      queryClient.invalidateQueries({ queryKey: financeKeys.incomes() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

/**
 * Hook to update an existing income
 */
export function useUpdateIncome() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIncomeInput }) => {
      const response = await api.patch<IncomeResponse>(`/finance/incomes/${id}`, data);
      return response.income;
    },
    onSuccess: (income) => {
      // Invalidate incomes list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.incomes() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(income.monthYear) });
    },
  });
}

/**
 * Hook to delete an income
 */
export function useDeleteIncome() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, monthYear }: { id: string; monthYear: string }) => {
      await api.delete(`/finance/incomes/${id}`);
      return { id, monthYear };
    },
    onSuccess: (_, variables) => {
      // Invalidate incomes list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.incomes() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

// =============================================================================
// Computed Helpers
// =============================================================================

/**
 * Income totals structure
 */
export interface IncomeTotals {
  totalExpected: number;
  totalActual: number;
  count: number;
  recurringCount: number;
}

/**
 * Calculate income totals from list
 *
 * @param incomes - List of incomes
 * @returns Aggregated totals
 */
export function calculateIncomeTotals(incomes: Income[]): IncomeTotals {
  return incomes.reduce(
    (acc, income) => {
      const expected = typeof income.expectedAmount === 'string' ? parseFloat(income.expectedAmount) : income.expectedAmount;
      const actual = income.actualAmount
        ? (typeof income.actualAmount === 'string' ? parseFloat(income.actualAmount) : income.actualAmount)
        : 0;
      return {
        totalExpected: acc.totalExpected + expected,
        totalActual: acc.totalActual + actual,
        count: acc.count + 1,
        recurringCount: acc.recurringCount + (income.isRecurring ? 1 : 0),
      };
    },
    { totalExpected: 0, totalActual: 0, count: 0, recurringCount: 0 }
  );
}

/**
 * Variance calculation result
 */
export interface VarianceResult {
  value: number;
  percentage: number;
}

/**
 * Calculate variance between expected and actual values
 *
 * @param expected - Expected value
 * @param actual - Actual value
 * @returns Variance value and percentage
 */
export function calculateVariance(expected: number, actual: number): VarianceResult {
  if (expected === 0) return { value: actual, percentage: actual > 0 ? 100 : 0 };
  const value = actual - expected;
  const percentage = (value / expected) * 100;
  return { value, percentage };
}
