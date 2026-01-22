import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DebtProgressBar } from '../../../components/debt/debt-progress-bar';

// =============================================================================
// Tests
// =============================================================================

describe('DebtProgressBar', () => {
  it('should_render_progress_bar', () => {
    render(
      <DebtProgressBar
        currentInstallment={13}
        totalInstallments={48}
      />
    );

    expect(screen.getByTestId('debt-progress-bar')).toBeInTheDocument();
  });

  it('should_calculate_correct_percentage', () => {
    render(
      <DebtProgressBar
        currentInstallment={13}
        totalInstallments={48}
        showLabel
      />
    );

    // 12 paid out of 48 = 25%
    expect(screen.getByTestId('debt-progress-percent')).toHaveTextContent('25%');
  });

  it('should_show_installments_count_with_label', () => {
    render(
      <DebtProgressBar
        currentInstallment={13}
        totalInstallments={48}
        showLabel
      />
    );

    expect(screen.getByTestId('debt-progress-installments')).toHaveTextContent('12/48 parcelas');
  });

  it('should_not_show_label_by_default', () => {
    render(
      <DebtProgressBar
        currentInstallment={13}
        totalInstallments={48}
      />
    );

    expect(screen.queryByTestId('debt-progress-percent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('debt-progress-installments')).not.toBeInTheDocument();
  });

  it('should_handle_zero_installments', () => {
    render(
      <DebtProgressBar
        currentInstallment={1}
        totalInstallments={0}
        showLabel
      />
    );

    expect(screen.getByTestId('debt-progress-percent')).toHaveTextContent('0%');
  });

  it('should_handle_first_installment', () => {
    render(
      <DebtProgressBar
        currentInstallment={1}
        totalInstallments={12}
        showLabel
      />
    );

    // currentInstallment 1 means 0 paid
    expect(screen.getByTestId('debt-progress-percent')).toHaveTextContent('0%');
    expect(screen.getByTestId('debt-progress-installments')).toHaveTextContent('0/12 parcelas');
  });

  it('should_handle_last_installment', () => {
    render(
      <DebtProgressBar
        currentInstallment={12}
        totalInstallments={12}
        showLabel
      />
    );

    // currentInstallment 12 means 11 paid
    expect(screen.getByTestId('debt-progress-percent')).toHaveTextContent('92%');
    expect(screen.getByTestId('debt-progress-installments')).toHaveTextContent('11/12 parcelas');
  });

  it('should_show_100_percent_when_all_paid', () => {
    render(
      <DebtProgressBar
        currentInstallment={13}
        totalInstallments={12}
        showLabel
      />
    );

    // currentInstallment 13 means 12 paid out of 12 = 100%
    expect(screen.getByTestId('debt-progress-percent')).toHaveTextContent('100%');
    expect(screen.getByTestId('debt-progress-installments')).toHaveTextContent('12/12 parcelas');
  });
});
