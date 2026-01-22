'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import { financeKeys } from './use-finance';
import type {
  Expense,
  ExpenseResponse,
  ExpensesListResponse,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseQueryParams,
  ExpenseTotals,
} from '../types';

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook to fetch expenses list with optional filters
 *
 * @param params - Query parameters for filtering
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useExpenses(params: ExpenseQueryParams = {}) {
  const api = useAuthenticatedApi();
  const { monthYear, category, isRecurring, limit = 50, offset = 0 } = params;

  return useQuery({
    queryKey: financeKeys.expensesList({ monthYear, category, isRecurring, limit, offset }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (monthYear) searchParams.set('monthYear', monthYear);
      if (category) searchParams.set('category', category);
      if (isRecurring !== undefined) searchParams.set('isRecurring', String(isRecurring));
      if (limit) searchParams.set('limit', String(limit));
      if (offset) searchParams.set('offset', String(offset));

      const query = searchParams.toString();
      const response = await api.get<ExpensesListResponse>(
        `/finance/expenses${query ? `?${query}` : ''}`
      );
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch single expense by ID
 *
 * @param id - Expense ID
 */
export function useExpense(id: string | undefined) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: [...financeKeys.expenses(), id],
    queryFn: async () => {
      const response = await api.get<ExpenseResponse>(`/finance/expenses/${id}`);
      return response.expense;
    },
    enabled: api.isAuthenticated && !!id,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to create a new expense
 */
export function useCreateExpense() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpenseInput) => {
      const response = await api.post<ExpenseResponse>('/finance/expenses', data);
      return response.expense;
    },
    onSuccess: (_, variables) => {
      // Invalidate expenses list and summary for the month
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

/**
 * Hook to update an existing expense
 */
export function useUpdateExpense() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExpenseInput }) => {
      const response = await api.patch<ExpenseResponse>(`/finance/expenses/${id}`, data);
      return response.expense;
    },
    onSuccess: (expense) => {
      // Invalidate expenses list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(expense.monthYear) });
    },
  });
}

/**
 * Hook to delete an expense
 */
export function useDeleteExpense() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, monthYear }: { id: string; monthYear: string }) => {
      await api.delete(`/finance/expenses/${id}`);
      return { id, monthYear };
    },
    onSuccess: (_, variables) => {
      // Invalidate expenses list and summary
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses() });
      queryClient.invalidateQueries({ queryKey: financeKeys.summary(variables.monthYear) });
    },
  });
}

// =============================================================================
// Computed Helpers
// =============================================================================

/**
 * Calculate expense totals from list
 *
 * @param expenses - List of expenses
 * @returns Aggregated totals
 */
export function calculateExpenseTotals(expenses: Expense[]): ExpenseTotals {
  const result = expenses.reduce(
    (acc, expense) => {
      const isRecurring = expense.isRecurring;

      return {
        totalExpected: acc.totalExpected + expense.expectedAmount,
        totalActual: acc.totalActual + expense.actualAmount,
        count: acc.count + 1,
        recurringCount: acc.recurringCount + (isRecurring ? 1 : 0),
        oneTimeCount: acc.oneTimeCount + (isRecurring ? 0 : 1),
      };
    },
    {
      totalExpected: 0,
      totalActual: 0,
      count: 0,
      recurringCount: 0,
      oneTimeCount: 0,
    }
  );

  const variance = result.totalActual - result.totalExpected;
  const variancePercent =
    result.totalExpected > 0 ? (variance / result.totalExpected) * 100 : 0;

  return {
    ...result,
    variance,
    variancePercent,
  };
}
