import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IncomeSummary } from '../../../components/income/income-summary';

// =============================================================================
// Tests
// =============================================================================

describe('IncomeSummary', () => {
  it('should_display_total_expected', () => {
    render(
      <IncomeSummary
        totalExpected={5000}
        totalActual={4800}
        count={3}
        loading={false}
      />
    );

    expect(screen.getByTestId('income-summary-expected')).toHaveTextContent('R$ 5.000,00');
  });

  it('should_display_total_actual', () => {
    render(
      <IncomeSummary
        totalExpected={5000}
        totalActual={4800}
        count={3}
        loading={false}
      />
    );

    expect(screen.getByTestId('income-summary-actual')).toHaveTextContent('R$ 4.800,00');
  });

  it('should_show_positive_variance_in_green', () => {
    render(
      <IncomeSummary
        totalExpected={5000}
        totalActual={5500}
        count={3}
        loading={false}
      />
    );

    const varianceElement = screen.getByTestId('income-summary-variance');
    expect(varianceElement).toHaveTextContent('+R$ 500,00');
    expect(varianceElement).toHaveClass('text-green-600');
  });

  it('should_show_negative_variance_in_red', () => {
    render(
      <IncomeSummary
        totalExpected={5000}
        totalActual={4000}
        count={3}
        loading={false}
      />
    );

    const varianceElement = screen.getByTestId('income-summary-variance');
    expect(varianceElement).toHaveTextContent('-R$ 1.000,00');
    expect(varianceElement).toHaveClass('text-red-600');
  });

  it('should_show_variance_percentage', () => {
    render(
      <IncomeSummary
        totalExpected={5000}
        totalActual={5500}
        count={3}
        loading={false}
      />
    );

    expect(screen.getByTestId('income-summary-variance-percentage')).toHaveTextContent('(+10.0%)');
  });

  it('should_show_income_count', () => {
    render(
      <IncomeSummary
        totalExpected={5000}
        totalActual={5000}
        count={3}
        loading={false}
      />
    );

    expect(screen.getByText('3 rendas')).toBeInTheDocument();
  });

  it('should_show_singular_renda_when_count_is_1', () => {
    render(
      <IncomeSummary
        totalExpected={5000}
        totalActual={5000}
        count={1}
        loading={false}
      />
    );

    expect(screen.getByText('1 renda')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton', () => {
    render(
      <IncomeSummary
        totalExpected={0}
        totalActual={0}
        count={0}
        loading={true}
      />
    );

    expect(screen.getByTestId('income-summary-loading')).toBeInTheDocument();
  });

  it('should_handle_zero_values', () => {
    render(
      <IncomeSummary
        totalExpected={0}
        totalActual={0}
        count={0}
        loading={false}
      />
    );

    expect(screen.getByTestId('income-summary-expected')).toHaveTextContent('R$ 0,00');
    expect(screen.getByTestId('income-summary-actual')).toHaveTextContent('R$ 0,00');
  });
});
