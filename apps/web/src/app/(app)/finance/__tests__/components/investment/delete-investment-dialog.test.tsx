import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteInvestmentDialog } from '../../../components/investment/delete-investment-dialog';
import type { Investment } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

const mockMutate = vi.fn();

vi.mock('../../../hooks/use-investments', () => ({
  useDeleteInvestment: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockInvestment: Investment = {
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

// =============================================================================
// Tests
// =============================================================================

describe('DeleteInvestmentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_when_open_with_investment', () => {
    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('delete-investment-dialog')).toBeInTheDocument();
  });

  it('should_display_title', () => {
    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Excluir Investimento')).toBeInTheDocument();
  });

  it('should_display_investment_name', () => {
    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Reserva de Emergência')).toBeInTheDocument();
  });

  it('should_display_investment_value', () => {
    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('R$ 15.000,00')).toBeInTheDocument();
  });

  it('should_display_warning_message', () => {
    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Esta ação não pode ser desfeita/)).toBeInTheDocument();
  });

  it('should_not_render_when_investment_is_null', () => {
    render(
      <DeleteInvestmentDialog
        investment={null}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('delete-investment-dialog')).not.toBeInTheDocument();
  });

  it('should_call_onOpenChange_when_cancel_clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    await user.click(screen.getByTestId('delete-investment-cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_call_mutate_when_confirm_clicked', async () => {
    const user = userEvent.setup();

    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('delete-investment-confirm'));

    expect(mockMutate).toHaveBeenCalledWith(
      'inv-1',
      expect.any(Object)
    );
  });

  it('should_render_cancel_and_confirm_buttons', () => {
    render(
      <DeleteInvestmentDialog
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('delete-investment-cancel')).toHaveTextContent('Cancelar');
    expect(screen.getByTestId('delete-investment-confirm')).toHaveTextContent('Excluir');
  });
});
