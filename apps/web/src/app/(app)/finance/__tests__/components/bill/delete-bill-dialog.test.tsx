import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeleteBillDialog } from '../../../components/bill/delete-bill-dialog';
import type { Bill } from '../../../types';

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

const mockBill: Bill = {
  id: 'bill-1',
  userId: 'user-1',
  name: 'Aluguel',
  category: 'housing',
  amount: 1500,
  dueDay: 10,
  status: 'pending',
  paidAt: null,
  isRecurring: false,
  recurringGroupId: null,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockRecurringBill: Bill = {
  ...mockBill,
  id: 'bill-recurring',
  isRecurring: true,
  recurringGroupId: 'group-1',
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

describe('DeleteBillDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_show_confirmation_with_bill_name', async () => {
    render(
      <DeleteBillDialog
        bill={mockBill}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('delete-bill-dialog')).toBeInTheDocument();
    expect(await screen.findByText('Excluir Conta')).toBeInTheDocument();
    // Bill name is rendered inside the description text
    expect(
      await screen.findByText((content) => content.includes('Aluguel'))
    ).toBeInTheDocument();
  });

  it('should_not_render_when_bill_is_null', () => {
    render(
      <DeleteBillDialog
        bill={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('delete-bill-dialog')).not.toBeInTheDocument();
  });

  it('should_show_cancel_and_confirm_buttons', async () => {
    render(
      <DeleteBillDialog
        bill={mockBill}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByTestId('delete-bill-cancel')).toBeInTheDocument();
    expect(await screen.findByTestId('delete-bill-confirm')).toBeInTheDocument();
  });

  it('should_close_without_action_on_cancel', async () => {
    const onOpenChange = vi.fn();

    render(
      <DeleteBillDialog
        bill={mockBill}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = await screen.findByTestId('delete-bill-cancel');
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_show_warning_about_irreversible_action', async () => {
    render(
      <DeleteBillDialog
        bill={mockBill}
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

  describe('recurring bill', () => {
    it('should_show_scope_dialog_when_bill_has_recurringGroupId', async () => {
      render(
        <DeleteBillDialog
          bill={mockRecurringBill}
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(await screen.findByTestId('recurring-scope-dialog')).toBeInTheDocument();
      expect(await screen.findByText('Excluir conta recorrente')).toBeInTheDocument();
    });

    it('should_show_scope_options', async () => {
      render(
        <DeleteBillDialog
          bill={mockRecurringBill}
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(await screen.findByTestId('scope-option-this')).toBeInTheDocument();
      expect(await screen.findByTestId('scope-option-future')).toBeInTheDocument();
      expect(await screen.findByTestId('scope-option-all')).toBeInTheDocument();
    });

    it('should_not_show_simple_confirm_dialog_for_recurring_bill', () => {
      render(
        <DeleteBillDialog
          bill={mockRecurringBill}
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByTestId('delete-bill-dialog')).not.toBeInTheDocument();
    });
  });
});
