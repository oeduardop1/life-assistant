import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useIncomes,
  useIncome,
  useCreateIncome,
  useUpdateIncome,
  useDeleteIncome,
  calculateIncomeTotals,
  calculateVariance,
} from '../../hooks/use-incomes';
import type { Income, IncomesListResponse, IncomeResponse } from '../../types';

// =============================================================================
// Mocks
// =============================================================================

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    delete: mockDelete,
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
      mutations: {
        retry: false,
      },
    },
  });

  function TestQueryProvider({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return TestQueryProvider;
}

const mockIncome: Income = {
  id: 'income-1',
  userId: 'user-1',
  name: 'Salário',
  type: 'salary',
  frequency: 'monthly',
  expectedAmount: 5000,
  actualAmount: 5000,
  isRecurring: true,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockIncome2: Income = {
  id: 'income-2',
  userId: 'user-1',
  name: 'Freelance',
  type: 'freelance',
  frequency: 'irregular',
  expectedAmount: 2000,
  actualAmount: null,
  isRecurring: false,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const mockIncomesList: IncomesListResponse = {
  incomes: [mockIncome, mockIncome2],
  total: 2,
};

// =============================================================================
// useIncomes Tests
// =============================================================================

describe('useIncomes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_incomes_with_month_filter', async () => {
    mockGet.mockResolvedValue(mockIncomesList);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useIncomes({ monthYear: '2026-01' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Note: offset=0 is not included because 0 is falsy in the hook
    expect(mockGet).toHaveBeenCalledWith('/finance/incomes?monthYear=2026-01&limit=50');
    expect(result.current.data).toEqual(mockIncomesList);
  });

  it('should_fetch_incomes_with_all_filters', async () => {
    mockGet.mockResolvedValue(mockIncomesList);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useIncomes({
          monthYear: '2026-01',
          type: 'salary',
          isRecurring: true,
          limit: 10,
          offset: 5,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/finance/incomes?monthYear=2026-01&type=salary&isRecurring=true&limit=10&offset=5'
    );
  });

  it('should_handle_loading_state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = createWrapper();
    const { result } = renderHook(() => useIncomes({ monthYear: '2026-01' }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should_handle_error_state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useIncomes({ monthYear: '2026-01' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useIncome Tests
// =============================================================================

describe('useIncome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_single_income_by_id', async () => {
    const response: IncomeResponse = { income: mockIncome };
    mockGet.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useIncome('income-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/incomes/income-1');
    expect(result.current.data).toEqual(mockIncome);
  });

  it('should_not_fetch_when_id_is_undefined', () => {
    const wrapper = createWrapper();
    renderHook(() => useIncome(undefined), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

// =============================================================================
// useCreateIncome Tests
// =============================================================================

describe('useCreateIncome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_create_income_and_return_result', async () => {
    const response: IncomeResponse = { income: mockIncome };
    mockPost.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateIncome(), { wrapper });

    await act(async () => {
      const created = await result.current.mutateAsync({
        name: 'Salário',
        type: 'salary',
        frequency: 'monthly',
        expectedAmount: 5000,
        monthYear: '2026-01',
      });
      expect(created).toEqual(mockIncome);
    });

    expect(mockPost).toHaveBeenCalledWith('/finance/incomes', {
      name: 'Salário',
      type: 'salary',
      frequency: 'monthly',
      expectedAmount: 5000,
      monthYear: '2026-01',
    });
  });

  it('should_handle_create_error', async () => {
    mockPost.mockRejectedValue(new Error('Create failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateIncome(), { wrapper });

    let errorMessage = '';
    await act(async () => {
      try {
        await result.current.mutateAsync({
          name: 'Test',
          type: 'other',
          frequency: 'monthly',
          expectedAmount: 100,
          monthYear: '2026-01',
        });
      } catch (e) {
        errorMessage = (e as Error).message;
      }
    });

    expect(errorMessage).toBe('Create failed');
  });
});

// =============================================================================
// useUpdateIncome Tests
// =============================================================================

describe('useUpdateIncome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_update_income_and_return_result', async () => {
    const updatedIncome = { ...mockIncome, name: 'Salário Atualizado' };
    const response: IncomeResponse = { income: updatedIncome };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateIncome(), { wrapper });

    await act(async () => {
      const updated = await result.current.mutateAsync({
        id: 'income-1',
        data: { name: 'Salário Atualizado' },
      });
      expect(updated).toEqual(updatedIncome);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/incomes/income-1', {
      name: 'Salário Atualizado',
    });
  });
});

// =============================================================================
// useDeleteIncome Tests
// =============================================================================

describe('useDeleteIncome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_delete_income_successfully', async () => {
    mockDelete.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteIncome(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'income-1', monthYear: '2026-01' });
    });

    expect(mockDelete).toHaveBeenCalledWith('/finance/incomes/income-1');
  });
});

// =============================================================================
// calculateIncomeTotals Tests
// =============================================================================

describe('calculateIncomeTotals', () => {
  it('should_calculate_totals_correctly', () => {
    const incomes = [mockIncome, mockIncome2];
    const totals = calculateIncomeTotals(incomes);

    expect(totals.totalExpected).toBe(7000); // 5000 + 2000
    expect(totals.totalActual).toBe(5000); // 5000 + 0 (null)
    expect(totals.count).toBe(2);
    expect(totals.recurringCount).toBe(1);
  });

  it('should_return_zeros_for_empty_list', () => {
    const totals = calculateIncomeTotals([]);

    expect(totals.totalExpected).toBe(0);
    expect(totals.totalActual).toBe(0);
    expect(totals.count).toBe(0);
    expect(totals.recurringCount).toBe(0);
  });

  it('should_handle_null_actual_amounts', () => {
    const incomes = [mockIncome2]; // Has null actualAmount
    const totals = calculateIncomeTotals(incomes);

    expect(totals.totalExpected).toBe(2000);
    expect(totals.totalActual).toBe(0);
  });
});

// =============================================================================
// calculateVariance Tests
// =============================================================================

describe('calculateVariance', () => {
  it('should_calculate_positive_variance', () => {
    const variance = calculateVariance(1000, 1200);

    expect(variance.value).toBe(200);
    expect(variance.percentage).toBe(20);
  });

  it('should_calculate_negative_variance', () => {
    const variance = calculateVariance(1000, 800);

    expect(variance.value).toBe(-200);
    expect(variance.percentage).toBe(-20);
  });

  it('should_calculate_zero_variance', () => {
    const variance = calculateVariance(1000, 1000);

    expect(variance.value).toBe(0);
    expect(variance.percentage).toBe(0);
  });

  it('should_handle_zero_expected', () => {
    const variance = calculateVariance(0, 500);

    expect(variance.value).toBe(500);
    expect(variance.percentage).toBe(100);
  });

  it('should_handle_both_zero', () => {
    const variance = calculateVariance(0, 0);

    expect(variance.value).toBe(0);
    expect(variance.percentage).toBe(0);
  });
});
