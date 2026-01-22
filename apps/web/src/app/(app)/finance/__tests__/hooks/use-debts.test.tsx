import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useDebts,
  useDebt,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  usePayInstallment,
  useNegotiateDebt,
} from '../../hooks/use-debts';
import type { Debt, DebtsListResponse, DebtResponse } from '../../types';

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

const mockDebtNegotiated: Debt = {
  id: 'debt-1',
  userId: 'user-1',
  name: 'Financiamento Carro',
  creditor: 'Banco XYZ',
  totalAmount: 48000,
  isNegotiated: true,
  totalInstallments: 48,
  installmentAmount: 1200,
  currentInstallment: 13, // 12 already paid
  dueDay: 15,
  status: 'active',
  notes: null,
  currency: 'BRL',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockDebtPending: Debt = {
  id: 'debt-2',
  userId: 'user-1',
  name: 'Dívida Cartão',
  creditor: 'Banco ABC',
  totalAmount: 5000,
  isNegotiated: false,
  totalInstallments: null,
  installmentAmount: null,
  currentInstallment: 1,
  dueDay: null,
  status: 'active',
  notes: 'Pendente de negociação',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockDebtPaidOff: Debt = {
  id: 'debt-3',
  userId: 'user-1',
  name: 'Empréstimo Pessoal',
  creditor: null,
  totalAmount: 3000,
  isNegotiated: true,
  totalInstallments: 6,
  installmentAmount: 550,
  currentInstallment: 7,
  dueDay: 10,
  status: 'paid_off',
  notes: null,
  currency: 'BRL',
  createdAt: '2025-06-01T00:00:00Z',
  updatedAt: '2025-12-10T10:00:00Z',
};

const mockDebtsList: DebtsListResponse = {
  debts: [mockDebtNegotiated, mockDebtPending, mockDebtPaidOff],
  total: 3,
};

// =============================================================================
// useDebts Tests
// =============================================================================

describe('useDebts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_all_debts', async () => {
    mockGet.mockResolvedValue(mockDebtsList);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDebts(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/debts?limit=50');
    expect(result.current.data).toEqual(mockDebtsList);
  });

  it('should_fetch_debts_with_filters', async () => {
    mockGet.mockResolvedValue(mockDebtsList);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useDebts({
          status: 'active',
          isNegotiated: true,
          limit: 10,
          offset: 5,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/finance/debts?status=active&isNegotiated=true&limit=10&offset=5'
    );
  });

  it('should_handle_loading_state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDebts(), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should_handle_error_state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDebts(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useDebt Tests
// =============================================================================

describe('useDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_single_debt_by_id', async () => {
    const response: DebtResponse = { debt: mockDebtNegotiated };
    mockGet.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDebt('debt-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/debts/debt-1');
    expect(result.current.data).toEqual(mockDebtNegotiated);
  });

  it('should_not_fetch_when_id_is_undefined', () => {
    const wrapper = createWrapper();
    renderHook(() => useDebt(undefined), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

// =============================================================================
// useCreateDebt Tests
// =============================================================================

describe('useCreateDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_create_negotiated_debt', async () => {
    const response: DebtResponse = { debt: mockDebtNegotiated };
    mockPost.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateDebt(), { wrapper });

    await act(async () => {
      const created = await result.current.mutateAsync({
        name: 'Financiamento Carro',
        creditor: 'Banco XYZ',
        totalAmount: 48000,
        isNegotiated: true,
        totalInstallments: 48,
        installmentAmount: 1200,
        dueDay: 15,
      });
      expect(created).toEqual(mockDebtNegotiated);
    });

    expect(mockPost).toHaveBeenCalledWith('/finance/debts', {
      name: 'Financiamento Carro',
      creditor: 'Banco XYZ',
      totalAmount: 48000,
      isNegotiated: true,
      totalInstallments: 48,
      installmentAmount: 1200,
      dueDay: 15,
    });
  });

  it('should_create_pending_debt', async () => {
    const response: DebtResponse = { debt: mockDebtPending };
    mockPost.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateDebt(), { wrapper });

    await act(async () => {
      const created = await result.current.mutateAsync({
        name: 'Dívida Cartão',
        creditor: 'Banco ABC',
        totalAmount: 5000,
        isNegotiated: false,
        notes: 'Pendente de negociação',
      });
      expect(created).toEqual(mockDebtPending);
    });
  });

  it('should_handle_create_error', async () => {
    mockPost.mockRejectedValue(new Error('Create failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateDebt(), { wrapper });

    let errorMessage = '';
    await act(async () => {
      try {
        await result.current.mutateAsync({
          name: 'Test',
          totalAmount: 1000,
        });
      } catch (e) {
        errorMessage = (e as Error).message;
      }
    });

    expect(errorMessage).toBe('Create failed');
  });
});

// =============================================================================
// useUpdateDebt Tests
// =============================================================================

describe('useUpdateDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_update_debt_and_return_result', async () => {
    const updatedDebt = { ...mockDebtNegotiated, name: 'Financiamento Atualizado' };
    const response: DebtResponse = { debt: updatedDebt };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateDebt(), { wrapper });

    await act(async () => {
      const updated = await result.current.mutateAsync({
        id: 'debt-1',
        data: { name: 'Financiamento Atualizado' },
      });
      expect(updated).toEqual(updatedDebt);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/debts/debt-1', {
      name: 'Financiamento Atualizado',
    });
  });
});

// =============================================================================
// useDeleteDebt Tests
// =============================================================================

describe('useDeleteDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_delete_debt_successfully', async () => {
    mockDelete.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteDebt(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('debt-1');
    });

    expect(mockDelete).toHaveBeenCalledWith('/finance/debts/debt-1');
  });
});

// =============================================================================
// usePayInstallment Tests
// =============================================================================

describe('usePayInstallment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_pay_installment_and_increment_counter', async () => {
    const paidDebt = { ...mockDebtNegotiated, currentInstallment: 14 };
    const response: DebtResponse = { debt: paidDebt };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePayInstallment(), { wrapper });

    await act(async () => {
      const returned = await result.current.mutateAsync('debt-1');
      expect(returned).toEqual(paidDebt);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/debts/debt-1/pay-installment');
  });

  it('should_mark_as_paid_off_when_last_installment', async () => {
    const lastInstallmentDebt = {
      ...mockDebtNegotiated,
      currentInstallment: 48,
      totalInstallments: 48
    };
    const paidOffDebt = {
      ...lastInstallmentDebt,
      status: 'paid_off' as const,
      currentInstallment: 49
    };
    const response: DebtResponse = { debt: paidOffDebt };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePayInstallment(), { wrapper });

    await act(async () => {
      const returned = await result.current.mutateAsync('debt-1');
      expect(returned.status).toBe('paid_off');
    });
  });
});

// =============================================================================
// useNegotiateDebt Tests
// =============================================================================

describe('useNegotiateDebt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_negotiate_pending_debt', async () => {
    const negotiatedDebt: Debt = {
      ...mockDebtPending,
      isNegotiated: true,
      totalInstallments: 10,
      installmentAmount: 550,
      dueDay: 20,
    };
    const response: DebtResponse = { debt: negotiatedDebt };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useNegotiateDebt(), { wrapper });

    await act(async () => {
      const returned = await result.current.mutateAsync({
        id: 'debt-2',
        data: {
          totalInstallments: 10,
          installmentAmount: 550,
          dueDay: 20,
        },
      });
      expect(returned.isNegotiated).toBe(true);
      expect(returned.totalInstallments).toBe(10);
      expect(returned.installmentAmount).toBe(550);
      expect(returned.dueDay).toBe(20);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/debts/debt-2/negotiate', {
      totalInstallments: 10,
      installmentAmount: 550,
      dueDay: 20,
    });
  });
});
