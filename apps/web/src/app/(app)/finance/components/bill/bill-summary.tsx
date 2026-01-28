'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Home, Zap, Tv, Shield, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, type BillTotals, type Bill, type BillCategory, billCategoryLabels } from '../../types';
import { BillSummarySkeleton } from './bill-animations';

// =============================================================================
// Types
// =============================================================================

interface BillSummaryProps {
  totals: BillTotals;
  bills?: Bill[];
  loading?: boolean;
  className?: string;
}

// =============================================================================
// Category Icons
// =============================================================================

const categoryIcons: Record<BillCategory, typeof Home> = {
  housing: Home,
  utilities: Zap,
  subscription: Tv,
  insurance: Shield,
  other: MoreHorizontal,
};

const categoryColors: Record<BillCategory, string> = {
  housing: 'bg-blue-500',
  utilities: 'bg-yellow-500',
  subscription: 'bg-purple-500',
  insurance: 'bg-green-500',
  other: 'bg-gray-500',
};

// =============================================================================
// Progress Bar Component
// =============================================================================

interface GlobalProgressBarProps {
  paid: number;
  total: number;
  className?: string;
}

function GlobalProgressBar({ paid, total, className }: GlobalProgressBarProps) {
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;

  // Determine color based on progress
  const getProgressColor = () => {
    if (percent >= 100) return 'bg-emerald-500';
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
          {percent}% pago
        </motion.span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(paid)} de {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Category Breakdown Component
// =============================================================================

interface CategoryBreakdownProps {
  bills: Bill[];
  total: number;
}

function CategoryBreakdown({ bills, total }: CategoryBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate category totals
  const categoryTotals = bills.reduce((acc, bill) => {
    const amount = typeof bill.amount === 'string' ? parseFloat(bill.amount) : bill.amount;
    acc[bill.category] = (acc[bill.category] || 0) + amount;
    return acc;
  }, {} as Record<BillCategory, number>);

  // Sort categories by amount (descending)
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a) as [BillCategory, number][];

  if (sortedCategories.length === 0) {
    return null;
  }

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
          <div className="flex -space-x-1">
            {sortedCategories.slice(0, 3).map(([category]) => (
              <div
                key={category}
                className={cn(
                  'w-2.5 h-2.5 rounded-full ring-2 ring-card',
                  categoryColors[category]
                )}
              />
            ))}
          </div>
          <span className="group-hover:text-foreground transition-colors">
            {isExpanded ? 'Ocultar categorias' : 'Ver por categoria'}
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
        <div className="px-4 pb-4 pt-2 space-y-2 bg-muted/20">
          {sortedCategories.map(([category, amount]) => {
            const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
            const Icon = categoryIcons[category];
            const colorClass = categoryColors[category];

            return (
              <div key={category} className="flex items-center gap-2 text-sm">
                <div className={cn('w-2 h-2 rounded-full shrink-0', colorClass)} />
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground truncate min-w-0">
                  {billCategoryLabels[category]}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden mx-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className={cn('h-full rounded-full', colorClass)}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {percent}%
                </span>
                <span className="font-medium tabular-nums shrink-0">
                  {formatCurrency(amount)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * BillSummary - Progress-focused summary with global progress bar and category breakdown
 *
 * Features:
 * - Large visual progress bar as primary element
 * - Percentage of bills paid
 * - Expandable category breakdown
 *
 * Note: Total/Pagas/Pendentes are shown in BillHeader to avoid redundancy
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillSummary({
  totals,
  bills = [],
  loading,
  className,
}: BillSummaryProps) {
  if (loading) {
    return <BillSummarySkeleton />;
  }

  // Don't show summary if no bills
  if (totals.count === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        'rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden',
        className
      )}
      data-testid="bill-summary"
    >
      {/* Global Progress Bar */}
      <div className="p-4 pb-3">
        <GlobalProgressBar
          paid={totals.paid}
          total={totals.total}
        />
      </div>

      {/* Category Breakdown - has its own padding/spacing */}
      {bills.length > 0 && (
        <CategoryBreakdown
          bills={bills}
          total={totals.total}
        />
      )}
    </motion.div>
  );
}
