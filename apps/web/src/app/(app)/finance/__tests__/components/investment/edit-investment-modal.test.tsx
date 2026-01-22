import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditInvestmentModal } from '../../../components/investment/edit-investment-modal';
import type { Investment } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

const mockMutate = vi.fn();

vi.mock('../../../hooks/use-investments', () => ({
  useUpdateInvestment: () => ({
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

describe('EditInvestmentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_when_open_with_investment', () => {
    render(
      <EditInvestmentModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('edit-investment-modal')).toBeInTheDocument();
  });

  it('should_display_title', () => {
    render(
      <EditInvestmentModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Editar Investimento')).toBeInTheDocument();
  });

  it('should_not_render_when_investment_is_null', () => {
    render(
      <EditInvestmentModal
        investment={null}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('edit-investment-modal')).not.toBeInTheDocument();
  });

  it('should_populate_form_with_investment_data', () => {
    render(
      <EditInvestmentModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-form-name')).toHaveValue('Reserva de Emergência');
    expect(screen.getByTestId('investment-form-current-amount')).toHaveValue(15000);
    expect(screen.getByTestId('investment-form-goal-amount')).toHaveValue(30000);
    expect(screen.getByTestId('investment-form-monthly-contribution')).toHaveValue(1000);
  });

  it('should_call_onOpenChange_when_cancel_clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <EditInvestmentModal
        investment={mockInvestment}
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
      <EditInvestmentModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const nameInput = screen.getByTestId('investment-form-name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Reserva Atualizada');
    await user.click(screen.getByTestId('investment-form-submit'));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inv-1',
        data: expect.objectContaining({
          name: 'Reserva Atualizada',
        }),
      }),
      expect.any(Object)
    );
  });

  it('should_not_render_when_closed', () => {
    render(
      <EditInvestmentModal
        investment={mockInvestment}
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('edit-investment-modal')).not.toBeInTheDocument();
  });
});
