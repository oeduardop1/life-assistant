import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetVsRealChart } from '../../components/budget-vs-real-chart';
import type { CategoryBreakdown } from '../../types';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('BudgetVsRealChart', () => {
  const mockData: CategoryBreakdown[] = [
    { category: 'Alimentação', expected: 1000, actual: 950, color: '#3b82f6' },
    { category: 'Transporte', expected: 500, actual: 600, color: '#22c55e' },
    { category: 'Lazer', expected: 300, actual: 250, color: '#f97316' },
  ];

  it('should_render_chart_title_and_description', () => {
    render(<BudgetVsRealChart data={mockData} />);

    expect(screen.getByText('Orçado vs Real')).toBeInTheDocument();
    expect(screen.getByText('Comparação por categoria de despesas')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton_when_loading', () => {
    render(<BudgetVsRealChart data={[]} loading={true} />);

    expect(screen.getByTestId('budget-vs-real-chart-loading')).toBeInTheDocument();
  });

  it('should_show_empty_state_when_no_data', () => {
    render(<BudgetVsRealChart data={[]} />);

    expect(screen.getByTestId('budget-vs-real-chart-empty')).toBeInTheDocument();
    expect(screen.getByText('Nenhum dado para exibir')).toBeInTheDocument();
  });

  it('should_render_chart_container_with_data', () => {
    render(<BudgetVsRealChart data={mockData} />);

    expect(screen.getByTestId('budget-vs-real-chart')).toBeInTheDocument();
  });
});
