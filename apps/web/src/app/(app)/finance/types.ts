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
  totalSpent: number; // bills paid + expenses actual + debt payments this month
  paidBillsAmount: number; // actual SQL SUM of paid bills
  debtPaymentsThisMonth: number; // actual debt payments for this month

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

/**
 * Scope for recurring item edit/delete operations
 * - 'this': only this month's entry
 * - 'future': this month and all future months
 * - 'all': all entries in the recurring group
 */
export type RecurringScope = 'this' | 'future' | 'all';

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
  recurringGroupId: string | null;
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
  recurringGroupId: string | null;
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

// =============================================================================
// Expense Types (Variable Expenses)
// =============================================================================

/**
 * Expense category options (matches backend expense_category enum)
 */
export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'housing'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'subscriptions'
  | 'travel'
  | 'gifts'
  | 'investments'
  | 'other';

/**
 * Variable Expense entity returned from API
 */
export interface Expense {
  id: string;
  userId: string;
  name: string;
  category: ExpenseCategory;
  expectedAmount: number;
  actualAmount: number;
  isRecurring: boolean;
  recurringGroupId: string | null;
  monthYear: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create expense payload
 */
export interface CreateExpenseInput {
  name: string;
  category: ExpenseCategory;
  expectedAmount: number;
  actualAmount?: number;
  isRecurring?: boolean;
  monthYear: string;
  currency?: string;
}

/**
 * Update expense payload
 */
export interface UpdateExpenseInput {
  name?: string;
  category?: ExpenseCategory;
  expectedAmount?: number;
  actualAmount?: number;
  isRecurring?: boolean;
}

/**
 * Expense query parameters
 */
export interface ExpenseQueryParams {
  monthYear?: string;
  category?: ExpenseCategory;
  isRecurring?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * API response for single expense
 */
export interface ExpenseResponse {
  expense: Expense;
}

/**
 * API response for expense list
 */
export interface ExpensesListResponse {
  expenses: Expense[];
  total: number;
}

/**
 * Expense totals for summary
 */
export interface ExpenseTotals {
  totalExpected: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  count: number;
  recurringCount: number;
  oneTimeCount: number;
}

// =============================================================================
// Expense Constants
// =============================================================================

/**
 * Expense category labels (Portuguese)
 */
export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  food: 'Alimentação',
  transport: 'Transporte',
  housing: 'Moradia',
  health: 'Saúde',
  education: 'Educação',
  entertainment: 'Lazer',
  shopping: 'Compras',
  bills: 'Contas',
  subscriptions: 'Assinaturas',
  travel: 'Viagem',
  gifts: 'Presentes',
  investments: 'Investimentos',
  other: 'Outro',
};

/**
 * Expense category colors for badges/icons
 */
export const expenseCategoryColors: Record<ExpenseCategory, string> = {
  food: 'orange',
  transport: 'blue',
  housing: 'purple',
  health: 'red',
  education: 'indigo',
  entertainment: 'pink',
  shopping: 'yellow',
  bills: 'gray',
  subscriptions: 'cyan',
  travel: 'green',
  gifts: 'rose',
  investments: 'emerald',
  other: 'slate',
};

/**
 * Expense category options for select dropdown
 */
export const expenseCategoryOptions: { value: ExpenseCategory; label: string }[] = [
  { value: 'food', label: 'Alimentação' },
  { value: 'transport', label: 'Transporte' },
  { value: 'housing', label: 'Moradia' },
  { value: 'health', label: 'Saúde' },
  { value: 'education', label: 'Educação' },
  { value: 'entertainment', label: 'Lazer' },
  { value: 'shopping', label: 'Compras' },
  { value: 'bills', label: 'Contas' },
  { value: 'subscriptions', label: 'Assinaturas' },
  { value: 'travel', label: 'Viagem' },
  { value: 'gifts', label: 'Presentes' },
  { value: 'investments', label: 'Investimentos' },
  { value: 'other', label: 'Outro' },
];

// =============================================================================
// Debt Types
// =============================================================================

/**
 * Debt status options (matches backend debt_status enum)
 */
export type DebtStatus = 'active' | 'paid_off' | 'settled' | 'defaulted';

/**
 * Debt entity returned from API
 */
export interface Debt {
  id: string;
  userId: string;
  name: string;
  creditor: string | null;
  totalAmount: number;
  isNegotiated: boolean;
  totalInstallments: number | null;
  installmentAmount: number | null;
  currentInstallment: number;
  dueDay: number | null;
  status: DebtStatus;
  notes: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create debt payload
 */
export interface CreateDebtInput {
  name: string;
  creditor?: string;
  totalAmount: number;
  isNegotiated?: boolean;
  totalInstallments?: number;
  installmentAmount?: number;
  dueDay?: number;
  notes?: string;
  currency?: string;
}

/**
 * Update debt payload
 */
export interface UpdateDebtInput {
  name?: string;
  creditor?: string;
  totalAmount?: number;
  status?: DebtStatus;
  notes?: string;
  currency?: string;
}

/**
 * Negotiate debt payload (for non-negotiated debts)
 */
export interface NegotiateDebtInput {
  totalInstallments: number;
  installmentAmount: number;
  dueDay: number;
}

/**
 * Debt query parameters
 */
export interface DebtQueryParams {
  status?: DebtStatus;
  isNegotiated?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * API response for single debt
 */
export interface DebtResponse {
  debt: Debt;
}

/**
 * API response for debt list
 */
export interface DebtsListResponse {
  debts: Debt[];
  total: number;
}

/**
 * Debt totals for summary
 */
export interface DebtTotals {
  totalDebts: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  monthlyInstallmentSum: number;
  negotiatedCount: number;
  pendingNegotiationCount: number;
}

/**
 * Debt progress information
 */
export interface DebtProgress {
  paidInstallments: number;
  remainingInstallments: number;
  progressPercent: number;
  paidAmount: number;
  remainingAmount: number;
}

// =============================================================================
// Debt Constants
// =============================================================================

/**
 * Debt status labels (Portuguese)
 */
export const debtStatusLabels: Record<DebtStatus, string> = {
  active: 'Ativo',
  paid_off: 'Quitado',
  settled: 'Acordado',
  defaulted: 'Inadimplente',
};

/**
 * Debt status colors for badges
 */
export const debtStatusColors: Record<DebtStatus, string> = {
  active: 'blue',
  paid_off: 'green',
  settled: 'purple',
  defaulted: 'red',
};

/**
 * Debt status options for select dropdown
 */
export const debtStatusOptions: { value: DebtStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'paid_off', label: 'Quitado' },
  { value: 'settled', label: 'Acordado' },
  { value: 'defaulted', label: 'Inadimplente' },
];

// =============================================================================
// Debt Helper Functions
// =============================================================================

/**
 * Calculate debt progress for negotiated debts
 * @param debt - The debt entity
 * @returns DebtProgress with installment and amount info
 */
export function calculateDebtProgress(debt: Debt): DebtProgress {
  if (!debt.isNegotiated || !debt.totalInstallments || !debt.installmentAmount) {
    return {
      paidInstallments: 0,
      remainingInstallments: 0,
      progressPercent: 0,
      paidAmount: 0,
      remainingAmount: debt.totalAmount,
    };
  }

  const paidInstallments = debt.currentInstallment - 1;
  const remainingInstallments = debt.totalInstallments - paidInstallments;
  const progressPercent = (paidInstallments / debt.totalInstallments) * 100;
  const paidAmount = paidInstallments * debt.installmentAmount;
  const remainingAmount = remainingInstallments * debt.installmentAmount;

  return {
    paidInstallments,
    remainingInstallments,
    progressPercent,
    paidAmount,
    remainingAmount,
  };
}

/**
 * Calculate debt totals from a list of debts
 * @param debts - Array of debt entities
 * @returns DebtTotals summary
 */
export function calculateDebtTotals(debts: Debt[]): DebtTotals {
  const activeDebts = debts.filter((d) => d.status === 'active');
  const negotiatedDebts = activeDebts.filter((d) => d.isNegotiated);
  const pendingDebts = activeDebts.filter((d) => !d.isNegotiated);

  let totalPaid = 0;
  let monthlyInstallmentSum = 0;

  for (const debt of negotiatedDebts) {
    if (debt.installmentAmount && debt.totalInstallments) {
      const paidInstallments = debt.currentInstallment - 1;
      const installment = typeof debt.installmentAmount === 'string' ? parseFloat(debt.installmentAmount) : debt.installmentAmount;
      totalPaid += paidInstallments * installment;
      monthlyInstallmentSum += installment;
    }
  }

  const totalAmount = activeDebts.reduce((sum, d) => {
    const amount = typeof d.totalAmount === 'string' ? parseFloat(d.totalAmount) : d.totalAmount;
    return sum + amount;
  }, 0);
  const totalRemaining = totalAmount - totalPaid;

  return {
    totalDebts: activeDebts.length,
    totalAmount,
    totalPaid,
    totalRemaining,
    monthlyInstallmentSum,
    negotiatedCount: negotiatedDebts.length,
    pendingNegotiationCount: pendingDebts.length,
  };
}

/**
 * Get due date for current month based on dueDay
 * @param dueDay - Day of month (1-31)
 * @returns Date string in YYYY-MM-DD format
 */
export function getDebtDueDateForCurrentMonth(dueDay: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthYear = `${year}-${String(month).padStart(2, '0')}`;
  return getDueDateForMonth(monthYear, dueDay);
}

/**
 * Check if a debt installment is overdue
 * @param debt - The debt entity
 * @returns true if the debt has a dueDay and it's past that date
 */
export function isDebtInstallmentOverdue(debt: Debt): boolean {
  if (!debt.isNegotiated || !debt.dueDay || debt.status !== 'active') {
    return false;
  }
  const dueDate = getDebtDueDateForCurrentMonth(debt.dueDay);
  return isOverdue(dueDate);
}

// =============================================================================
// Investment Types
// =============================================================================

/**
 * Investment type options (matches backend investment_type enum)
 */
export type InvestmentType =
  | 'emergency_fund'
  | 'retirement'
  | 'short_term'
  | 'long_term'
  | 'education'
  | 'custom';

/**
 * Investment entity returned from API
 */
export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: InvestmentType;
  goalAmount: string | null;
  currentAmount: string;
  monthlyContribution: string | null;
  deadline: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create investment payload
 */
export interface CreateInvestmentInput {
  name: string;
  type: InvestmentType;
  currentAmount?: number;
  goalAmount?: number;
  monthlyContribution?: number;
  deadline?: string;
  currency?: string;
}

/**
 * Update investment payload
 */
export interface UpdateInvestmentInput {
  name?: string;
  type?: InvestmentType;
  currentAmount?: number;
  goalAmount?: number;
  monthlyContribution?: number;
  deadline?: string;
  currency?: string;
}

/**
 * Update investment value payload
 */
export interface UpdateInvestmentValueInput {
  currentAmount: number;
}

/**
 * Investment query parameters
 */
export interface InvestmentQueryParams {
  type?: InvestmentType;
  limit?: number;
  offset?: number;
}

/**
 * API response for single investment
 */
export interface InvestmentResponse {
  investment: Investment;
}

/**
 * API response for investment list
 */
export interface InvestmentsListResponse {
  investments: Investment[];
  total: number;
}

/**
 * Investment progress information
 */
export interface InvestmentProgress {
  currentAmount: number;
  goalAmount: number | null;
  progressPercent: number;
  remainingAmount: number | null;
  monthsToGoal: number | null;
}

/**
 * Investment totals for summary
 */
export interface InvestmentTotals {
  totalInvestments: number;
  totalCurrentAmount: number;
  totalGoalAmount: number;
  totalMonthlyContribution: number;
  averageProgress: number;
}

// =============================================================================
// Investment Constants
// =============================================================================

/**
 * Investment type labels (Portuguese)
 */
export const investmentTypeLabels: Record<InvestmentType, string> = {
  emergency_fund: 'Reserva de Emergência',
  retirement: 'Aposentadoria',
  short_term: 'Curto Prazo',
  long_term: 'Longo Prazo',
  education: 'Educação',
  custom: 'Personalizado',
};

/**
 * Investment type colors for badges/icons
 */
export const investmentTypeColors: Record<InvestmentType, string> = {
  emergency_fund: 'green',
  retirement: 'purple',
  short_term: 'blue',
  long_term: 'orange',
  education: 'indigo',
  custom: 'gray',
};

/**
 * Investment type options for select dropdown
 */
export const investmentTypeOptions: { value: InvestmentType; label: string }[] = [
  { value: 'emergency_fund', label: 'Reserva de Emergência' },
  { value: 'retirement', label: 'Aposentadoria' },
  { value: 'short_term', label: 'Curto Prazo' },
  { value: 'long_term', label: 'Longo Prazo' },
  { value: 'education', label: 'Educação' },
  { value: 'custom', label: 'Personalizado' },
];

// =============================================================================
// Investment Helper Functions
// =============================================================================

/**
 * Calculate investment progress
 * @param investment - The investment entity
 * @returns InvestmentProgress with progress info
 */
export function calculateInvestmentProgress(investment: Investment): InvestmentProgress {
  const currentAmount = parseFloat(investment.currentAmount) || 0;
  const goalAmount = investment.goalAmount ? parseFloat(investment.goalAmount) : null;
  const monthlyContribution = investment.monthlyContribution
    ? parseFloat(investment.monthlyContribution)
    : null;

  let progressPercent = 0;
  let remainingAmount: number | null = null;
  let monthsToGoal: number | null = null;

  if (goalAmount && goalAmount > 0) {
    progressPercent = Math.min((currentAmount / goalAmount) * 100, 100);
    remainingAmount = Math.max(goalAmount - currentAmount, 0);

    if (monthlyContribution && monthlyContribution > 0 && remainingAmount > 0) {
      monthsToGoal = Math.ceil(remainingAmount / monthlyContribution);
    }
  }

  return {
    currentAmount,
    goalAmount,
    progressPercent,
    remainingAmount,
    monthsToGoal,
  };
}

/**
 * Calculate investment totals from a list
 * @param investments - Array of investment entities
 * @returns InvestmentTotals summary
 */
export function calculateInvestmentTotals(investments: Investment[]): InvestmentTotals {
  let totalCurrentAmount = 0;
  let totalGoalAmount = 0;
  let totalMonthlyContribution = 0;
  let totalProgress = 0;
  let investmentsWithGoals = 0;

  for (const investment of investments) {
    const current = parseFloat(investment.currentAmount) || 0;
    const goal = investment.goalAmount ? parseFloat(investment.goalAmount) : 0;
    const contribution = investment.monthlyContribution
      ? parseFloat(investment.monthlyContribution)
      : 0;

    totalCurrentAmount += current;
    totalGoalAmount += goal;
    totalMonthlyContribution += contribution;

    if (goal > 0) {
      totalProgress += (current / goal) * 100;
      investmentsWithGoals++;
    }
  }

  const averageProgress = investmentsWithGoals > 0
    ? totalProgress / investmentsWithGoals
    : 0;

  return {
    totalInvestments: investments.length,
    totalCurrentAmount,
    totalGoalAmount,
    totalMonthlyContribution,
    averageProgress,
  };
}

/**
 * Format investment deadline for display
 * @param deadline - Date string in YYYY-MM-DD format
 * @returns Formatted date (e.g., "Jan 2027")
 */
export function formatInvestmentDeadline(deadline: string | null): string {
  if (!deadline) return '';
  const [year, month] = deadline.split('-').map(Number);
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  return `${months[month - 1]} ${year}`;
}

/**
 * Check if investment deadline has passed
 * @param deadline - Date string in YYYY-MM-DD format
 * @returns true if deadline is in the past
 */
export function isInvestmentOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return deadline < today;
}
