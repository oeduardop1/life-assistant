import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NegotiateDebtModal } from '../../../components/debt/negotiate-debt-modal';
import type { Debt } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

const mockMutateAsync = vi.fn();

vi.mock('../../../hooks/use-debts', () => ({
  useNegotiateDebt: () => ({
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
  notes: null,
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
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('NegotiateDebtModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_modal_with_debt_info', () => {
    render(
      <NegotiateDebtModal
        debt={mockDebtPending}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('negotiate-debt-modal')).toBeInTheDocument();
    expect(screen.getByText(/Dívida Cartão/)).toBeInTheDocument();
    expect(screen.getByTestId('negotiate-debt-total')).toHaveTextContent('R$ 5.000,00');
  });

  it('should_not_render_when_debt_is_null', () => {
    render(
      <NegotiateDebtModal
        debt={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('negotiate-debt-modal')).not.toBeInTheDocument();
  });

  it('should_not_render_when_closed', () => {
    render(
      <NegotiateDebtModal
        debt={mockDebtPending}
        open={false}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByTestId('negotiate-debt-modal')).not.toBeInTheDocument();
  });

  it('should_have_form_fields', () => {
    render(
      <NegotiateDebtModal
        debt={mockDebtPending}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('negotiate-form-total-installments')).toBeInTheDocument();
    expect(screen.getByTestId('negotiate-form-installment-amount')).toBeInTheDocument();
    expect(screen.getByTestId('negotiate-form-due-day')).toBeInTheDocument();
  });

  it('should_submit_with_correct_values', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockMutateAsync.mockResolvedValue({});

    render(
      <NegotiateDebtModal
        debt={mockDebtPending}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    // Clear and type new values
    const installmentsInput = screen.getByTestId('negotiate-form-total-installments');
    const amountInput = screen.getByTestId('negotiate-form-installment-amount');
    const dueDayInput = screen.getByTestId('negotiate-form-due-day');

    await user.clear(installmentsInput);
    await user.type(installmentsInput, '10');

    await user.clear(amountInput);
    await user.type(amountInput, '550');

    await user.clear(dueDayInput);
    await user.type(dueDayInput, '20');

    await user.click(screen.getByTestId('negotiate-form-submit'));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: 'debt-2',
      data: {
        totalInstallments: 10,
        installmentAmount: 550,
        dueDay: 20,
      },
    });
  });

  it('should_call_onOpenChange_on_cancel', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <NegotiateDebtModal
        debt={mockDebtPending}
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByTestId('negotiate-form-cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_show_calculated_total', async () => {
    const user = userEvent.setup();

    render(
      <NegotiateDebtModal
        debt={mockDebtPending}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Set values
    const installmentsInput = screen.getByTestId('negotiate-form-total-installments');
    const amountInput = screen.getByTestId('negotiate-form-installment-amount');

    await user.clear(installmentsInput);
    await user.type(installmentsInput, '10');

    await user.clear(amountInput);
    await user.type(amountInput, '500');

    // 10 * 500 = 5000 which equals totalAmount, so no difference
    expect(screen.getByText('Total Parcelado:')).toBeInTheDocument();
  });
});
