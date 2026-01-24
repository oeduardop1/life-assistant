import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncomeCard } from '../../../components/income/income-card';
import type { Income } from '../../../types';

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
  recurringGroupId: 'group-1',
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockIncomeNoActual: Income = {
  ...mockIncome,
  id: 'income-2',
  name: 'Freelance',
  type: 'freelance',
  actualAmount: null,
  isRecurring: false,
};

// =============================================================================
// Tests
// =============================================================================

describe('IncomeCard', () => {
  it('should_render_income_name_and_type', () => {
    render(
      <IncomeCard income={mockIncome} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByTestId('income-name')).toHaveTextContent('Salário Mensal');
    expect(screen.getByTestId('income-type-badge')).toHaveTextContent('Salário');
  });

  it('should_display_recurring_badge_when_recurring', () => {
    render(
      <IncomeCard income={mockIncome} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByTestId('income-recurring-badge')).toBeInTheDocument();
    expect(screen.getByText('Recorrente')).toBeInTheDocument();
  });

  it('should_not_display_recurring_badge_when_not_recurring', () => {
    render(
      <IncomeCard income={mockIncomeNoActual} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.queryByTestId('income-recurring-badge')).not.toBeInTheDocument();
  });

  it('should_show_expected_and_actual_amounts', () => {
    render(
      <IncomeCard income={mockIncome} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByTestId('income-expected')).toHaveTextContent('R$ 5.000,00');
    expect(screen.getByTestId('income-actual')).toHaveTextContent('R$ 5.000,00');
  });

  it('should_not_show_actual_when_null', () => {
    render(
      <IncomeCard income={mockIncomeNoActual} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.queryByTestId('income-actual')).not.toBeInTheDocument();
  });

  it('should_show_variance_when_actual_exists', () => {
    const incomeWithVariance: Income = {
      ...mockIncome,
      expectedAmount: 5000,
      actualAmount: 5500, // +10% variance
    };

    render(
      <IncomeCard income={incomeWithVariance} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByTestId('income-variance')).toHaveTextContent('+10.0%');
  });

  it('should_show_negative_variance_correctly', () => {
    const incomeWithNegativeVariance: Income = {
      ...mockIncome,
      expectedAmount: 5000,
      actualAmount: 4000, // -20% variance
    };

    render(
      <IncomeCard income={incomeWithNegativeVariance} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByTestId('income-variance')).toHaveTextContent('-20.0%');
  });

  it('should_call_onEdit_when_edit_clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <IncomeCard income={mockIncome} onEdit={onEdit} onDelete={vi.fn()} />
    );

    // Open dropdown with userEvent
    await user.click(screen.getByTestId('income-actions-trigger'));

    // Click edit (wait for dropdown to appear)
    const editButton = await screen.findByTestId('income-edit-action');
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockIncome);
  });

  it('should_call_onDelete_when_delete_clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <IncomeCard income={mockIncome} onEdit={vi.fn()} onDelete={onDelete} />
    );

    // Open dropdown with userEvent
    await user.click(screen.getByTestId('income-actions-trigger'));

    // Click delete (wait for dropdown to appear)
    const deleteButton = await screen.findByTestId('income-delete-action');
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockIncome);
  });

  it('should_display_correct_frequency_label', () => {
    render(
      <IncomeCard income={mockIncome} onEdit={vi.fn()} onDelete={vi.fn()} />
    );

    expect(screen.getByText('Mensal')).toBeInTheDocument();
  });
});
