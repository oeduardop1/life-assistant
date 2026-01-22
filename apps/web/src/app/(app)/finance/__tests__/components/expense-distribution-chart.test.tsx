import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpenseDistributionChart } from '../../components/expense-distribution-chart';
import type { CategoryBreakdown } from '../../types';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ExpenseDistributionChart', () => {
  const mockData: CategoryBreakdown[] = [
    { category: 'Alimentação', expected: 1000, actual: 950, color: '#3b82f6' },
    { category: 'Transporte', expected: 500, actual: 600, color: '#22c55e' },
    { category: 'Lazer', expected: 300, actual: 250, color: '#f97316' },
  ];

  it('should_render_chart_title_and_description', () => {
    render(<ExpenseDistributionChart data={mockData} />);

    expect(screen.getByText('Distribuição de Gastos')).toBeInTheDocument();
    expect(screen.getByText('Por categoria de despesas')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton_when_loading', () => {
    render(<ExpenseDistributionChart data={[]} loading={true} />);

    expect(screen.getByTestId('expense-distribution-chart-loading')).toBeInTheDocument();
  });

  it('should_show_empty_state_when_no_data', () => {
    render(<ExpenseDistributionChart data={[]} />);

    expect(screen.getByTestId('expense-distribution-chart-empty')).toBeInTheDocument();
    expect(screen.getByText('Nenhum dado para exibir')).toBeInTheDocument();
  });

  it('should_render_chart_container_with_data', () => {
    render(<ExpenseDistributionChart data={mockData} />);

    expect(screen.getByTestId('expense-distribution-chart')).toBeInTheDocument();
  });

  it('should_filter_out_zero_values', () => {
    const dataWithZero: CategoryBreakdown[] = [
      { category: 'Alimentação', expected: 1000, actual: 950, color: '#3b82f6' },
      { category: 'Transporte', expected: 500, actual: 0, color: '#22c55e' },
    ];

    render(<ExpenseDistributionChart data={dataWithZero} />);

    expect(screen.getByTestId('expense-distribution-chart')).toBeInTheDocument();
  });
});
