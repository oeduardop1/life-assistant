import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinanceNavTabs } from '../../components/finance-nav-tabs';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from 'next/navigation';

const mockUsePathname = vi.mocked(usePathname);

describe('FinanceNavTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/finance');
  });

  it('should_render_all_finance_tabs', () => {
    render(<FinanceNavTabs />);

    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Rendas')).toBeInTheDocument();
    expect(screen.getByText('Contas')).toBeInTheDocument();
    expect(screen.getByText('Despesas')).toBeInTheDocument();
    expect(screen.getByText('Dívidas')).toBeInTheDocument();
    expect(screen.getByText('Investimentos')).toBeInTheDocument();
  });

  it('should_highlight_overview_tab_when_on_finance_root', () => {
    mockUsePathname.mockReturnValue('/finance');
    render(<FinanceNavTabs />);

    const overviewTab = screen.getByTestId('finance-tab-overview');
    expect(overviewTab).toHaveAttribute('aria-current', 'page');
  });

  it('should_highlight_incomes_tab_when_on_incomes_page', () => {
    mockUsePathname.mockReturnValue('/finance/incomes');
    render(<FinanceNavTabs />);

    const incomesTab = screen.getByTestId('finance-tab-incomes');
    expect(incomesTab).toHaveAttribute('aria-current', 'page');
  });

  it('should_highlight_bills_tab_when_on_bills_subpage', () => {
    mockUsePathname.mockReturnValue('/finance/bills/123');
    render(<FinanceNavTabs />);

    const billsTab = screen.getByTestId('finance-tab-bills');
    expect(billsTab).toHaveAttribute('aria-current', 'page');
  });

  it('should_have_correct_href_for_each_tab', () => {
    render(<FinanceNavTabs />);

    expect(screen.getByTestId('finance-tab-overview')).toHaveAttribute('href', '/finance');
    expect(screen.getByTestId('finance-tab-incomes')).toHaveAttribute('href', '/finance/incomes');
    expect(screen.getByTestId('finance-tab-bills')).toHaveAttribute('href', '/finance/bills');
    expect(screen.getByTestId('finance-tab-expenses')).toHaveAttribute('href', '/finance/expenses');
    expect(screen.getByTestId('finance-tab-debts')).toHaveAttribute('href', '/finance/debts');
    expect(screen.getByTestId('finance-tab-investments')).toHaveAttribute('href', '/finance/investments');
  });

  it('should_have_navigation_role', () => {
    render(<FinanceNavTabs />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
