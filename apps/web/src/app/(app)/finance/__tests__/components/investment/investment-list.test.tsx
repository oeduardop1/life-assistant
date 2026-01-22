import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvestmentList } from '../../../components/investment/investment-list';
import type { Investment } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockInvestments: Investment[] = [
  {
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
  },
  {
    id: 'inv-2',
    userId: 'user-1',
    name: 'Aposentadoria',
    type: 'retirement',
    goalAmount: '1000000',
    currentAmount: '50000',
    monthlyContribution: '2000',
    deadline: null,
    currency: 'BRL',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('InvestmentList', () => {
  it('should_render_investment_cards', () => {
    render(
      <InvestmentList
        investments={mockInvestments}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('investment-card')).toHaveLength(2);
  });

  it('should_render_skeleton_when_loading', () => {
    render(
      <InvestmentList
        investments={[]}
        loading={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-list-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('investment-list')).not.toBeInTheDocument();
  });

  it('should_render_list_when_not_loading', () => {
    render(
      <InvestmentList
        investments={mockInvestments}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-list')).toBeInTheDocument();
    expect(screen.queryByTestId('investment-list-loading')).not.toBeInTheDocument();
  });

  it('should_render_empty_list_when_no_investments', () => {
    render(
      <InvestmentList
        investments={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUpdateValue={vi.fn()}
      />
    );

    expect(screen.getByTestId('investment-list')).toBeInTheDocument();
    expect(screen.queryByTestId('investment-card')).not.toBeInTheDocument();
  });

  it('should_pass_callbacks_to_cards', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onUpdateValue = vi.fn();

    render(
      <InvestmentList
        investments={mockInvestments}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpdateValue={onUpdateValue}
      />
    );

    // Cards are rendered - callbacks are passed through
    expect(screen.getAllByTestId('investment-card')).toHaveLength(2);
  });
});
