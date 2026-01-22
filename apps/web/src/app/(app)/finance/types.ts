/**
 * Finance Module Types
 *
 * Types for the Finance dashboard and related pages.
 * @see docs/milestones/phase-2-tracker.md M2.2 for Finance implementation
 */

// =============================================================================
// Summary (from backend FinanceSummary)
// =============================================================================

/**
 * Bills status count breakdown
 */
export interface BillStatusCount {
  total: number;
  pending: number;
  paid: number;
  overdue: number;
  canceled: number;
}

/**
 * Debts summary
 */
export interface DebtsSummary {
  totalDebts: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  negotiatedCount: number;
  monthlyInstallmentSum: number;
}

/**
 * Investments summary
 */
export interface InvestmentsSummary {
  totalInvestments: number;
  totalCurrentAmount: number;
  totalGoalAmount: number;
  totalMonthlyContribution: number;
  averageProgress: number;
}

/**
 * Main finance summary returned by GET /finance/summary
 */
export interface FinanceSummary {
  monthYear: string;

  // Income
  totalIncomeExpected: number;
  totalIncomeActual: number;

  // Bills (fixed expenses)
  totalBills: number;
  billsCount: BillStatusCount;

  // Variable Expenses
  totalExpensesExpected: number;
  totalExpensesActual: number;

  // Budget summary
  totalBudgeted: number; // bills + expenses expected + negotiated debts monthly
  totalSpent: number; // bills paid + expenses actual

  // Balance
  balance: number; // income actual - total spent

  // Debts
  debts: DebtsSummary;

  // Investments
  investments: InvestmentsSummary;
}

// =============================================================================
// API Responses
// =============================================================================

export interface FinanceSummaryResponse {
  summary: FinanceSummary;
}

// =============================================================================
// Dashboard Types
// =============================================================================

/**
 * KPI Card data structure
 */
export interface FinanceKPI {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  icon: string;
  color: 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'yellow';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

/**
 * Category breakdown for charts
 */
export interface CategoryBreakdown {
  category: string;
  expected: number;
  actual: number;
  color: string;
}

/**
 * Monthly data point for evolution chart
 */
export interface MonthlyDataPoint {
  monthYear: string;
  monthLabel: string;
  income: number;
  expenses: number;
  balance: number;
}

/**
 * Pending bill for dashboard list
 */
export interface PendingBill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  category: string;
  isOverdue: boolean;
}

/**
 * Upcoming installment for dashboard list
 */
export interface UpcomingInstallment {
  id: string;
  debtName: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
}

// =============================================================================
// Filter / Query Params
// =============================================================================

export interface FinanceSummaryParams {
  monthYear?: string;
}

// =============================================================================
// Navigation Tabs
// =============================================================================

export type FinanceTab =
  | 'overview'
  | 'incomes'
  | 'bills'
  | 'expenses'
  | 'debts'
  | 'investments';

export interface FinanceTabItem {
  id: FinanceTab;
  label: string;
  href: string;
}

// =============================================================================
// Helpers / Constants
// =============================================================================

/**
 * Finance navigation tabs
 */
export const financeTabs: FinanceTabItem[] = [
  { id: 'overview', label: 'Visão Geral', href: '/finance' },
  { id: 'incomes', label: 'Rendas', href: '/finance/incomes' },
  { id: 'bills', label: 'Contas', href: '/finance/bills' },
  { id: 'expenses', label: 'Despesas', href: '/finance/expenses' },
  { id: 'debts', label: 'Dívidas', href: '/finance/debts' },
  { id: 'investments', label: 'Investimentos', href: '/finance/investments' },
];

/**
 * KPI color classes (Tailwind)
 */
export const kpiColors: Record<FinanceKPI['color'], string> = {
  green: 'text-green-500',
  red: 'text-red-500',
  blue: 'text-blue-500',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  yellow: 'text-yellow-500',
};

/**
 * KPI background color classes (Tailwind)
 */
export const kpiBgColors: Record<FinanceKPI['color'], string> = {
  green: 'bg-green-500/10',
  red: 'bg-red-500/10',
  blue: 'bg-blue-500/10',
  orange: 'bg-orange-500/10',
  purple: 'bg-purple-500/10',
  yellow: 'bg-yellow-500/10',
};

/**
 * Format currency in BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Format month for display (e.g., "Janeiro 2026")
 */
export function formatMonthDisplay(monthYear: string): string {
  const [year, month] = monthYear.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

/**
 * Get previous month in YYYY-MM format
 */
export function getPreviousMonth(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month - 2 because Date months are 0-indexed
  return date.toISOString().slice(0, 7);
}

/**
 * Get next month in YYYY-MM format
 */
export function getNextMonth(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const date = new Date(year, month, 1); // month (not month - 1) because we want next month
  return date.toISOString().slice(0, 7);
}

/**
 * Check if a date is overdue (date is in the past)
 * Uses local date string comparison for timezone safety
 */
export function isOverdue(dueDate: string): boolean {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  return dueDate < todayStr;
}

/**
 * Get balance color based on value
 */
export function getBalanceColor(balance: number): 'green' | 'red' {
  return balance >= 0 ? 'green' : 'red';
}
