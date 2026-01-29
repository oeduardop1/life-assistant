import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillCard } from '../../../components/bill/bill-card';
import type { Bill } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockBillPending: Bill = {
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
};

const mockBillPaid: Bill = {
  ...mockBillPending,
  id: 'bill-2',
  name: 'Netflix',
  category: 'subscription',
  amount: 39.9,
  status: 'paid',
  paidAt: '2026-01-15T10:00:00Z',
};

const mockBillOverdue: Bill = {
  ...mockBillPending,
  id: 'bill-3',
  name: 'Conta de Luz',
  category: 'utilities',
  amount: 200,
  status: 'overdue',
  dueDay: 5,
};

const mockBillCanceled: Bill = {
  ...mockBillPending,
  id: 'bill-4',
  name: 'Cancelado',
  status: 'canceled',
  isRecurring: false,
};

// =============================================================================
// Tests
// =============================================================================

describe('BillCard', () => {
  it('should_render_bill_name_and_category', () => {
    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-name')).toHaveTextContent('Aluguel');
    expect(screen.getByText('Moradia')).toBeInTheDocument();
  });

  it('should_display_recurring_badge_when_recurring', () => {
    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    // Component uses RefreshCw icon as recurring indicator
    expect(screen.getByTestId('bill-recurring-badge')).toBeInTheDocument();
  });

  it('should_not_display_recurring_badge_when_not_recurring', () => {
    render(
      <BillCard
        bill={mockBillCanceled}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.queryByTestId('bill-recurring-badge')).not.toBeInTheDocument();
  });

  it('should_show_amount', () => {
    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-amount')).toHaveTextContent('R$ 1.500,00');
  });

  it('should_show_due_date', () => {
    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-due-date')).toHaveTextContent('10/01/2026');
  });

  it('should_show_pay_button_for_pending_bill', () => {
    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-pay-button')).toBeInTheDocument();
    expect(screen.getByText('Pagar')).toBeInTheDocument();
  });

  it('should_show_paid_badge_for_paid_bill', () => {
    render(
      <BillCard
        bill={mockBillPaid}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    // Component shows a Badge (not a button) when paid
    expect(screen.getByTestId('bill-paid-badge')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('should_show_urgency_badge_for_overdue', () => {
    render(
      <BillCard
        bill={mockBillOverdue}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    expect(screen.getByTestId('bill-urgency-badge')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });

  it('should_call_onTogglePaid_when_pay_button_clicked', async () => {
    const user = userEvent.setup();
    const onTogglePaid = vi.fn();

    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={onTogglePaid}
      />
    );

    await user.click(screen.getByTestId('bill-pay-button'));

    expect(onTogglePaid).toHaveBeenCalledWith(mockBillPending);
  });

  it('should_call_onEdit_when_edit_clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <BillCard
        bill={mockBillPending}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('bill-actions-trigger'));
    const editButton = await screen.findByTestId('bill-edit-action');
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockBillPending);
  });

  it('should_call_onDelete_when_delete_clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onTogglePaid={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('bill-actions-trigger'));
    const deleteButton = await screen.findByTestId('bill-delete-action');
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockBillPending);
  });

  it('should_not_show_toggle_paid_action_in_dropdown_for_pending_bill', async () => {
    const user = userEvent.setup();

    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    // For pending bills, toggle paid action is via the CTA button, not dropdown
    await user.click(screen.getByTestId('bill-actions-trigger'));
    expect(screen.queryByTestId('bill-toggle-paid-action')).not.toBeInTheDocument();
  });

  it('should_show_toggle_unpaid_action_in_dropdown_for_paid_bill', async () => {
    const user = userEvent.setup();

    render(
      <BillCard
        bill={mockBillPaid}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('bill-actions-trigger'));
    const toggleAction = await screen.findByTestId('bill-toggle-paid-action');

    expect(toggleAction).toHaveTextContent('Marcar Pendente');
  });

  it('should_disable_pay_button_when_toggling', () => {
    render(
      <BillCard
        bill={mockBillPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
        isTogglingPaid={true}
      />
    );

    expect(screen.getByTestId('bill-pay-button')).toBeDisabled();
  });

  it('should_apply_different_styling_when_paid', () => {
    render(
      <BillCard
        bill={mockBillPaid}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    const card = screen.getByTestId('bill-card');
    expect(card).toHaveClass('opacity-60');
  });

  it('should_apply_overdue_styling', () => {
    render(
      <BillCard
        bill={mockBillOverdue}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTogglePaid={vi.fn()}
      />
    );

    const card = screen.getByTestId('bill-card');
    expect(card).toHaveClass('border-destructive/30');
  });
});
