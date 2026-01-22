import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteIncomeDialog } from '../../../components/income/delete-income-dialog';
import type { Income } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('@/hooks/use-authenticated-api', () => ({
  useAuthenticatedApi: () => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
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
  name: 'Salário Mensal',
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

describe('DeleteIncomeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_show_confirmation_with_income_name', async () => {
    render(
      <DeleteIncomeDialog
        income={mockIncome}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('delete-income-dialog')).toBeInTheDocument();
    expect(await screen.findByText('Excluir Renda')).toBeInTheDocument();
    // Income name is rendered inside the description text
    expect(
      await screen.findByText((content) => content.includes('Salário Mensal'))
    ).toBeInTheDocument();
  });

  it('should_not_render_when_income_is_null', () => {
    render(
      <DeleteIncomeDialog
        income={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('delete-income-dialog')).not.toBeInTheDocument();
  });

  it('should_show_cancel_and_confirm_buttons', async () => {
    render(
      <DeleteIncomeDialog
        income={mockIncome}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('delete-income-cancel')).toBeInTheDocument();
    expect(await screen.findByTestId('delete-income-confirm')).toBeInTheDocument();
  });

  it('should_close_without_action_on_cancel', async () => {
    const onOpenChange = vi.fn();

    render(
      <DeleteIncomeDialog
        income={mockIncome}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = await screen.findByTestId('delete-income-cancel');
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_show_warning_about_irreversible_action', async () => {
    render(
      <DeleteIncomeDialog
        income={mockIncome}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Warning text is part of the description paragraph
    expect(
      await screen.findByText((content) =>
        content.includes('Esta ação não pode ser desfeita')
      )
    ).toBeInTheDocument();
  });
});
