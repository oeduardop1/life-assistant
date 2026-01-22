import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceKPICard, FinanceKPICardsGrid } from '../../components/finance-kpi-card';

describe('FinanceKPICard', () => {
  it('should_render_title_and_formatted_currency_value', () => {
    render(
      <FinanceKPICard
        title="Renda do Mês"
        value={5000}
        icon="TrendingUp"
        color="green"
      />
    );

    expect(screen.getByText('Renda do Mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 5.000,00')).toBeInTheDocument();
  });

  it('should_apply_correct_color_class', () => {
    const { container } = render(
      <FinanceKPICard
        title="Total de Dívidas"
        value={10000}
        icon="CreditCard"
        color="red"
      />
    );

    const coloredElement = container.querySelector('.text-red-500');
    expect(coloredElement).toBeInTheDocument();
  });

  it('should_show_trend_indicator_when_provided', () => {
    render(
      <FinanceKPICard
        title="Saldo"
        value={2000}
        icon="Wallet"
        color="green"
        trend={{ value: 15.5, direction: 'up' }}
      />
    );

    expect(screen.getByText('+15.5%')).toBeInTheDocument();
  });

  it('should_show_negative_trend_for_down_direction', () => {
    render(
      <FinanceKPICard
        title="Total Gasto"
        value={3000}
        icon="ShoppingCart"
        color="orange"
        trend={{ value: -10.2, direction: 'down' }}
      />
    );

    expect(screen.getByText('-10.2%')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton_when_loading', () => {
    render(
      <FinanceKPICard
        title="Renda do Mês"
        value={5000}
        icon="TrendingUp"
        color="green"
        loading={true}
      />
    );

    expect(screen.getByTestId('finance-kpi-card-loading')).toBeInTheDocument();
  });

  it('should_format_non_currency_value_with_suffix', () => {
    render(
      <FinanceKPICard
        title="Progresso"
        value={75}
        icon="Target"
        color="blue"
        formatAsCurrency={false}
        suffix="%"
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});

describe('FinanceKPICardsGrid', () => {
  it('should_render_children_in_grid', () => {
    render(
      <FinanceKPICardsGrid>
        <FinanceKPICard title="Card 1" value={100} icon="Wallet" color="green" />
        <FinanceKPICard title="Card 2" value={200} icon="Wallet" color="blue" />
      </FinanceKPICardsGrid>
    );

    expect(screen.getByTestId('finance-kpi-cards-grid')).toBeInTheDocument();
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
  });
});
