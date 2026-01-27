import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebtCard } from '../../../components/debt/debt-card';
import type { Debt } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockDebtNegotiated: Debt = {
  id: 'debt-1',
  userId: 'user-1',
  name: 'Financiamento Carro',
  creditor: 'Banco XYZ',
  totalAmount: 48000,
  isNegotiated: true,
  totalInstallments: 48,
  installmentAmount: 1200,
  currentInstallment: 13,
  dueDay: 15,
  startMonthYear: '2025-01',
  status: 'active',
  notes: null,
  currency: 'BRL',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const mockDebtPending: Debt = {
  id: 'debt-2',
  userId: 'user-1',
  name: 'Dívida Cartão',
  creditor: 'Banco ABC',
  totalAmount: 5000,
  isNegotiated: false,
  totalInstallments: null,
  installmentAmount: null,
  currentInstallment: 1,
  dueDay: null,
  startMonthYear: null,
  status: 'active',
  notes: 'Pendente de negociação',
  currency: 'BRL',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockDebtPaidOff: Debt = {
  ...mockDebtNegotiated,
  id: 'debt-3',
  name: 'Empréstimo Pessoal',
  status: 'paid_off',
};

// =============================================================================
// Tests
// =============================================================================

describe('DebtCard', () => {
  it('should_render_debt_name_and_creditor', () => {
    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-name')).toHaveTextContent('Financiamento Carro');
    expect(screen.getByTestId('debt-creditor')).toHaveTextContent('Banco XYZ');
  });

  it('should_display_status_badge_for_active', () => {
    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-status-badge')).toHaveTextContent('Ativo');
  });

  it('should_display_status_badge_for_paid_off', () => {
    render(
      <DebtCard
        debt={mockDebtPaidOff}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-status-badge')).toHaveTextContent('Quitado');
  });

  it('should_display_pending_negotiation_badge_for_non_negotiated', () => {
    render(
      <DebtCard
        debt={mockDebtPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-pending-negotiation-badge')).toBeInTheDocument();
    expect(screen.getByText('Pendente de Negociação')).toBeInTheDocument();
  });

  it('should_not_display_pending_negotiation_badge_for_negotiated', () => {
    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByTestId('debt-pending-negotiation-badge')).not.toBeInTheDocument();
  });

  it('should_show_total_amount', () => {
    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-total-amount')).toHaveTextContent('R$ 48.000,00');
  });

  it('should_show_installment_amount_for_negotiated', () => {
    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-installment-amount')).toHaveTextContent('R$ 1.200,00/mês');
  });

  it('should_show_progress_bar_for_negotiated', () => {
    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-progress-bar')).toBeInTheDocument();
    // 12 paid out of 48 = 25%
    expect(screen.getByTestId('debt-progress-percent')).toHaveTextContent('25%');
    expect(screen.getByTestId('debt-progress-installments')).toHaveTextContent('12/48 parcelas');
  });

  it('should_show_debt_stats_for_negotiated', () => {
    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByTestId('debt-stats')).toBeInTheDocument();
  });

  it('should_not_show_progress_or_stats_for_pending', () => {
    render(
      <DebtCard
        debt={mockDebtPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.queryByTestId('debt-progress-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('debt-stats')).not.toBeInTheDocument();
  });

  it('should_call_onEdit_when_edit_clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('debt-actions-trigger'));
    const editButton = await screen.findByTestId('debt-edit-action');
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockDebtNegotiated);
  });

  it('should_call_onDelete_when_delete_clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByTestId('debt-actions-trigger'));
    const deleteButton = await screen.findByTestId('debt-delete-action');
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockDebtNegotiated);
  });

  it('should_show_pay_installment_action_for_negotiated_active', async () => {
    const user = userEvent.setup();
    const onPayInstallment = vi.fn();

    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayInstallment={onPayInstallment}
      />
    );

    await user.click(screen.getByTestId('debt-actions-trigger'));
    const payAction = await screen.findByTestId('debt-pay-installment-action');

    expect(payAction).toHaveTextContent('Pagar Parcela 13');
  });

  it('should_call_onPayInstallment_when_clicked', async () => {
    const user = userEvent.setup();
    const onPayInstallment = vi.fn();

    render(
      <DebtCard
        debt={mockDebtNegotiated}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPayInstallment={onPayInstallment}
      />
    );

    await user.click(screen.getByTestId('debt-actions-trigger'));
    const payAction = await screen.findByTestId('debt-pay-installment-action');
    await user.click(payAction);

    expect(onPayInstallment).toHaveBeenCalledWith(mockDebtNegotiated);
  });

  it('should_show_negotiate_action_for_pending', async () => {
    const user = userEvent.setup();
    const onNegotiate = vi.fn();

    render(
      <DebtCard
        debt={mockDebtPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onNegotiate={onNegotiate}
      />
    );

    await user.click(screen.getByTestId('debt-actions-trigger'));
    const negotiateAction = await screen.findByTestId('debt-negotiate-action');

    expect(negotiateAction).toHaveTextContent('Negociar');
  });

  it('should_call_onNegotiate_when_clicked', async () => {
    const user = userEvent.setup();
    const onNegotiate = vi.fn();

    render(
      <DebtCard
        debt={mockDebtPending}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onNegotiate={onNegotiate}
      />
    );

    await user.click(screen.getByTestId('debt-actions-trigger'));
    const negotiateAction = await screen.findByTestId('debt-negotiate-action');
    await user.click(negotiateAction);

    expect(onNegotiate).toHaveBeenCalledWith(mockDebtPending);
  });

  it('should_apply_opacity_when_paid_off', () => {
    render(
      <DebtCard
        debt={mockDebtPaidOff}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const card = screen.getByTestId('debt-card');
    expect(card).toHaveClass('opacity-75');
  });
});
