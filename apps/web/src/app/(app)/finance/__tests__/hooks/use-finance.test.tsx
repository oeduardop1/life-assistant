import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useFinanceSummary,
  useHasFinanceData,
  extractKPIs,
  financeKeys,
} from '../../hooks/use-finance';
import type { FinanceSummary } from '../../types';

// =============================================================================
// Mocks
// =============================================================================

const mockGet = vi.fn();

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: mockGet,
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    isAuthenticated: true,
  }),
}));

// =============================================================================
// Test Helpers
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  function TestQueryProvider({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return TestQueryProvider;
}

const mockSummary: FinanceSummary = {
  monthYear: '2026-01',
  totalIncomeExpected: 5000,
  totalIncomeActual: 4800,
  totalBills: 2000,
  billsCount: {
    total: 5,
    pending: 2,
    paid: 3,
    overdue: 0,
    canceled: 0,
  },
  totalExpensesExpected: 1500,
  totalExpensesActual: 1200,
  totalBudgeted: 3500,
  totalSpent: 3200,
  balance: 1600,
  debts: {
    totalDebts: 2,
    totalAmount: 10000,
    totalPaid: 4000,
    totalRemaining: 6000,
    negotiatedCount: 1,
    monthlyInstallmentSum: 500,
  },
  investments: {
    totalInvestments: 3,
    totalCurrentAmount: 15000,
    totalGoalAmount: 50000,
    totalMonthlyContribution: 1000,
    averageProgress: 30,
  },
};

// =============================================================================
// financeKeys Tests
// =============================================================================

describe('financeKeys', () => {
  it('should_generate_correct_all_key', () => {
    expect(financeKeys.all).toEqual(['finance']);
  });

  it('should_generate_correct_summary_key', () => {
    expect(financeKeys.summary('2026-01')).toEqual(['finance', 'summary', '2026-01']);
  });

  it('should_generate_correct_incomes_key', () => {
    expect(financeKeys.incomes()).toEqual(['finance', 'incomes']);
  });

  it('should_generate_correct_incomesList_key', () => {
    expect(financeKeys.incomesList({ monthYear: '2026-01' })).toEqual([
      'finance',
      'incomes',
      { monthYear: '2026-01' },
    ]);
  });

  it('should_generate_correct_bills_key', () => {
    expect(financeKeys.bills()).toEqual(['finance', 'bills']);
  });

  it('should_generate_correct_debts_key', () => {
    expect(financeKeys.debts()).toEqual(['finance', 'debts']);
  });

  it('should_generate_correct_investments_key', () => {
    expect(financeKeys.investments()).toEqual(['finance', 'investments']);
  });
});

// =============================================================================
// useFinanceSummary Tests
// =============================================================================

describe('useFinanceSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_summary_with_correct_params', async () => {
    mockGet.mockResolvedValue({ summary: mockSummary });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFinanceSummary('2026-01'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/summary?monthYear=2026-01');
    expect(result.current.data).toEqual(mockSummary);
  });

  it('should_handle_loading_state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFinanceSummary('2026-01'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should_handle_error_state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFinanceSummary('2026-01'), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should_not_fetch_when_monthYear_is_empty', () => {
    const wrapper = createWrapper();
    renderHook(() => useFinanceSummary(''), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

// =============================================================================
// useHasFinanceData Tests
// =============================================================================

describe('useHasFinanceData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_return_hasData_true_when_income_exists', async () => {
    mockGet.mockResolvedValue({ summary: mockSummary });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useHasFinanceData('2026-01'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasData).toBe(true);
    expect(result.current.summary).toEqual(mockSummary);
  });

  it('should_return_hasData_false_when_no_data', async () => {
    const emptySummary: FinanceSummary = {
      ...mockSummary,
      totalIncomeExpected: 0,
      totalIncomeActual: 0,
      totalBills: 0,
      billsCount: { total: 0, pending: 0, paid: 0, overdue: 0, canceled: 0 },
      totalExpensesExpected: 0,
      totalExpensesActual: 0,
      debts: { ...mockSummary.debts, totalDebts: 0 },
      investments: { ...mockSummary.investments, totalInvestments: 0 },
    };
    mockGet.mockResolvedValue({ summary: emptySummary });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useHasFinanceData('2026-01'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasData).toBe(false);
  });

  it('should_return_hasData_true_when_only_debts_exist', async () => {
    const debtOnlySummary: FinanceSummary = {
      ...mockSummary,
      totalIncomeExpected: 0,
      totalIncomeActual: 0,
      totalBills: 0,
      billsCount: { total: 0, pending: 0, paid: 0, overdue: 0, canceled: 0 },
      totalExpensesExpected: 0,
      totalExpensesActual: 0,
      debts: { ...mockSummary.debts, totalDebts: 1 },
      investments: { ...mockSummary.investments, totalInvestments: 0 },
    };
    mockGet.mockResolvedValue({ summary: debtOnlySummary });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useHasFinanceData('2026-01'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasData).toBe(true);
  });
});

// =============================================================================
// extractKPIs Tests
// =============================================================================

describe('extractKPIs', () => {
  it('should_return_null_when_summary_is_undefined', () => {
    expect(extractKPIs(undefined)).toBeNull();
  });

  it('should_extract_income_kpis', () => {
    const result = extractKPIs(mockSummary);

    expect(result?.income).toEqual({
      expected: 5000,
      actual: 4800,
    });
  });

  it('should_extract_budget_kpis', () => {
    const result = extractKPIs(mockSummary);

    expect(result?.budget).toEqual({
      budgeted: 3500,
      spent: 3200,
    });
  });

  it('should_extract_balance', () => {
    const result = extractKPIs(mockSummary);

    expect(result?.balance).toBe(1600);
  });

  it('should_extract_bills_kpis', () => {
    const result = extractKPIs(mockSummary);

    expect(result?.bills).toEqual({
      total: 2000,
      count: mockSummary.billsCount,
    });
  });

  it('should_extract_debts_kpis', () => {
    const result = extractKPIs(mockSummary);

    expect(result?.debts).toEqual({
      totalDebts: 2,
      totalAmount: 10000,
      totalPaid: 4000,
      totalRemaining: 6000,
      monthlyInstallment: 500,
    });
  });

  it('should_extract_investments_kpis', () => {
    const result = extractKPIs(mockSummary);

    expect(result?.investments).toEqual({
      totalInvestments: 3,
      currentAmount: 15000,
      goalAmount: 50000,
      monthlyContribution: 1000,
      progress: 30,
    });
  });
});
