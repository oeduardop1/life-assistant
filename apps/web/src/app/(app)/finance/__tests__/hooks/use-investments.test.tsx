import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  useInvestments,
  useInvestment,
  useCreateInvestment,
  useUpdateInvestment,
  useDeleteInvestment,
  useUpdateInvestmentValue,
} from '../../hooks/use-investments';
import type { Investment, InvestmentsListResponse, InvestmentResponse } from '../../types';

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

const mockInvestmentEmergency: Investment = {
  id: 'inv-1',
  userId: 'user-1',
  name: 'Reserva de Emergência',
  type: 'emergency_fund',
  goalAmount: '30000',
  currentAmount: '15000',
  monthlyContribution: '1000',
  deadline: '2026-12-31',
  currency: 'BRL',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockInvestmentRetirement: Investment = {
  id: 'inv-2',
  userId: 'user-1',
  name: 'Aposentadoria',
  type: 'retirement',
  goalAmount: '1000000',
  currentAmount: '50000',
  monthlyContribution: '2000',
  deadline: null,
  currency: 'BRL',
  createdAt: '2025-06-01T00:00:00Z',
  updatedAt: '2026-01-10T10:00:00Z',
};

const mockInvestmentNoGoal: Investment = {
  id: 'inv-3',
  userId: 'user-1',
  name: 'Curto Prazo',
  type: 'short_term',
  goalAmount: null,
  currentAmount: '5000',
  monthlyContribution: null,
  deadline: null,
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockInvestmentsList: InvestmentsListResponse = {
  investments: [mockInvestmentEmergency, mockInvestmentRetirement, mockInvestmentNoGoal],
  total: 3,
};

// =============================================================================
// useInvestments Tests
// =============================================================================

describe('useInvestments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_all_investments', async () => {
    mockGet.mockResolvedValue(mockInvestmentsList);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInvestments(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/investments?limit=50');
    expect(result.current.data).toEqual(mockInvestmentsList);
  });

  it('should_fetch_investments_with_filters', async () => {
    mockGet.mockResolvedValue(mockInvestmentsList);

    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useInvestments({
          type: 'emergency_fund',
          limit: 10,
          offset: 5,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/finance/investments?type=emergency_fund&limit=10&offset=5'
    );
  });

  it('should_handle_loading_state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInvestments(), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should_handle_error_state', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInvestments(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

// =============================================================================
// useInvestment Tests
// =============================================================================

describe('useInvestment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_fetch_single_investment_by_id', async () => {
    const response: InvestmentResponse = { investment: mockInvestmentEmergency };
    mockGet.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useInvestment('inv-1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGet).toHaveBeenCalledWith('/finance/investments/inv-1');
    expect(result.current.data).toEqual(mockInvestmentEmergency);
  });

  it('should_not_fetch_when_id_is_undefined', () => {
    const wrapper = createWrapper();
    renderHook(() => useInvestment(undefined), { wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

// =============================================================================
// useCreateInvestment Tests
// =============================================================================

describe('useCreateInvestment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_create_investment_with_goal', async () => {
    const response: InvestmentResponse = { investment: mockInvestmentEmergency };
    mockPost.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateInvestment(), { wrapper });

    await act(async () => {
      const created = await result.current.mutateAsync({
        name: 'Reserva de Emergência',
        type: 'emergency_fund',
        currentAmount: 15000,
        goalAmount: 30000,
        monthlyContribution: 1000,
        deadline: '2026-12-31',
      });
      expect(created).toEqual(mockInvestmentEmergency);
    });

    expect(mockPost).toHaveBeenCalledWith('/finance/investments', {
      name: 'Reserva de Emergência',
      type: 'emergency_fund',
      currentAmount: 15000,
      goalAmount: 30000,
      monthlyContribution: 1000,
      deadline: '2026-12-31',
    });
  });

  it('should_create_investment_without_goal', async () => {
    const response: InvestmentResponse = { investment: mockInvestmentNoGoal };
    mockPost.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateInvestment(), { wrapper });

    await act(async () => {
      const created = await result.current.mutateAsync({
        name: 'Curto Prazo',
        type: 'short_term',
        currentAmount: 5000,
      });
      expect(created).toEqual(mockInvestmentNoGoal);
    });
  });

  it('should_handle_create_error', async () => {
    mockPost.mockRejectedValue(new Error('Create failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateInvestment(), { wrapper });

    let errorMessage = '';
    await act(async () => {
      try {
        await result.current.mutateAsync({
          name: 'Test',
          type: 'custom',
        });
      } catch (e) {
        errorMessage = (e as Error).message;
      }
    });

    expect(errorMessage).toBe('Create failed');
  });
});

// =============================================================================
// useUpdateInvestment Tests
// =============================================================================

describe('useUpdateInvestment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_update_investment_and_return_result', async () => {
    const updatedInvestment = { ...mockInvestmentEmergency, name: 'Reserva Atualizada' };
    const response: InvestmentResponse = { investment: updatedInvestment };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateInvestment(), { wrapper });

    await act(async () => {
      const updated = await result.current.mutateAsync({
        id: 'inv-1',
        data: { name: 'Reserva Atualizada' },
      });
      expect(updated).toEqual(updatedInvestment);
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/investments/inv-1', {
      name: 'Reserva Atualizada',
    });
  });

  it('should_update_investment_goal_amount', async () => {
    const updatedInvestment = { ...mockInvestmentEmergency, goalAmount: '50000' };
    const response: InvestmentResponse = { investment: updatedInvestment };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateInvestment(), { wrapper });

    await act(async () => {
      const updated = await result.current.mutateAsync({
        id: 'inv-1',
        data: { goalAmount: 50000 },
      });
      expect(updated.goalAmount).toBe('50000');
    });
  });
});

// =============================================================================
// useDeleteInvestment Tests
// =============================================================================

describe('useDeleteInvestment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_delete_investment_successfully', async () => {
    mockDelete.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteInvestment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('inv-1');
    });

    expect(mockDelete).toHaveBeenCalledWith('/finance/investments/inv-1');
  });

  it('should_handle_delete_error', async () => {
    mockDelete.mockRejectedValue(new Error('Delete failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteInvestment(), { wrapper });

    let errorMessage = '';
    await act(async () => {
      try {
        await result.current.mutateAsync('inv-1');
      } catch (e) {
        errorMessage = (e as Error).message;
      }
    });

    expect(errorMessage).toBe('Delete failed');
  });
});

// =============================================================================
// useUpdateInvestmentValue Tests
// =============================================================================

describe('useUpdateInvestmentValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_update_investment_value', async () => {
    const updatedInvestment = { ...mockInvestmentEmergency, currentAmount: '20000' };
    const response: InvestmentResponse = { investment: updatedInvestment };
    mockPatch.mockResolvedValue(response);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateInvestmentValue(), { wrapper });

    await act(async () => {
      const returned = await result.current.mutateAsync({
        id: 'inv-1',
        data: { currentAmount: 20000 },
      });
      expect(returned.currentAmount).toBe('20000');
    });

    expect(mockPatch).toHaveBeenCalledWith('/finance/investments/inv-1/update-value', {
      currentAmount: 20000,
    });
  });

  it('should_handle_update_value_error', async () => {
    mockPatch.mockRejectedValue(new Error('Update value failed'));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateInvestmentValue(), { wrapper });

    let errorMessage = '';
    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: 'inv-1',
          data: { currentAmount: 20000 },
        });
      } catch (e) {
        errorMessage = (e as Error).message;
      }
    });

    expect(errorMessage).toBe('Update value failed');
  });
});
