import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvestmentCard } from '../../../components/investment/investment-card';
import type { Investment } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockInvestmentWithGoal: Investment = {
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

const mockInvestmentWithoutGoal: Investment = {
  id: 'inv-2',
  userId: 'user-1',
  name: 'Investimento Geral',
  type: 'custom',
  goalAmount: null,
  currentAmount: '5000',
  monthlyContribution: null,
  deadline: null,
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockInvestmentAtGoal: Investment = {
  ...mockInvestmentWithGoal,
  id: 'inv-3',
  name: 'Meta Alcançada',
  currentAmount: '30000',
};

// =============================================================================
// Tests
// =============================================================================

describe('InvestmentCard', () => {
  it('should_render_investment_name', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-name')).toHaveTextContent('Reserva de Emergência');
  });

  it('should_display_investment_type_badge', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-type-badge')).toHaveTextContent('Reserva de Emergência');
  });

  it('should_display_current_amount', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-current-amount')).toHaveTextContent('R$ 15.000,00');
  });

  it('should_show_goal_when_has_goal', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-goal')).toHaveTextContent('Meta: R$ 30.000,00');
  });

  it('should_not_show_goal_when_no_goal', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithoutGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.queryByTestId('investment-goal')).not.toBeInTheDocument();
  });

  it('should_show_monthly_contribution_when_defined', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-contribution')).toHaveTextContent('R$ 1.000,00/mes');
  });

  it('should_not_show_monthly_contribution_when_not_defined', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithoutGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.queryByTestId('investment-contribution')).not.toBeInTheDocument();
  });

  it('should_show_remaining_amount_when_goal_not_reached', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-remaining')).toHaveTextContent('Faltam R$ 15.000,00');
  });

  it('should_not_show_remaining_when_goal_reached', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentAtGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.queryByTestId('investment-remaining')).not.toBeInTheDocument();
  });

  it('should_show_months_to_goal_when_has_contribution', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    // 15000 remaining / 1000/month = 15 months
    expect(screen.getByTestId('investment-months-to-goal')).toHaveTextContent('~15 meses restantes');
  });

  it('should_show_deadline_badge_when_has_deadline', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-deadline-badge')).toBeInTheDocument();
  });

  it('should_not_show_deadline_badge_when_no_deadline', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithoutGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.queryByTestId('investment-deadline-badge')).not.toBeInTheDocument();
  });

  it('should_show_progress_bar_when_has_goal', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    // Progress bar is rendered inside the card
    expect(screen.getByTestId('investment-progress-bar')).toBeInTheDocument();
  });

  it('should_not_show_progress_bar_when_no_goal', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithoutGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.queryByTestId('investment-progress-bar')).not.toBeInTheDocument();
  });

  it('should_call_onEdit_when_edit_clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('investment-actions-trigger'));
    const editButton = await screen.findByTestId('investment-edit-action');
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockInvestmentWithGoal);
  });

  it('should_call_onDelete_when_delete_clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onUpdateValue={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('investment-actions-trigger'));
    const deleteButton = await screen.findByTestId('investment-delete-action');
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockInvestmentWithGoal);
  });

  it('should_call_onUpdateValue_when_update_value_clicked', async () => {
    const user = userEvent.setup();
    const onUpdateValue = vi.fn();

    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={onUpdateValue}
      />
    );

    // The quick update button is outside the dropdown menu
    const updateValueButton = screen.getByTestId('investment-quick-update');
    await user.click(updateValueButton);

    expect(onUpdateValue).toHaveBeenCalledWith(mockInvestmentWithGoal);
  });

  it('should_render_card_with_test_id', () => {
    render(
      <InvestmentCard
        investment={mockInvestmentWithGoal}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-card')).toBeInTheDocument();
  });
});
