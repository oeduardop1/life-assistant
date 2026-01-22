import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateInvestmentModal } from '../../../components/investment/create-investment-modal';

// =============================================================================
// Mocks
// =============================================================================

const mockMutate = vi.fn();

vi.mock('../../../hooks/use-investments', () => ({
  useCreateInvestment: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('CreateInvestmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_when_open', () => {
    render(
      <CreateInvestmentModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('create-investment-modal')).toBeInTheDocument();
  });

  it('should_display_title', () => {
    render(
      <CreateInvestmentModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Novo Investimento')).toBeInTheDocument();
  });

  it('should_render_investment_form', () => {
    render(
      <CreateInvestmentModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-form')).toBeInTheDocument();
  });

  it('should_call_onOpenChange_when_cancel_clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <CreateInvestmentModal
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    await user.click(screen.getByTestId('investment-form-cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_call_mutate_on_valid_submit', async () => {
    const user = userEvent.setup();

    render(
      <CreateInvestmentModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await user.type(screen.getByTestId('investment-form-name'), 'Nova Reserva');
    await user.clear(screen.getByTestId('investment-form-current-amount'));
    await user.type(screen.getByTestId('investment-form-current-amount'), '5000');
    await user.click(screen.getByTestId('investment-form-submit'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nova Reserva',
        currentAmount: 5000,
      }),
      expect.any(Object)
    );
  });

  it('should_not_render_when_closed', () => {
    render(
      <CreateInvestmentModal
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('create-investment-modal')).not.toBeInTheDocument();
  });
});
