import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillList } from '../../../components/bill/bill-list';
import type { Bill } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockBills: Bill[] = [
  {
    id: 'bill-1',
    userId: 'user-1',
    name: 'Aluguel',
    category: 'housing',
    amount: 1500,
    dueDay: 10,
    status: 'pending',
    paidAt: null,
    isRecurring: true,
    recurringGroupId: 'group-1',
    monthYear: '2026-01',
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
    monthYear: '2026-01',
    currency: 'BRL',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
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
    expect(screen.getAllByTestId('bill-card')).toHaveLength(2);
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

    const nameElements = screen.getAllByTestId('bill-name');
    expect(nameElements[0]).toHaveTextContent('Aluguel');
    expect(nameElements[1]).toHaveTextContent('Netflix');
  });

  it('should_pass_togglingBillId_to_cards', () => {
    render(
      <BillList
        bills={mockBills}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
        togglingBillId="bill-1"
      />
    );

    // The component should render, the checkbox should be disabled for bill-1
    const checkboxes = screen.getAllByTestId('bill-paid-checkbox');
    expect(checkboxes[0]).toBeDisabled(); // bill-1 is toggling
    expect(checkboxes[1]).not.toBeDisabled(); // bill-2 is not toggling
  });
});
