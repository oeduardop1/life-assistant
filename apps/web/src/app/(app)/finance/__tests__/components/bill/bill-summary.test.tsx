import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillSummary } from '../../../components/bill/bill-summary';
import type { BillTotals, Bill } from '../../../types';

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

const mockBills: Bill[] = [
  {
    id: '1',
    userId: 'user1',
    name: 'Rent',
    category: 'housing',
    amount: 1500,
    dueDay: 5,
    status: 'pending',
    paidAt: null,
    isRecurring: true,
    recurringGroupId: 'group1',
    monthYear: '2026-01',
    currency: 'BRL',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    userId: 'user1',
    name: 'Netflix',
    category: 'subscription',
    amount: 39.9,
    dueDay: 15,
    status: 'paid',
    paidAt: '2026-01-10T00:00:00Z',
    isRecurring: true,
    recurringGroupId: 'group2',
    monthYear: '2026-01',
    currency: 'BRL',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '3',
    userId: 'user1',
    name: 'Electric',
    category: 'utilities',
    amount: 200,
    dueDay: 20,
    status: 'overdue',
    paidAt: null,
    isRecurring: false,
    recurringGroupId: null,
    monthYear: '2026-01',
    currency: 'BRL',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('BillSummary', () => {
  it('should_display_summary_with_progress_bar', () => {
    render(<BillSummary totals={mockTotals} bills={mockBills} loading={false} />);

    expect(screen.getByTestId('bill-summary')).toBeInTheDocument();
  });

  it('should_display_progress_percentage', () => {
    render(<BillSummary totals={mockTotals} bills={mockBills} loading={false} />);

    // Progress is paid/total = 39.9/1739.9 = ~2%
    expect(screen.getByText('2% pago')).toBeInTheDocument();
  });

  it('should_display_paid_and_total_amounts', () => {
    render(<BillSummary totals={mockTotals} bills={mockBills} loading={false} />);

    // The progress label shows paid of total
    expect(screen.getByText(/R\$\s*39,90.*R\$\s*1\.739,90/)).toBeInTheDocument();
  });

  it('should_show_100_percent_when_all_paid', () => {
    render(<BillSummary totals={mockTotalsNoPending} bills={[mockBills[1]]} loading={false} />);

    expect(screen.getByText('100% pago')).toBeInTheDocument();
  });

  it('should_not_render_when_no_bills', () => {
    const { container } = render(
      <BillSummary totals={emptyTotals} bills={[]} loading={false} />
    );

    // Component returns null when count is 0
    expect(container.firstChild).toBeNull();
  });

  it('should_show_loading_skeleton_when_loading', () => {
    render(<BillSummary totals={emptyTotals} loading={true} />);

    // The skeleton has shimmer animation divs
    const summary = document.querySelector('[class*="p-4"][class*="rounded-xl"]');
    expect(summary).toBeInTheDocument();
  });

  it('should_show_category_breakdown_toggle', () => {
    render(<BillSummary totals={mockTotals} bills={mockBills} loading={false} />);

    // Category breakdown is expandable
    expect(screen.getByText('Ver por categoria')).toBeInTheDocument();
  });
});
