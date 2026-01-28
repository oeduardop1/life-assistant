'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCurrency,
  incomeTypeLabels,
  incomeTypeColors,
  type Income,
  type IncomeType,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

interface IncomeSummaryProps {
  incomes: Income[];
  totalExpected: number;
  totalActual: number;
  previousMonthActual?: number;
  loading?: boolean;
  className?: string;
}

interface TypeBreakdown {
  type: IncomeType;
  label: string;
  color: string;
  amount: number;
  isReceived: boolean;
  count: number;
}

// =============================================================================
// Progress Bar Component
// =============================================================================

interface GlobalProgressBarProps {
  actual: number;
  expected: number;
  className?: string;
}

function GlobalProgressBar({ actual, expected, className }: GlobalProgressBarProps) {
  const percent = expected > 0 ? Math.round((actual / expected) * 100) : 0;
  const cappedPercent = Math.min(percent, 100);

  // Determine color based on progress
  const getProgressColor = () => {
    if (percent >= 100) return 'bg-emerald-500';
    if (percent >= 75) return 'bg-blue-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-foreground/30';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress Bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${cappedPercent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={cn('absolute inset-y-0 left-0 rounded-full', getProgressColor())}
        />
        {/* Subtle grid overlay for visual interest */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)',
          }}
        />
      </div>

      {/* Progress Label */}
      <div className="flex items-center justify-between">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            'text-sm font-medium',
            percent >= 100 && 'text-emerald-600 dark:text-emerald-500'
          )}
        >
          {percent}% recebido
        </motion.span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(actual)} de {formatCurrency(expected)}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Type Card Component
// =============================================================================

interface TypeCardProps {
  breakdown: TypeBreakdown;
}

function TypeCard({ breakdown }: TypeCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: 'bg-green-500/10', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
    gray: { bg: 'bg-gray-500/10', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-800' },
  };

  const colors = colorClasses[breakdown.color] || colorClasses.gray;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col items-center p-3 rounded-lg border transition-colors',
        colors.bg,
        colors.border,
        breakdown.isReceived && 'ring-1 ring-emerald-500/30'
      )}
    >
      <span className={cn('text-xs font-medium', colors.text)}>
        {breakdown.label}
      </span>
      <span className="text-sm font-semibold tabular-nums mt-1">
        {formatCurrency(breakdown.amount)}
      </span>
      <div className="flex items-center gap-1 mt-1.5">
        {breakdown.isReceived ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Month Comparison Component
// =============================================================================

interface MonthComparisonProps {
  currentActual: number;
  previousActual: number;
}

function MonthComparison({ currentActual, previousActual }: MonthComparisonProps) {
  if (previousActual === 0) return null;

  const difference = currentActual - previousActual;
  const percentChange = (difference / previousActual) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex items-center gap-2 text-sm"
    >
      <span className="text-muted-foreground">vs. mês anterior:</span>
      <div className="flex items-center gap-1">
        {difference > 0 && <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />}
        {difference < 0 && <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-500" />}
        {difference === 0 && <Minus className="h-4 w-4 text-muted-foreground" />}
        <span
          className={cn(
            'font-medium tabular-nums',
            difference > 0 && 'text-emerald-600 dark:text-emerald-500',
            difference < 0 && 'text-red-600 dark:text-red-500',
            difference === 0 && 'text-muted-foreground'
          )}
        >
          {difference >= 0 ? '+' : ''}
          {formatCurrency(difference)}
          <span className="text-xs ml-1">
            ({percentChange >= 0 ? '+' : ''}
            {percentChange.toFixed(1)}%)
          </span>
        </span>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function SummarySkeleton() {
  return (
    <div className="p-4 rounded-xl border bg-card space-y-4">
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-24 rounded-lg shrink-0" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateTypeBreakdowns(incomes: Income[]): TypeBreakdown[] {
  const byType = new Map<IncomeType, { amount: number; allReceived: boolean; count: number }>();

  for (const income of incomes) {
    const existing = byType.get(income.type) || { amount: 0, allReceived: true, count: 0 };
    const incomeAmount = typeof income.expectedAmount === 'string'
      ? parseFloat(income.expectedAmount)
      : income.expectedAmount;
    const hasActual = income.actualAmount !== null && income.actualAmount > 0;

    byType.set(income.type, {
      amount: existing.amount + incomeAmount,
      allReceived: existing.allReceived && hasActual,
      count: existing.count + 1,
    });
  }

  return Array.from(byType.entries())
    .map(([type, data]) => ({
      type,
      label: incomeTypeLabels[type],
      color: incomeTypeColors[type],
      amount: data.amount,
      isReceived: data.allReceived,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * IncomeSummary - Progress-focused summary with global progress bar
 *
 * Features:
 * - Large visual progress bar as primary element
 * - Mini-cards showing breakdown by income type
 * - Comparison with previous month
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeSummary({
  incomes,
  totalExpected,
  totalActual,
  previousMonthActual,
  loading,
  className,
}: IncomeSummaryProps) {
  if (loading) {
    return <SummarySkeleton />;
  }

  const typeBreakdowns = calculateTypeBreakdowns(incomes);
  const hasIncomes = incomes.length > 0;

  if (!hasIncomes) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        'p-4 rounded-xl border bg-card/50 backdrop-blur-sm space-y-4',
        className
      )}
      data-testid="income-summary"
    >
      {/* Global Progress Bar */}
      <GlobalProgressBar
        actual={totalActual}
        expected={totalExpected}
      />

      {/* Type Breakdown Cards */}
      {typeBreakdowns.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {typeBreakdowns.map((breakdown) => (
            <TypeCard key={breakdown.type} breakdown={breakdown} />
          ))}
        </div>
      )}

      {/* Month Comparison */}
      {previousMonthActual !== undefined && (
        <div className="pt-2 border-t border-border/50">
          <MonthComparison
            currentActual={totalActual}
            previousActual={previousMonthActual}
          />
        </div>
      )}
    </motion.div>
  );
}
