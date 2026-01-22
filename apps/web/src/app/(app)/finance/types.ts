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

// =============================================================================
// Income Types
// =============================================================================

/**
 * Income type categories (matches backend income_type enum)
 */
export type IncomeType =
  | 'salary'
  | 'freelance'
  | 'bonus'
  | 'passive'
  | 'investment'
  | 'gift'
  | 'other';

/**
 * Income frequency options (matches backend income_frequency enum)
 */
export type IncomeFrequency =
  | 'monthly'
  | 'biweekly'
  | 'weekly'
  | 'annual'
  | 'irregular';

/**
 * Income entity returned from API
 */
export interface Income {
  id: string;
  userId: string;
  name: string;
  type: IncomeType;
  frequency: IncomeFrequency;
  expectedAmount: number;
  actualAmount: number | null;
  isRecurring: boolean;
  monthYear: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create income payload
 */
export interface CreateIncomeInput {
  name: string;
  type: IncomeType;
  frequency: IncomeFrequency;
  expectedAmount: number;
  actualAmount?: number;
  isRecurring?: boolean;
  monthYear: string;
  currency?: string;
}

/**
 * Update income payload
 */
export interface UpdateIncomeInput {
  name?: string;
  type?: IncomeType;
  frequency?: IncomeFrequency;
  expectedAmount?: number;
  actualAmount?: number | null;
  isRecurring?: boolean;
  monthYear?: string;
  currency?: string;
}

/**
 * Income query parameters
 */
export interface IncomeQueryParams {
  monthYear?: string;
  type?: IncomeType;
  isRecurring?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * API response for single income
 */
export interface IncomeResponse {
  income: Income;
}

/**
 * API response for income list
 */
export interface IncomesListResponse {
  incomes: Income[];
  total: number;
}

// =============================================================================
// Income Constants
// =============================================================================

/**
 * Income type labels (Portuguese)
 */
export const incomeTypeLabels: Record<IncomeType, string> = {
  salary: 'Salário',
  freelance: 'Freelance',
  bonus: 'Bônus',
  passive: 'Renda Passiva',
  investment: 'Investimento',
  gift: 'Presente',
  other: 'Outro',
};

/**
 * Income frequency labels (Portuguese)
 */
export const incomeFrequencyLabels: Record<IncomeFrequency, string> = {
  monthly: 'Mensal',
  biweekly: 'Quinzenal',
  weekly: 'Semanal',
  annual: 'Anual',
  irregular: 'Irregular',
};

/**
 * Income type colors for badges/icons
 */
export const incomeTypeColors: Record<IncomeType, string> = {
  salary: 'green',
  freelance: 'blue',
  bonus: 'purple',
  passive: 'orange',
  investment: 'yellow',
  gift: 'pink',
  other: 'gray',
};

/**
 * Income type options for select dropdown
 */
export const incomeTypeOptions: { value: IncomeType; label: string }[] = [
  { value: 'salary', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'passive', label: 'Renda Passiva' },
  { value: 'investment', label: 'Investimento' },
  { value: 'gift', label: 'Presente' },
  { value: 'other', label: 'Outro' },
];

/**
 * Income frequency options for select dropdown
 */
export const incomeFrequencyOptions: { value: IncomeFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'annual', label: 'Anual' },
  { value: 'irregular', label: 'Irregular' },
];

// =============================================================================
// Bill Types
// =============================================================================

/**
 * Bill category options (matches backend bill_category enum)
 */
export type BillCategory =
  | 'housing'
  | 'utilities'
  | 'subscription'
  | 'insurance'
  | 'other';

/**
 * Bill status options (matches backend bill_status enum)
 */
export type BillStatus =
  | 'pending'
  | 'paid'
  | 'overdue'
  | 'canceled';

/**
 * Bill entity returned from API
 */
export interface Bill {
  id: string;
  userId: string;
  name: string;
  category: BillCategory;
  amount: number;
  dueDay: number;
  status: BillStatus;
  paidAt: string | null;
  isRecurring: boolean;
  monthYear: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create bill payload
 */
export interface CreateBillInput {
  name: string;
  category: BillCategory;
  amount: number;
  dueDay: number;
  isRecurring?: boolean;
  monthYear: string;
  currency?: string;
}

/**
 * Update bill payload
 */
export interface UpdateBillInput {
  name?: string;
  category?: BillCategory;
  amount?: number;
  dueDay?: number;
  status?: BillStatus;
  isRecurring?: boolean;
  monthYear?: string;
  currency?: string;
}

/**
 * Bill query parameters
 */
export interface BillQueryParams {
  monthYear?: string;
  category?: BillCategory;
  status?: BillStatus;
  isRecurring?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * API response for single bill
 */
export interface BillResponse {
  bill: Bill;
}

/**
 * API response for bill list
 */
export interface BillsListResponse {
  bills: Bill[];
  total: number;
}

/**
 * Bill totals for summary
 */
export interface BillTotals {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  count: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

// =============================================================================
// Bill Constants
// =============================================================================

/**
 * Bill category labels (Portuguese)
 */
export const billCategoryLabels: Record<BillCategory, string> = {
  housing: 'Moradia',
  utilities: 'Utilidades',
  subscription: 'Assinatura',
  insurance: 'Seguro',
  other: 'Outro',
};

/**
 * Bill status labels (Portuguese)
 */
export const billStatusLabels: Record<BillStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  canceled: 'Cancelado',
};

/**
 * Bill category colors for badges/icons
 */
export const billCategoryColors: Record<BillCategory, string> = {
  housing: 'blue',
  utilities: 'yellow',
  subscription: 'purple',
  insurance: 'green',
  other: 'gray',
};

/**
 * Bill status colors for badges
 */
export const billStatusColors: Record<BillStatus, string> = {
  pending: 'orange',
  paid: 'green',
  overdue: 'red',
  canceled: 'gray',
};

/**
 * Bill category options for select dropdown
 */
export const billCategoryOptions: { value: BillCategory; label: string }[] = [
  { value: 'housing', label: 'Moradia' },
  { value: 'utilities', label: 'Utilidades' },
  { value: 'subscription', label: 'Assinatura' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'other', label: 'Outro' },
];

/**
 * Bill status filter options for UI
 */
export type BillStatusFilter = 'all' | 'pending' | 'paid';

/**
 * Get due date string for a bill given monthYear and dueDay
 * @param monthYear - Month in YYYY-MM format
 * @param dueDay - Day of month (1-31)
 * @returns Date string in YYYY-MM-DD format
 */
export function getDueDateForMonth(monthYear: string, dueDay: number): string {
  const [year, month] = monthYear.split('-').map(Number);
  // Handle months with fewer days (e.g., February)
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const actualDay = Math.min(dueDay, lastDayOfMonth);
  return `${monthYear}-${String(actualDay).padStart(2, '0')}`;
}

/**
 * Check if a bill is overdue based on dueDay and monthYear
 */
export function isBillOverdue(bill: Bill): boolean {
  if (bill.status === 'paid' || bill.status === 'canceled') {
    return false;
  }
  const dueDate = getDueDateForMonth(bill.monthYear, bill.dueDay);
  return isOverdue(dueDate);
}
