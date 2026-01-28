'use client';

import { Plus, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, type ExpenseTotals } from '../../types';

// =============================================================================
// Types
// =============================================================================

export type ExpenseStatusFilter = 'all' | 'recurring' | 'oneTime' | 'overBudget';

interface FilterCounts {
  all: number;
  recurring: number;
  oneTime: number;
  overBudget: number;
}

interface ExpenseHeaderProps {
  totals: ExpenseTotals;
  statusFilter: ExpenseStatusFilter;
  onStatusFilterChange: (filter: ExpenseStatusFilter) => void;
  onAddClick: () => void;
  filterCounts: FilterCounts;
  loading?: boolean;
}

// =============================================================================
// Filter Button Component
// =============================================================================

interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  isWarning?: boolean;
}

function FilterButton({ label, count, isActive, onClick, isWarning }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
        'hover:bg-accent/80',
        isActive
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        isWarning && !isActive && count > 0 && 'text-destructive'
      )}
    >
      <span className="flex items-center gap-1.5">
        {isWarning && count > 0 && !isActive && (
          <AlertTriangle className="h-3 w-3" />
        )}
        {label}
        <span
          className={cn(
            'text-xs tabular-nums',
            isActive ? 'opacity-70' : 'opacity-50'
          )}
        >
          ({count})
        </span>
      </span>
    </button>
  );
}

// =============================================================================
// Metric Item Component
// =============================================================================

interface MetricItemProps {
  label: string;
  value: string;
  subValue?: string;
  className?: string;
  valueClassName?: string;
}

function MetricItem({ label, value, subValue, className, valueClassName }: MetricItemProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className={cn('text-lg font-semibold tracking-tight', valueClassName)}>
        {value}
      </span>
      {subValue && (
        <span className="text-xs text-muted-foreground">{subValue}</span>
      )}
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function HeaderSkeleton() {
  return (
    <div className="space-y-4">
      {/* Title Row Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-muted animate-pulse rounded" />
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
      </div>
      {/* Metrics Row Skeleton */}
      <div className="flex gap-6">
        <div className="space-y-1">
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
      {/* Filters Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ExpenseHeader - Hero header with inline metrics, filters with counts, and month navigation
 *
 * Features:
 * - Compact metrics display (budget, actual, variance)
 * - Filter tabs with real-time counts
 * - Month navigation integrated
 * - Over-budget warning indicator
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseHeader({
  totals,
  statusFilter,
  onStatusFilterChange,
  onAddClick,
  filterCounts,
  loading,
}: ExpenseHeaderProps) {
  if (loading) {
    return <HeaderSkeleton />;
  }

  // Determine variance display
  const isOverBudget = totals.variance > 0;
  const isUnderBudget = totals.variance < 0;
  const varianceDisplay = isOverBudget
    ? `+${formatCurrency(totals.variance)}`
    : isUnderBudget
    ? `-${formatCurrency(Math.abs(totals.variance))}`
    : formatCurrency(0);

  const filters: { key: ExpenseStatusFilter; label: string; isWarning?: boolean }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'recurring', label: 'Recorrentes' },
    { key: 'oneTime', label: 'Pontuais' },
    { key: 'overBudget', label: 'Acima', isWarning: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
      data-testid="expense-header"
    >
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Despesas Variáveis</h1>
        <Button onClick={onAddClick} className="hidden sm:flex" data-testid="add-expense-button">
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pb-3 border-b border-border/50">
        <MetricItem
          label="Orçamento"
          value={formatCurrency(totals.totalExpected)}
          subValue={`${totals.count} ${totals.count === 1 ? 'despesa' : 'despesas'}`}
          valueClassName="text-blue-600 dark:text-blue-500"
        />
        <MetricItem
          label="Gasto Real"
          value={formatCurrency(totals.totalActual)}
          subValue={`${totals.recurringCount} recorr., ${totals.oneTimeCount} pont.`}
          valueClassName="text-orange-600 dark:text-orange-500"
        />
        <MetricItem
          label="Variação"
          value={varianceDisplay}
          subValue={
            isOverBudget
              ? `${Math.abs(totals.variancePercent).toFixed(1)}% acima`
              : isUnderBudget
              ? `${Math.abs(totals.variancePercent).toFixed(1)}% economia`
              : 'No orçamento'
          }
          valueClassName={cn(
            isOverBudget && 'text-destructive',
            isUnderBudget && 'text-emerald-600 dark:text-emerald-500',
            !isOverBudget && !isUnderBudget && 'text-muted-foreground'
          )}
        />
      </div>

      {/* Filter Tabs */}
      <div
        className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit overflow-x-auto"
        role="tablist"
        aria-label="Filtrar despesas por tipo"
      >
        {filters.map((filter) => (
          <FilterButton
            key={filter.key}
            label={filter.label}
            count={filterCounts[filter.key]}
            isActive={statusFilter === filter.key}
            onClick={() => onStatusFilterChange(filter.key)}
            isWarning={filter.isWarning}
          />
        ))}
      </div>
    </motion.div>
  );
}
