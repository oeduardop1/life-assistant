import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateValueModal } from '../../../components/investment/update-value-modal';
import type { Investment } from '../../../types';

// =============================================================================
// Mocks
// =============================================================================

const mockMutate = vi.fn();

vi.mock('../../../hooks/use-investments', () => ({
  useUpdateInvestmentValue: () => ({
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

describe('UpdateValueModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_when_open_with_investment', () => {
    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('update-value-modal')).toBeInTheDocument();
  });

  it('should_display_title', () => {
    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Atualizar Valor')).toBeInTheDocument();
  });

  it('should_display_investment_name_in_description', () => {
    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Reserva de Emergência')).toBeInTheDocument();
  });

  it('should_display_current_value_in_description', () => {
    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText(/R\$ 15\.000,00/)).toBeInTheDocument();
  });

  it('should_not_render_when_investment_is_null', () => {
    render(
      <UpdateValueModal
        investment={null}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('update-value-modal')).not.toBeInTheDocument();
  });

  it('should_render_value_input', () => {
    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('update-value-input')).toBeInTheDocument();
  });

  it('should_call_onOpenChange_when_cancel_clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    await user.click(screen.getByTestId('update-value-cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should_call_mutate_on_submit', async () => {
    const user = userEvent.setup();

    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const input = screen.getByTestId('update-value-input');
    await user.clear(input);
    await user.type(input, '20000');
    await user.click(screen.getByTestId('update-value-submit'));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        id: 'inv-1',
        data: { currentAmount: 20000 },
      },
      expect.any(Object)
    );
  });

  it('should_render_submit_and_cancel_buttons', () => {
    render(
      <UpdateValueModal
        investment={mockInvestment}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('update-value-submit')).toHaveTextContent('Atualizar');
    expect(screen.getByTestId('update-value-cancel')).toHaveTextContent('Cancelar');
  });
});
