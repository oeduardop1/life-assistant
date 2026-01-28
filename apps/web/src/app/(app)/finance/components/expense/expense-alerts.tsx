'use client';

import { AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, type Expense } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface ExpenseAlertsProps {
  expenses: Expense[];
  onExpenseClick?: (expenseId: string) => void;
  className?: string;
}

interface ExpenseAlertBannerProps {
  expenses: Expense[];
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getOverBudgetExpenses(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => {
    const expected = typeof e.expectedAmount === 'string' ? parseFloat(e.expectedAmount) : e.expectedAmount;
    const actual = typeof e.actualAmount === 'string' ? parseFloat(e.actualAmount) : e.actualAmount;
    return actual > expected && expected > 0;
  });
}

function calculateVariance(expense: Expense): number {
  const expected = typeof expense.expectedAmount === 'string' ? parseFloat(expense.expectedAmount) : expense.expectedAmount;
  const actual = typeof expense.actualAmount === 'string' ? parseFloat(expense.actualAmount) : expense.actualAmount;
  return actual - expected;
}

function calculateTotalVariance(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => {
    const expected = typeof e.expectedAmount === 'string' ? parseFloat(e.expectedAmount) : e.expectedAmount;
    const actual = typeof e.actualAmount === 'string' ? parseFloat(e.actualAmount) : e.actualAmount;
    return sum + (actual - expected);
  }, 0);
}

// =============================================================================
// Alert Badge Component
// =============================================================================

interface AlertBadgeProps {
  expense: Expense;
  onClick?: () => void;
}

function AlertBadge({ expense, onClick }: AlertBadgeProps) {
  const variance = calculateVariance(expense);
  const variancePercent = expense.expectedAmount > 0
    ? ((variance / expense.expectedAmount) * 100).toFixed(0)
    : 0;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer',
        'bg-destructive/10 hover:bg-destructive/15 border-destructive/20'
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      <div className="flex flex-col items-start text-left min-w-0">
        <span className="text-sm font-medium text-destructive truncate max-w-[150px]">
          {expense.name}
        </span>
        <span className="text-xs text-muted-foreground">
          +{formatCurrency(variance)} ({variancePercent}% acima)
        </span>
      </div>
    </motion.button>
  );
}

// =============================================================================
// Main Alerts Component
// =============================================================================

/**
 * ExpenseAlerts - Shows clickable badges for over-budget expenses
 *
 * Features:
 * - Displays individual over-budget expenses
 * - Clickable to navigate/highlight expense
 * - Shows variance amount and percentage
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseAlerts({
  expenses,
  onExpenseClick,
  className,
}: ExpenseAlertsProps) {
  const overBudgetExpenses = getOverBudgetExpenses(expenses);

  if (overBudgetExpenses.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      data-testid="expense-alerts"
      role="alert"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {overBudgetExpenses.slice(0, 4).map((expense) => (
          <AlertBadge
            key={expense.id}
            expense={expense}
            onClick={() => onExpenseClick?.(expense.id)}
          />
        ))}
        {overBudgetExpenses.length > 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center px-3 py-2 text-sm text-muted-foreground"
          >
            +{overBudgetExpenses.length - 4} mais
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Alert Banner Component
// =============================================================================

/**
 * ExpenseAlertBanner - Summary banner showing overall budget status
 *
 * Features:
 * - Shows over-budget warning or under-budget success
 * - Displays total variance amount
 * - Animated entrance
 */
export function ExpenseAlertBanner({
  expenses,
  className,
}: ExpenseAlertBannerProps) {
  const totalVariance = calculateTotalVariance(expenses);
  const overBudgetExpenses = getOverBudgetExpenses(expenses);
  const isOverBudget = totalVariance > 0;

  // Don't show banner if exactly on budget
  if (totalVariance === 0) {
    return null;
  }

  // Over budget banner
  if (isOverBudget) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex items-center justify-between gap-4 p-4 rounded-xl border',
          'bg-destructive/10 border-destructive/20',
          className
        )}
        data-testid="expense-alert-banner-over"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">
              {overBudgetExpenses.length}{' '}
              {overBudgetExpenses.length === 1 ? 'despesa' : 'despesas'} acima do orçamento
            </p>
            <p className="text-sm text-muted-foreground">
              Totalizando +{formatCurrency(totalVariance)} além do previsto
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Under budget success banner
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center justify-between gap-4 p-4 rounded-xl border',
        'bg-emerald-500/10 border-emerald-500/20',
        className
      )}
      data-testid="expense-alert-banner-under"
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-500 shrink-0" />
        <div>
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            Você está abaixo do orçamento previsto
          </p>
          <p className="text-sm text-muted-foreground">
            Economia de {formatCurrency(Math.abs(totalVariance))} este mês
          </p>
        </div>
      </div>
      <TrendingDown className="h-5 w-5 text-emerald-600 dark:text-emerald-500 shrink-0" />
    </motion.div>
  );
}
