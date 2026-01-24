import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IncomeList } from '../../../components/income/income-list';
import type { Income } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockIncomes: Income[] = [
  {
    id: 'income-1',
    userId: 'user-1',
    name: 'Salário',
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
  },
  {
    id: 'income-2',
    userId: 'user-1',
    name: 'Freelance',
    type: 'freelance',
    frequency: 'irregular',
    expectedAmount: 2000,
    actualAmount: null,
    isRecurring: false,
    recurringGroupId: null,
    monthYear: '2026-01',
    currency: 'BRL',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('IncomeList', () => {
  it('should_render_list_of_incomes', () => {
    render(
      <IncomeList
        incomes={mockIncomes}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('income-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('income-card')).toHaveLength(2);
  });

  it('should_show_loading_skeletons', () => {
    render(
      <IncomeList
        incomes={[]}
        loading={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('income-list-loading')).toBeInTheDocument();
  });

  it('should_return_null_for_empty_list', () => {
    const { container } = render(
      <IncomeList
        incomes={[]}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should_render_income_names', () => {
    render(
      <IncomeList
        incomes={mockIncomes}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const nameElements = screen.getAllByTestId('income-name');
    expect(nameElements[0]).toHaveTextContent('Salário');
    expect(nameElements[1]).toHaveTextContent('Freelance');
  });
});
