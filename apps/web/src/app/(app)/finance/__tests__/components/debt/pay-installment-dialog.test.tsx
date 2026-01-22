import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayInstallmentDialog } from '../../../components/debt/pay-installment-dialog';
import type { Debt } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

const mockMutateAsync = vi.fn();

vi.mock('../../../hooks/use-debts', () => ({
  usePayInstallment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
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

const mockDebtNegotiated: Debt = {
  id: 'debt-1',
  userId: 'user-1',
  name: 'Financiamento Carro',
  creditor: 'Banco XYZ',
  totalAmount: 24000,
  isNegotiated: true,
  totalInstallments: 48,
  installmentAmount: 500,
  currentInstallment: 13,
  dueDay: 15,
  status: 'active',
  notes: null,
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockDebtLastInstallment: Debt = {
  ...mockDebtNegotiated,
  id: 'debt-2',
  currentInstallment: 48,
  totalInstallments: 48,
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
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PayInstallmentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_dialog_with_debt_info', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('pay-installment-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Financiamento Carro/)).toBeInTheDocument();
    expect(screen.getByText('13/48')).toBeInTheDocument();
  });

  it('should_not_render_when_debt_is_null', () => {
    render(
      <PayInstallmentDialog
        debt={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('pay-installment-dialog')).not.toBeInTheDocument();
  });

  it('should_not_render_when_closed', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={false}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('pay-installment-dialog')).not.toBeInTheDocument();
  });

  it('should_display_installment_amount', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('pay-installment-amount')).toHaveTextContent('R$ 500,00');
  });

  it('should_display_paid_amount', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // 12 paid installments * 500 = 6000
    expect(screen.getByText('R$ 6.000,00')).toBeInTheDocument();
  });

  it('should_show_last_installment_message', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtLastInstallment}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Esta é a última parcela!/)).toBeInTheDocument();
  });

  it('should_not_show_last_installment_message_for_regular_installment', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText(/Esta é a última parcela!/)).not.toBeInTheDocument();
  });

  it('should_call_mutateAsync_on_confirm', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockMutateAsync.mockResolvedValue({});

    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByTestId('pay-installment-confirm'));

    expect(mockMutateAsync).toHaveBeenCalledWith('debt-1');
  });

  it('should_close_dialog_on_success', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockMutateAsync.mockResolvedValue({});

    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByTestId('pay-installment-confirm'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_call_onOpenChange_on_cancel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByTestId('pay-installment-cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_not_render_for_debt_without_installments', () => {
    const debtWithoutInstallments: Debt = {
      ...mockDebtNegotiated,
      installmentAmount: null,
      totalInstallments: null,
    };

    render(
      <PayInstallmentDialog
        debt={debtWithoutInstallments}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('pay-installment-dialog')).not.toBeInTheDocument();
  });

  it('should_have_confirm_and_cancel_buttons', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('pay-installment-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('pay-installment-cancel')).toBeInTheDocument();
  });

  it('should_display_remaining_amount_after_payment', () => {
    render(
      <PayInstallmentDialog
        debt={mockDebtNegotiated}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // remaining = totalAmount - paidAmount = 24000 - 6000 = 18000
    // after payment = 18000 - 500 = 17500
    expect(screen.getByText('R$ 17.500,00')).toBeInTheDocument();
  });
});
