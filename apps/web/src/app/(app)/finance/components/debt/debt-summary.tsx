'use client';

import { motion } from 'framer-motion';
import { Target, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, type DebtTotals, type UpcomingInstallmentItem } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface DebtSummaryProps {
  totals: DebtTotals;
  upcomingInstallments?: UpcomingInstallmentItem[];
  loading?: boolean;
  className?: string;
}

// =============================================================================
// Progress Bar Component
// =============================================================================

interface GlobalProgressBarProps {
  paid: number;
  remaining: number;
  className?: string;
}

function GlobalProgressBar({ paid, remaining, className }: GlobalProgressBarProps) {
  const total = paid + remaining;
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

  // Determine color based on progress
  const getProgressColor = () => {
    if (percent >= 75) return 'bg-emerald-500';
    if (percent >= 50) return 'bg-blue-500';
    if (percent >= 25) return 'bg-amber-500';
    return 'bg-foreground/30';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress Bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
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
          className="text-sm font-medium"
        >
          {percent}% quitado
        </motion.span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(paid)} de {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Monthly Breakdown Component
// =============================================================================

interface MonthlyBreakdownProps {
  installments?: UpcomingInstallmentItem[];
  monthlySum: number;
}

function MonthlyBreakdown({ installments, monthlySum }: MonthlyBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!installments || installments.length === 0) {
    return null;
  }

  const paidCount = installments.filter(
    (i) => i.status === 'paid' || i.status === 'paid_early'
  ).length;
  const pendingCount = installments.filter((i) => i.status === 'pending').length;
  const overdueCount = installments.filter((i) => i.status === 'overdue').length;

  const paidAmount = installments
    .filter((i) => i.status === 'paid' || i.status === 'paid_early')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      {/* Clickable toggle area with visual feedback */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-4 py-2.5',
          'flex items-center justify-between',
          'border-t border-border/50',
          'text-sm text-muted-foreground',
          'transition-all duration-200',
          'hover:bg-muted/50 hover:text-foreground',
          'group cursor-pointer',
          isExpanded && 'bg-muted/30'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Status dots preview */}
          <div className="flex -space-x-1">
            {paidCount > 0 && (
              <div className="w-2.5 h-2.5 rounded-full ring-2 ring-card bg-emerald-500" />
            )}
            {pendingCount > 0 && (
              <div className="w-2.5 h-2.5 rounded-full ring-2 ring-card bg-amber-500" />
            )}
            {overdueCount > 0 && (
              <div className="w-2.5 h-2.5 rounded-full ring-2 ring-card bg-destructive" />
            )}
          </div>
          <span className="group-hover:text-foreground transition-colors">
            {isExpanded ? 'Ocultar este mês' : 'Ver este mês'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            'group-hover:text-foreground',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expandable content */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 pt-2 space-y-1.5 text-sm bg-muted/20">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total do mês:</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(monthlySum)}
            </span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Pagas ({paidCount}):</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-500 tabular-nums">
              {formatCurrency(paidAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Pendentes ({pendingCount}):</span>
            </div>
            <span className="text-amber-600 dark:text-amber-500 tabular-nums">
              {formatCurrency(monthlySum - paidAmount)}
            </span>
          </div>
          {overdueCount > 0 && (
            <div className="flex justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-destructive">Em atraso ({overdueCount}):</span>
              </div>
              <span className="text-destructive font-medium">
                Atenção
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
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
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DebtSummary - Progress-focused summary with global progress bar
 *
 * Features:
 * - Large visual progress bar as primary element
 * - Estimated time to payoff
 * - Expandable monthly breakdown
 *
 * Note: Total/Mensal/Progress% are shown in DebtHeader to avoid redundancy
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtSummary({
  totals,
  upcomingInstallments,
  loading,
  className,
}: DebtSummaryProps) {
  if (loading) {
    return <SummarySkeleton />;
  }

  // Calculate estimated months remaining
  const estimatedMonths =
    totals.monthlyInstallmentSum > 0 && totals.totalRemaining > 0
      ? Math.ceil(totals.totalRemaining / totals.monthlyInstallmentSum)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        'rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden',
        className
      )}
      data-testid="debt-summary"
    >
      {/* Progress Bar Section */}
      <div className="p-4 pb-3 space-y-3">
        {/* Global Progress Bar */}
        <GlobalProgressBar
          paid={totals.totalPaid}
          remaining={totals.totalRemaining}
        />

        {/* Projection */}
        {estimatedMonths > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-500" />
            <span className="text-muted-foreground">
              Previsão de quitação em{' '}
              <span className="font-medium text-foreground">
                ~{estimatedMonths} {estimatedMonths === 1 ? 'mês' : 'meses'}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Monthly Breakdown Toggle - has its own padding/spacing */}
      <MonthlyBreakdown
        installments={upcomingInstallments}
        monthlySum={totals.monthlyInstallmentSum}
      />
    </motion.div>
  );
}
