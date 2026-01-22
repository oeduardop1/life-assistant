import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyEvolutionChart } from '../../components/monthly-evolution-chart';
import type { MonthlyDataPoint } from '../../types';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('MonthlyEvolutionChart', () => {
  const mockData: MonthlyDataPoint[] = [
    { monthYear: '2025-10', monthLabel: 'Out', income: 5000, expenses: 4000, balance: 1000 },
    { monthYear: '2025-11', monthLabel: 'Nov', income: 5500, expenses: 4200, balance: 1300 },
    { monthYear: '2025-12', monthLabel: 'Dez', income: 6000, expenses: 5000, balance: 1000 },
    { monthYear: '2026-01', monthLabel: 'Jan', income: 5000, expenses: 3500, balance: 1500 },
  ];

  it('should_render_chart_title_and_description', () => {
    render(<MonthlyEvolutionChart data={mockData} />);

    expect(screen.getByText('Evolução Mensal')).toBeInTheDocument();
    expect(screen.getByText('Renda, gastos e saldo dos últimos meses')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton_when_loading', () => {
    render(<MonthlyEvolutionChart data={[]} loading={true} />);

    expect(screen.getByTestId('monthly-evolution-chart-loading')).toBeInTheDocument();
  });

  it('should_show_empty_state_when_no_data', () => {
    render(<MonthlyEvolutionChart data={[]} />);

    expect(screen.getByTestId('monthly-evolution-chart-empty')).toBeInTheDocument();
    expect(screen.getByText('Nenhum dado para exibir')).toBeInTheDocument();
  });

  it('should_render_chart_container_with_data', () => {
    render(<MonthlyEvolutionChart data={mockData} />);

    expect(screen.getByTestId('monthly-evolution-chart')).toBeInTheDocument();
  });
});
