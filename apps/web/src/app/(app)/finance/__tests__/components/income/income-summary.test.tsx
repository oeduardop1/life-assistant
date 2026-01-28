import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IncomeSummary } from '../../../components/income/income-summary';
import type { Income } from '../../../types';

// =============================================================================
// Test Data
// =============================================================================

const createMockIncome = (overrides: Partial<Income> = {}): Income => ({
  id: crypto.randomUUID(),
  userId: 'test-user',
  name: 'Test Income',
  type: 'salary',
  frequency: 'monthly',
  expectedAmount: 5000,
  actualAmount: null,
  isRecurring: false,
  recurringGroupId: null,
  monthYear: '2026-01',
  currency: 'BRL',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('IncomeSummary', () => {
  it('should_display_progress_bar', () => {
    const incomes = [
      createMockIncome({ expectedAmount: 5000, actualAmount: 4800 }),
    ];

    render(
      <IncomeSummary
        incomes={incomes}
        totalExpected={5000}
        totalActual={4800}
        loading={false}
      />
    );

    expect(screen.getByTestId('income-summary')).toBeInTheDocument();
    expect(screen.getByText('96% recebido')).toBeInTheDocument();
  });

  it('should_display_amounts_in_progress_bar', () => {
    const incomes = [
      createMockIncome({ expectedAmount: 5000, actualAmount: 4800 }),
    ];

    render(
      <IncomeSummary
        incomes={incomes}
        totalExpected={5000}
        totalActual={4800}
        loading={false}
      />
    );

    expect(screen.getByText(/R\$ 4\.800,00 de R\$ 5\.000,00/)).toBeInTheDocument();
  });

  it('should_show_100_percent_when_all_received', () => {
    const incomes = [
      createMockIncome({ expectedAmount: 5000, actualAmount: 5000 }),
    ];

    render(
      <IncomeSummary
        incomes={incomes}
        totalExpected={5000}
        totalActual={5000}
        loading={false}
      />
    );

    expect(screen.getByText('100% recebido')).toBeInTheDocument();
  });

  it('should_display_type_breakdown_cards', () => {
    const incomes = [
      createMockIncome({ type: 'salary', expectedAmount: 5000, actualAmount: 5000 }),
      createMockIncome({ type: 'freelance', expectedAmount: 2000, actualAmount: 2000 }),
    ];

    render(
      <IncomeSummary
        incomes={incomes}
        totalExpected={7000}
        totalActual={7000}
        loading={false}
      />
    );

    expect(screen.getByText('Salário')).toBeInTheDocument();
    expect(screen.getByText('Freelance')).toBeInTheDocument();
  });

  it('should_show_month_comparison_when_provided', () => {
    const incomes = [
      createMockIncome({ expectedAmount: 5000, actualAmount: 5500 }),
    ];

    render(
      <IncomeSummary
        incomes={incomes}
        totalExpected={5000}
        totalActual={5500}
        previousMonthActual={5000}
        loading={false}
      />
    );

    expect(screen.getByText('vs. mês anterior:')).toBeInTheDocument();
    expect(screen.getByText(/\+R\$ 500,00/)).toBeInTheDocument();
  });

  it('should_show_loading_skeleton', () => {
    render(
      <IncomeSummary
        incomes={[]}
        totalExpected={0}
        totalActual={0}
        loading={true}
      />
    );

    // When loading, skeleton should be rendered
    const container = document.querySelector('.animate-pulse');
    expect(container).toBeInTheDocument();
  });

  it('should_return_null_when_no_incomes', () => {
    const { container } = render(
      <IncomeSummary
        incomes={[]}
        totalExpected={0}
        totalActual={0}
        loading={false}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
