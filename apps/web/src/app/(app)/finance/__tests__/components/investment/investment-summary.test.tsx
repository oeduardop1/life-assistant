import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvestmentSummary } from '../../../components/investment/investment-summary';
import type { InvestmentTotals } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockTotals: InvestmentTotals = {
  totalInvestments: 3,
  totalCurrentAmount: 70000,
  totalGoalAmount: 1060000,
  totalMonthlyContribution: 3000,
  averageProgress: 42.5,
};

const zeroTotals: InvestmentTotals = {
  totalInvestments: 0,
  totalCurrentAmount: 0,
  totalGoalAmount: 0,
  totalMonthlyContribution: 0,
  averageProgress: 0,
};

// =============================================================================
// Tests
// =============================================================================

describe('InvestmentSummary', () => {
  it('should_render_summary_grid', () => {
    render(<InvestmentSummary totals={mockTotals} />);

    expect(screen.getByTestId('investment-summary')).toBeInTheDocument();
  });

  it('should_display_total_invested', () => {
    render(<InvestmentSummary totals={mockTotals} />);

    expect(screen.getByTestId('investment-summary-total')).toHaveTextContent('R$ 70.000,00');
  });

  it('should_display_total_goals', () => {
    render(<InvestmentSummary totals={mockTotals} />);

    expect(screen.getByTestId('investment-summary-goal')).toHaveTextContent('R$ 1.060.000,00');
  });

  it('should_display_monthly_contribution', () => {
    render(<InvestmentSummary totals={mockTotals} />);

    expect(screen.getByTestId('investment-summary-contribution')).toHaveTextContent('R$ 3.000,00');
  });

  it('should_display_average_progress', () => {
    render(<InvestmentSummary totals={mockTotals} />);

    expect(screen.getByTestId('investment-summary-progress')).toHaveTextContent('42.5%');
  });

  it('should_render_skeleton_when_loading', () => {
    render(<InvestmentSummary totals={zeroTotals} loading={true} />);

    expect(screen.getByTestId('investment-summary-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('investment-summary')).not.toBeInTheDocument();
  });

  it('should_handle_zero_values', () => {
    render(<InvestmentSummary totals={zeroTotals} />);

    expect(screen.getByTestId('investment-summary-total')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('investment-summary-goal')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('investment-summary-contribution')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('investment-summary-progress')).toHaveTextContent('0.0%');
  });

  it('should_render_all_four_kpi_cards', () => {
    render(<InvestmentSummary totals={mockTotals} />);

    expect(screen.getByTestId('investment-summary-total')).toBeInTheDocument();
    expect(screen.getByTestId('investment-summary-goal')).toBeInTheDocument();
    expect(screen.getByTestId('investment-summary-contribution')).toBeInTheDocument();
    expect(screen.getByTestId('investment-summary-progress')).toBeInTheDocument();
  });
});
