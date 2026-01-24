import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EditIncomeModal } from '../../../components/income/edit-income-modal';
import type { Income } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn().mockResolvedValue({ income: { id: '1', name: 'Updated' } }),
    delete: vi.fn(),
    isAuthenticated: true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const mockIncome: Income = {
  id: 'income-1',
  userId: 'user-1',
  name: 'Salário',
  type: 'salary',
  frequency: 'monthly',
  expectedAmount: 5000,
  actualAmount: 5000,
  isRecurring: true,
  recurringGroupId: 'group-1',
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// =============================================================================
// Test Helpers
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('EditIncomeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_open_modal_when_income_provided_and_open_is_true', async () => {
    render(
      <EditIncomeModal
        income={mockIncome}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('edit-income-modal')).toBeInTheDocument();
    expect(await screen.findByText('Editar Renda')).toBeInTheDocument();
  });

  it('should_not_render_when_income_is_null', () => {
    render(
      <EditIncomeModal
        income={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('edit-income-modal')).not.toBeInTheDocument();
  });

  it('should_pre_fill_form_with_income_data', async () => {
    render(
      <EditIncomeModal
        income={mockIncome}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('income-form-name')).toHaveValue('Salário');
    expect(await screen.findByTestId('income-form-expected-amount')).toHaveValue(5000);
  });

  it('should_show_description', async () => {
    render(
      <EditIncomeModal
        income={mockIncome}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText('Atualize as informações da renda.')
    ).toBeInTheDocument();
  });
});
