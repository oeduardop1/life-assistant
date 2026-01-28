'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  expenseCategoryLabels,
  expenseCategoryColors,
  type ExpenseTotals,
  type Expense,
  type ExpenseCategory,
} from '../../types';
import { AnimatedProgressBar, ExpenseSummarySkeleton } from './expense-animations';

// =============================================================================
// Types
// =============================================================================

interface ExpenseSummaryProps {
  totals: ExpenseTotals;
  expenses?: Expense[];
  loading?: boolean;
}

interface CategoryBreakdown {
  category: ExpenseCategory;
  expected: number;
  actual: number;
  percent: number;
  color: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateCategoryBreakdown(expenses: Expense[]): CategoryBreakdown[] {
  const categoryMap = new Map<ExpenseCategory, { expected: number; actual: number }>();

  for (const expense of expenses) {
    const expected = typeof expense.expectedAmount === 'string'
      ? parseFloat(expense.expectedAmount)
      : expense.expectedAmount;
    const actual = typeof expense.actualAmount === 'string'
      ? parseFloat(expense.actualAmount)
      : expense.actualAmount;

    const existing = categoryMap.get(expense.category) || { expected: 0, actual: 0 };
    categoryMap.set(expense.category, {
      expected: existing.expected + expected,
      actual: existing.actual + actual,
    });
  }

  const breakdown: CategoryBreakdown[] = [];
  categoryMap.forEach((values, category) => {
    const percent = values.expected > 0 ? (values.actual / values.expected) * 100 : 0;
    breakdown.push({
      category,
      expected: values.expected,
      actual: values.actual,
      percent,
      color: expenseCategoryColors[category] || 'gray',
    });
  });

  // Sort by actual amount descending
  breakdown.sort((a, b) => b.actual - a.actual);

  return breakdown;
}

function getStatusColor(percent: number): 'success' | 'warning' | 'danger' {
  if (percent > 100) return 'danger';
  if (percent >= 80) return 'warning';
  return 'success';
}

// =============================================================================
// Category Bar Item Component
// =============================================================================

interface CategoryBarItemProps {
  breakdown: CategoryBreakdown;
}

const colorBarClasses: Record<string, string> = {
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-500',
  pink: 'bg-pink-500',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-500',
  cyan: 'bg-cyan-500',
  green: 'bg-green-500',
  rose: 'bg-rose-500',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-500',
};

const colorDotClasses: Record<string, string> = {
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-500',
  pink: 'bg-pink-500',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-500',
  cyan: 'bg-cyan-500',
  green: 'bg-green-500',
  rose: 'bg-rose-500',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-500',
};

function CategoryBarItem({ breakdown }: CategoryBarItemProps) {
  const isOverBudget = breakdown.percent > 100;
  const displayPercent = Math.min(breakdown.percent, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 text-sm"
    >
      <div className={cn('w-2 h-2 rounded-full shrink-0', colorDotClasses[breakdown.color])} />
      <span className="w-24 truncate text-muted-foreground">
        {expenseCategoryLabels[breakdown.category]}
      </span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${displayPercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className={cn(
            'h-full rounded-full',
            isOverBudget ? 'bg-destructive' : colorBarClasses[breakdown.color]
          )}
        />
      </div>
      <span className={cn(
        'w-16 text-right tabular-nums',
        isOverBudget && 'text-destructive font-medium'
      )}>
        {formatCurrency(breakdown.actual)}
      </span>
      <span className={cn(
        'w-12 text-right text-xs tabular-nums',
        isOverBudget ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {breakdown.percent.toFixed(0)}%
      </span>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ExpenseSummary - Displays expense totals with visual progress and category breakdown
 *
 * Features:
 * - Main progress bar showing overall budget usage
 * - Expandable category breakdown with mini-bars
 * - Color-coded status indicators
 * - Animated transitions
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseSummary({ totals, expenses = [], loading }: ExpenseSummaryProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (loading) {
    return <ExpenseSummarySkeleton />;
  }

  // Calculate overall usage percentage
  const usagePercent = totals.totalExpected > 0
    ? (totals.totalActual / totals.totalExpected) * 100
    : 0;

  // Determine variance direction and color
  const isOverBudget = totals.variance > 0;
  const isUnderBudget = totals.variance < 0;
  const isOnBudget = totals.variance === 0;

  const varianceColor = isOverBudget
    ? 'text-destructive'
    : isUnderBudget
    ? 'text-emerald-600 dark:text-emerald-500'
    : 'text-muted-foreground';

  const VarianceIcon = isOverBudget
    ? TrendingUp
    : isUnderBudget
    ? TrendingDown
    : Minus;

  // Calculate category breakdown
  const categoryBreakdown = calculateCategoryBreakdown(expenses);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden"
      data-testid="expense-summary"
    >
      {/* Main Progress Section */}
      <div className="p-4 space-y-3">
        {/* Progress Bar */}
        <AnimatedProgressBar
          value={Math.min(usagePercent, 100)}
          max={100}
          size="lg"
          color={getStatusColor(usagePercent)}
        />

        {/* Stats Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatCurrency(totals.totalActual)}
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-sm font-medium tabular-nums">
              {formatCurrency(totals.totalExpected)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.span
              key={usagePercent}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'text-lg font-semibold tabular-nums',
                usagePercent > 100 && 'text-destructive',
                usagePercent >= 80 && usagePercent <= 100 && 'text-amber-600 dark:text-amber-500',
                usagePercent < 80 && 'text-emerald-600 dark:text-emerald-500'
              )}
            >
              {usagePercent.toFixed(0)}%
            </motion.span>
            <span className="text-xs text-muted-foreground">usado</span>
          </div>
        </div>

        {/* Variance Badge */}
        <div className="flex items-center gap-2">
          <VarianceIcon className={cn('h-4 w-4', varianceColor)} />
          <span className={cn('text-sm font-medium', varianceColor)}>
            {isOnBudget
              ? 'No orçamento'
              : isOverBudget
              ? `+${formatCurrency(totals.variance)} acima`
              : `${formatCurrency(Math.abs(totals.variance))} economia`}
          </span>
          <span className="text-xs text-muted-foreground">
            ({Math.abs(totals.variancePercent).toFixed(1)}%)
          </span>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>{totals.count} despesas</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{totals.recurringCount} recorrentes</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{totals.oneTimeCount} pontuais</span>
        </div>
      </div>

      {/* Category Breakdown - Clickable Toggle */}
      {categoryBreakdown.length > 0 && (
        <div>
          {/* Clickable toggle area */}
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className={cn(
              'w-full px-4 py-2.5',
              'flex items-center justify-between',
              'border-t border-border/50',
              'text-sm text-muted-foreground',
              'transition-all duration-200',
              'hover:bg-muted/50 hover:text-foreground',
              'group cursor-pointer',
              showBreakdown && 'bg-muted/30'
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {categoryBreakdown.slice(0, 3).map((item) => (
                  <div
                    key={item.category}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full ring-2 ring-card',
                      colorDotClasses[item.color]
                    )}
                  />
                ))}
              </div>
              <span className="group-hover:text-foreground transition-colors">
                {showBreakdown ? 'Ocultar categorias' : 'Ver por categoria'}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                'group-hover:text-foreground',
                showBreakdown && 'rotate-180'
              )}
            />
          </button>

          {/* Expandable content */}
          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-2 space-y-2 bg-muted/20">
                  {categoryBreakdown.map((item) => (
                    <CategoryBarItem key={item.category} breakdown={item} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
