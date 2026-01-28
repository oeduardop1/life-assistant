import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillList } from '../../../components/bill/bill-list';
import type { Bill } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

// Use a future date for tests to ensure consistent behavior
const futureMonthYear = '2099-12';

const mockBills: Bill[] = [
  {
    id: 'bill-1',
    userId: 'user-1',
    name: 'Aluguel',
    category: 'housing',
    amount: 1500,
    dueDay: 25,
    status: 'pending',
    paidAt: null,
    isRecurring: true,
    recurringGroupId: 'group-1',
    monthYear: futureMonthYear,
    currency: 'BRL',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'bill-2',
    userId: 'user-1',
    name: 'Netflix',
    category: 'subscription',
    amount: 39.9,
    dueDay: 15,
    status: 'paid',
    paidAt: '2026-01-15T10:00:00Z',
    isRecurring: true,
    recurringGroupId: 'group-2',
    monthYear: futureMonthYear,
    currency: 'BRL',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'bill-3',
    userId: 'user-1',
    name: 'Conta de Luz',
    category: 'utilities',
    amount: 200,
    dueDay: 5,
    status: 'overdue',
    paidAt: null,
    isRecurring: false,
    recurringGroupId: null,
    monthYear: futureMonthYear,
    currency: 'BRL',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('BillList', () => {
  it('should_render_list_of_bills', () => {
    render(
      <BillList
        bills={mockBills}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('bill-card')).toHaveLength(3);
  });

  it('should_show_loading_skeletons', () => {
    render(
      <BillList
        bills={[]}
        loading={true}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-list-loading')).toBeInTheDocument();
  });

  it('should_return_null_for_empty_list', () => {
    const { container } = render(
      <BillList
        bills={[]}
        loading={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should_render_bill_names', () => {
    render(
      <BillList
        bills={mockBills}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Conta de Luz')).toBeInTheDocument();
  });

  it('should_group_bills_by_status_when_grouped', () => {
    render(
      <BillList
        bills={mockBills}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
        grouped={true}
      />
    );

    // Should show section headers
    expect(screen.getByText('Vencidas')).toBeInTheDocument();
    expect(screen.getByText('Pendentes')).toBeInTheDocument();
    expect(screen.getByText('Pagas')).toBeInTheDocument();
  });

  it('should_not_group_when_grouped_is_false', () => {
    render(
      <BillList
        bills={mockBills}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
        grouped={false}
      />
    );

    // Should not show section headers
    expect(screen.queryByText('Vencidas')).not.toBeInTheDocument();
    expect(screen.queryByText('Pendentes')).not.toBeInTheDocument();
    expect(screen.queryByText('Pagas')).not.toBeInTheDocument();
  });

  it('should_show_section_counts', () => {
    render(
      <BillList
        bills={mockBills}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
        grouped={true}
      />
    );

    // Counts should be shown in parentheses
    // We have 1 overdue, 1 pending, 1 paid
    const countElements = screen.getAllByText(/\(\d+\)/);
    expect(countElements.length).toBeGreaterThanOrEqual(3);
  });

  it('should_disable_pay_button_for_toggling_bill', () => {
    // Use a single pending bill for clearer testing
    const singlePendingBill: Bill[] = [
      {
        id: 'bill-toggle',
        userId: 'user-1',
        name: 'Test Bill',
        category: 'housing',
        amount: 100,
        dueDay: 28,
        status: 'pending',
        paidAt: null,
        isRecurring: false,
        recurringGroupId: null,
        monthYear: '2099-12',
        currency: 'BRL',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    render(
      <BillList
        bills={singlePendingBill}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
        togglingBillId="bill-toggle"
        grouped={false}
      />
    );

    // The pay button for the toggling bill should be disabled
    const payButton = screen.getByTestId('bill-pay-button');
    expect(payButton).toBeDisabled();
  });
});
