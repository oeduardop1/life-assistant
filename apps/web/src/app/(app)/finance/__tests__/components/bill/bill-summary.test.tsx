import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillSummary } from '../../../components/bill/bill-summary';
import type { BillTotals } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockTotals: BillTotals = {
  total: 1739.9,
  paid: 39.9,
  pending: 1500,
  overdue: 200,
  count: 3,
  paidCount: 1,
  pendingCount: 1,
  overdueCount: 1,
};

const mockTotalsNoPending: BillTotals = {
  total: 39.9,
  paid: 39.9,
  pending: 0,
  overdue: 0,
  count: 1,
  paidCount: 1,
  pendingCount: 0,
  overdueCount: 0,
};

const mockTotalsWithOverdue: BillTotals = {
  total: 200,
  paid: 0,
  pending: 0,
  overdue: 200,
  count: 1,
  paidCount: 0,
  pendingCount: 0,
  overdueCount: 1,
};

const emptyTotals: BillTotals = {
  total: 0,
  paid: 0,
  pending: 0,
  overdue: 0,
  count: 0,
  paidCount: 0,
  pendingCount: 0,
  overdueCount: 0,
};

// =============================================================================
// Tests
// =============================================================================

describe('BillSummary', () => {
  it('should_display_total_bills', () => {
    render(<BillSummary totals={mockTotals} loading={false} />);

    expect(screen.getByTestId('bill-summary-total')).toHaveTextContent('R$ 1.739,90');
  });

  it('should_display_paid_amount', () => {
    render(<BillSummary totals={mockTotals} loading={false} />);

    expect(screen.getByTestId('bill-summary-paid')).toHaveTextContent('R$ 39,90');
  });

  it('should_display_pending_amount', () => {
    render(<BillSummary totals={mockTotals} loading={false} />);

    // Pending includes pending + overdue amounts
    expect(screen.getByTestId('bill-summary-pending')).toHaveTextContent('R$ 1.700,00');
  });

  it('should_show_bill_count', () => {
    render(<BillSummary totals={mockTotals} loading={false} />);

    expect(screen.getByText('3 contas')).toBeInTheDocument();
  });

  it('should_show_singular_conta_when_count_is_1', () => {
    render(<BillSummary totals={mockTotalsNoPending} loading={false} />);

    // There are multiple "1 conta" texts (Total and Paid sections have count=1)
    // Use getAllByText to verify the singular form exists
    const singularTexts = screen.getAllByText(/1\s+conta\b/);
    expect(singularTexts.length).toBeGreaterThan(0);
  });

  it('should_show_paid_count', () => {
    render(<BillSummary totals={mockTotals} loading={false} />);

    expect(screen.getByText('1 conta', { exact: false })).toBeInTheDocument();
  });

  it('should_show_overdue_count_when_has_overdue', () => {
    render(<BillSummary totals={mockTotals} loading={false} />);

    expect(screen.getByTestId('bill-summary-overdue-count')).toHaveTextContent('(1 vencida)');
  });

  it('should_use_red_color_when_has_overdue', () => {
    render(<BillSummary totals={mockTotalsWithOverdue} loading={false} />);

    const pendingElement = screen.getByTestId('bill-summary-pending');
    expect(pendingElement).toHaveClass('text-red-600');
  });

  it('should_use_orange_color_when_no_overdue', () => {
    const totalsNoOverdue: BillTotals = {
      ...mockTotals,
      overdue: 0,
      overdueCount: 0,
    };

    render(<BillSummary totals={totalsNoOverdue} loading={false} />);

    const pendingElement = screen.getByTestId('bill-summary-pending');
    expect(pendingElement).toHaveClass('text-orange-600');
  });

  it('should_show_loading_skeleton', () => {
    render(<BillSummary totals={emptyTotals} loading={true} />);

    expect(screen.getByTestId('bill-summary-loading')).toBeInTheDocument();
  });

  it('should_handle_zero_values', () => {
    render(<BillSummary totals={emptyTotals} loading={false} />);

    expect(screen.getByTestId('bill-summary-total')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('bill-summary-paid')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('bill-summary-pending')).toHaveTextContent('R$ 0,00');
  });

  it('should_show_plural_vencidas_when_multiple_overdue', () => {
    const totalsMultipleOverdue: BillTotals = {
      ...mockTotals,
      overdueCount: 2,
    };

    render(<BillSummary totals={totalsMultipleOverdue} loading={false} />);

    expect(screen.getByTestId('bill-summary-overdue-count')).toHaveTextContent('(2 vencidas)');
  });
});
