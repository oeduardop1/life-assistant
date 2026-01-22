import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useBills,
  useBill,
  useCreateBill,
  useUpdateBill,
  useDeleteBill,
  useMarkBillPaid,
  useMarkBillUnpaid,
  calculateBillTotals,
} from '../../hooks/use-bills';
import type { Bill, BillsListResponse, BillResponse } from '../../types';

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

const mockBill: Bill = {
  id: 'bill-1',
  userId: 'user-1',
  name: 'Aluguel',
  category: 'housing',
  amount: 1500,
  dueDay: 10,
  status: 'pending',
  paidAt: null,
  isRecurring: true,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockBill2: Bill = {
  id: 'bill-2',
  userId: 'user-1',
  name: 'Netflix',
  category: 'subscription',
  amount: 39.9,
  dueDay: 15,
  status: 'paid',
  paidAt: '2026-01-15T10:00:00Z',
  isRecurring: true,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-02T00:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockBill3: Bill = {
  id: 'bill-3',
  userId: 'user-1',
  name: 'Conta de Luz',
  category: 'utilities',
  amount: 200,
  dueDay: 5,
  status: 'overdue',
  paidAt: null,
  isRecurring: true,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockBillsList: BillsListResponse = {
  bills: [mockBill, mockBill2, mockBill3],
  total: 3,
};

// =============================================================================
// useBills Tests
// =============================================================================

describe('useBills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_bills_with_month_filter', async () => {
    mockGet.mockResolvedValue(mockBillsList);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBills({ monthYear: '2026-01' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/bills?monthYear=2026-01&limit=50');
    expect(result.current.data).toEqual(mockBillsList);
  });

  it('should_fetch_bills_with_all_filters', async () => {
    mockGet.mockResolvedValue(mockBillsList);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useBills({
          monthYear: '2026-01',
          category: 'housing',
          status: 'pending',
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
      '/finance/bills?monthYear=2026-01&category=housing&status=pending&isRecurring=true&limit=10&offset=5'
    );
  });

  it('should_handle_loading_state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBills({ monthYear: '2026-01' }), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should_handle_error_state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBills({ monthYear: '2026-01' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useBill Tests
// =============================================================================

describe('useBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_single_bill_by_id', async () => {
    const response: BillResponse = { bill: mockBill };
    mockGet.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBill('bill-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/bills/bill-1');
    expect(result.current.data).toEqual(mockBill);
  });

  it('should_not_fetch_when_id_is_undefined', () => {
    const wrapper = createWrapper();
    renderHook(() => useBill(undefined), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

// =============================================================================
// useCreateBill Tests
// =============================================================================

describe('useCreateBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_create_bill_and_return_result', async () => {
    const response: BillResponse = { bill: mockBill };
    mockPost.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateBill(), { wrapper });

    await act(async () => {
      const created = await result.current.mutateAsync({
        name: 'Aluguel',
        category: 'housing',
        amount: 1500,
        dueDay: 10,
        monthYear: '2026-01',
      });
      expect(created).toEqual(mockBill);
    });

    expect(mockPost).toHaveBeenCalledWith('/finance/bills', {
      name: 'Aluguel',
      category: 'housing',
      amount: 1500,
      dueDay: 10,
      monthYear: '2026-01',
    });
  });

  it('should_handle_create_error', async () => {
    mockPost.mockRejectedValue(new Error('Create failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateBill(), { wrapper });

    let errorMessage = '';
    await act(async () => {
      try {
        await result.current.mutateAsync({
          name: 'Test',
          category: 'other',
          amount: 100,
          dueDay: 1,
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
// useUpdateBill Tests
// =============================================================================

describe('useUpdateBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_update_bill_and_return_result', async () => {
    const updatedBill = { ...mockBill, name: 'Aluguel Atualizado' };
    const response: BillResponse = { bill: updatedBill };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateBill(), { wrapper });

    await act(async () => {
      const updated = await result.current.mutateAsync({
        id: 'bill-1',
        data: { name: 'Aluguel Atualizado' },
      });
      expect(updated).toEqual(updatedBill);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/bills/bill-1', {
      name: 'Aluguel Atualizado',
    });
  });
});

// =============================================================================
// useDeleteBill Tests
// =============================================================================

describe('useDeleteBill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_delete_bill_successfully', async () => {
    mockDelete.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteBill(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'bill-1', monthYear: '2026-01' });
    });

    expect(mockDelete).toHaveBeenCalledWith('/finance/bills/bill-1');
  });
});

// =============================================================================
// useMarkBillPaid Tests
// =============================================================================

describe('useMarkBillPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_mark_bill_as_paid', async () => {
    const paidBill = { ...mockBill, status: 'paid', paidAt: '2026-01-10T10:00:00Z' };
    const response: BillResponse = { bill: paidBill as Bill };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMarkBillPaid(), { wrapper });

    await act(async () => {
      const returned = await result.current.mutateAsync({
        id: 'bill-1',
        monthYear: '2026-01',
      });
      expect(returned.bill).toEqual(paidBill);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/bills/bill-1/mark-paid');
  });
});

// =============================================================================
// useMarkBillUnpaid Tests
// =============================================================================

describe('useMarkBillUnpaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_mark_bill_as_unpaid', async () => {
    const unpaidBill = { ...mockBill2, status: 'pending', paidAt: null };
    const response: BillResponse = { bill: unpaidBill as Bill };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useMarkBillUnpaid(), { wrapper });

    await act(async () => {
      const returned = await result.current.mutateAsync({
        id: 'bill-2',
        monthYear: '2026-01',
      });
      expect(returned.bill).toEqual(unpaidBill);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/bills/bill-2/mark-unpaid');
  });
});

// =============================================================================
// calculateBillTotals Tests
// =============================================================================

describe('calculateBillTotals', () => {
  it('should_calculate_totals_correctly', () => {
    const bills = [mockBill, mockBill2, mockBill3];
    const totals = calculateBillTotals(bills);

    expect(totals.total).toBeCloseTo(1739.9); // 1500 + 39.9 + 200
    expect(totals.paid).toBeCloseTo(39.9); // Only mockBill2
    expect(totals.pending).toBe(1500); // Only mockBill
    expect(totals.overdue).toBe(200); // Only mockBill3
    expect(totals.count).toBe(3);
    expect(totals.paidCount).toBe(1);
    expect(totals.pendingCount).toBe(1);
    expect(totals.overdueCount).toBe(1);
  });

  it('should_return_zeros_for_empty_list', () => {
    const totals = calculateBillTotals([]);

    expect(totals.total).toBe(0);
    expect(totals.paid).toBe(0);
    expect(totals.pending).toBe(0);
    expect(totals.overdue).toBe(0);
    expect(totals.count).toBe(0);
    expect(totals.paidCount).toBe(0);
    expect(totals.pendingCount).toBe(0);
    expect(totals.overdueCount).toBe(0);
  });

  it('should_handle_all_paid_bills', () => {
    const bills = [mockBill2]; // Only paid bill
    const totals = calculateBillTotals(bills);

    expect(totals.total).toBeCloseTo(39.9);
    expect(totals.paid).toBeCloseTo(39.9);
    expect(totals.pending).toBe(0);
    expect(totals.overdue).toBe(0);
    expect(totals.paidCount).toBe(1);
  });

  it('should_handle_all_pending_bills', () => {
    const bills = [mockBill]; // Only pending bill
    const totals = calculateBillTotals(bills);

    expect(totals.total).toBe(1500);
    expect(totals.paid).toBe(0);
    expect(totals.pending).toBe(1500);
    expect(totals.pendingCount).toBe(1);
  });

  it('should_handle_all_overdue_bills', () => {
    const bills = [mockBill3]; // Only overdue bill
    const totals = calculateBillTotals(bills);

    expect(totals.total).toBe(200);
    expect(totals.paid).toBe(0);
    expect(totals.overdue).toBe(200);
    expect(totals.overdueCount).toBe(1);
  });
});
