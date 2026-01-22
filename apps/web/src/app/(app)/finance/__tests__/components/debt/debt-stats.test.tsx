import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DebtStats } from '../../../components/debt/debt-stats';
import type { DebtProgress } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const mockProgress: DebtProgress = {
  paidInstallments: 12,
  remainingInstallments: 36,
  progressPercent: 25,
  paidAmount: 6000,
  remainingAmount: 18000,
};

// =============================================================================
// Tests
// =============================================================================

describe('DebtStats', () => {
  it('should_render_stats_grid', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={15}
      />
    );

    expect(screen.getByTestId('debt-stats')).toBeInTheDocument();
  });

  it('should_display_paid_installments', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={15}
      />
    );

    const paidStat = screen.getByTestId('debt-stat-parcelas-pagas');
    expect(paidStat).toBeInTheDocument();
    expect(paidStat).toHaveTextContent('12');
  });

  it('should_display_remaining_installments', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={15}
      />
    );

    const remainingStat = screen.getByTestId('debt-stat-parcelas-restantes');
    expect(remainingStat).toBeInTheDocument();
    expect(remainingStat).toHaveTextContent('36');
  });

  it('should_display_installment_amount_formatted', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={15}
      />
    );

    const amountStat = screen.getByTestId('debt-stat-valor-da-parcela');
    expect(amountStat).toBeInTheDocument();
    expect(amountStat).toHaveTextContent('R$ 500,00');
  });

  it('should_display_due_day', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={15}
      />
    );

    const dueDayStat = screen.getByTestId('debt-stat-dia-de-vencimento');
    expect(dueDayStat).toBeInTheDocument();
    expect(dueDayStat).toHaveTextContent('Dia 15');
  });

  it('should_display_na_when_due_day_is_null', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={null}
      />
    );

    const dueDayStat = screen.getByTestId('debt-stat-dia-de-vencimento');
    expect(dueDayStat).toHaveTextContent('N/A');
  });

  it('should_handle_zero_paid_installments', () => {
    const zeroProgress: DebtProgress = {
      ...mockProgress,
      paidInstallments: 0,
      remainingInstallments: 48,
    };

    render(
      <DebtStats
        progress={zeroProgress}
        installmentAmount={500}
        dueDay={10}
      />
    );

    const paidStat = screen.getByTestId('debt-stat-parcelas-pagas');
    expect(paidStat).toHaveTextContent('0');
  });

  it('should_handle_large_installment_amount', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={12500.5}
        dueDay={20}
      />
    );

    const amountStat = screen.getByTestId('debt-stat-valor-da-parcela');
    expect(amountStat).toHaveTextContent('R$ 12.500,50');
  });

  it('should_apply_custom_className', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={15}
        className="custom-class"
      />
    );

    const statsGrid = screen.getByTestId('debt-stats');
    expect(statsGrid).toHaveClass('custom-class');
  });

  it('should_render_all_four_stats', () => {
    render(
      <DebtStats
        progress={mockProgress}
        installmentAmount={500}
        dueDay={15}
      />
    );

    expect(screen.getByTestId('debt-stat-parcelas-pagas')).toBeInTheDocument();
    expect(screen.getByTestId('debt-stat-parcelas-restantes')).toBeInTheDocument();
    expect(screen.getByTestId('debt-stat-valor-da-parcela')).toBeInTheDocument();
    expect(screen.getByTestId('debt-stat-dia-de-vencimento')).toBeInTheDocument();
  });
});
