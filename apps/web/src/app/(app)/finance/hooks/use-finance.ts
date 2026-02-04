'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { getCurrentMonthInTimezone } from '@life-assistant/shared';
import type {
  FinanceSummary,
  FinanceSummaryResponse,
  MonthlyEvolutionResponse,
} from '../types';

// =============================================================================
// Query Keys (Query Key Factory Pattern)
// =============================================================================

export const financeKeys = {
  all: ['finance'] as const,
  summary: (monthYear: string) => [...financeKeys.all, 'summary', monthYear] as const,
  evolution: (endMonth: string, months: number) =>
    [...financeKeys.all, 'evolution', endMonth, months] as const,
  incomes: () => [...financeKeys.all, 'incomes'] as const,
  incomesList: (params: Record<string, unknown>) => [...financeKeys.incomes(), params] as const,
  bills: () => [...financeKeys.all, 'bills'] as const,
  billsList: (params: Record<string, unknown>) => [...financeKeys.bills(), params] as const,
  expenses: () => [...financeKeys.all, 'expenses'] as const,
  expensesList: (params: Record<string, unknown>) => [...financeKeys.expenses(), params] as const,
  debts: () => [...financeKeys.all, 'debts'] as const,
  debtsList: (params: Record<string, unknown>) => [...financeKeys.debts(), params] as const,
  investments: () => [...financeKeys.all, 'investments'] as const,
  investmentsList: (params: Record<string, unknown>) => [...financeKeys.investments(), params] as const,
};

// =============================================================================
// Finance Summary
// =============================================================================

/**
 * Hook to fetch finance summary for a given month
 *
 * @param monthYear - Month in YYYY-MM format (defaults to current month)
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function useFinanceSummary(monthYear: string) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: financeKeys.summary(monthYear),
    queryFn: async () => {
      const response = await api.get<FinanceSummaryResponse>(
        `/finance/summary?monthYear=${monthYear}`
      );
      return response.summary;
    },
    enabled: api.isAuthenticated && !!monthYear,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch monthly evolution history (last N months)
 *
 * @param endMonth - End month in YYYY-MM format (defaults to current month)
 * @param months - Number of months to retrieve (default 6)
 */
export function useMonthlyEvolution(endMonth?: string, months = 6) {
  const api = useAuthenticatedApi();
  const timezone = useUserTimezone();
  const targetMonth = endMonth ?? getCurrentMonthInTimezone(timezone);

  return useQuery({
    queryKey: financeKeys.evolution(targetMonth, months),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (endMonth) params.set('endMonth', endMonth);
      params.set('months', String(months));

      const response = await api.get<MonthlyEvolutionResponse>(
        `/finance/summary/history?${params.toString()}`
      );
      return response;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to check if user has any finance data
 */
export function useHasFinanceData(monthYear: string) {
  const { data: summary, isLoading } = useFinanceSummary(monthYear);

  // Consider has data if there's any income, bill, expense, debt, or investment
  const hasData =
    summary &&
    (summary.totalIncomeExpected > 0 ||
      summary.totalIncomeActual > 0 ||
      summary.totalBills > 0 ||
      summary.billsCount.total > 0 ||
      summary.totalExpensesExpected > 0 ||
      summary.totalExpensesActual > 0 ||
      summary.debts.totalDebts > 0 ||
      summary.investments.totalInvestments > 0);

  return {
    hasData: !!hasData,
    isLoading,
    summary,
  };
}

// =============================================================================
// KPI Helpers
// =============================================================================

/**
 * Extract KPIs from finance summary for dashboard display
 */
export function extractKPIs(summary: FinanceSummary | undefined) {
  if (!summary) return null;

  return {
    income: {
      expected: summary.totalIncomeExpected,
      actual: summary.totalIncomeActual,
    },
    budget: {
      budgeted: summary.totalBudgeted,
      spent: summary.totalSpent,
    },
    balance: summary.balance,
    bills: {
      total: summary.totalBills,
      count: summary.billsCount,
    },
    expenses: {
      expected: summary.totalExpensesExpected,
      actual: summary.totalExpensesActual,
    },
    debts: {
      totalDebts: summary.debts.totalDebts,
      totalAmount: summary.debts.totalAmount,
      totalPaid: summary.debts.totalPaid,
      totalRemaining: summary.debts.totalRemaining,
      monthlyInstallment: summary.debts.monthlyInstallmentSum,
    },
    investments: {
      totalInvestments: summary.investments.totalInvestments,
      currentAmount: summary.investments.totalCurrentAmount,
      goalAmount: summary.investments.totalGoalAmount,
      monthlyContribution: summary.investments.totalMonthlyContribution,
      progress: summary.investments.averageProgress,
    },
  };
}
