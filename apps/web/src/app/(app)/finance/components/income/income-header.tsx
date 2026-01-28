'use client';

import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';
import type { IncomeTotals } from '../../hooks/use-incomes';

// =============================================================================
// Types
// =============================================================================

export type IncomeStatusFilter = 'all' | 'received' | 'pending' | 'recurring';

interface FilterCounts {
  all: number;
  received: number;
  pending: number;
  recurring: number;
}

interface IncomeHeaderProps {
  totals: IncomeTotals;
  statusFilter: IncomeStatusFilter;
  onStatusFilterChange: (filter: IncomeStatusFilter) => void;
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
}

function FilterButton({ label, count, isActive, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
        'hover:bg-accent/80',
        isActive
          ? 'bg-foreground text-background shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span className="flex items-center gap-1.5">
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
  className?: string;
}

function MetricItem({ label, value, className }: MetricItemProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className="text-lg font-semibold tracking-tight">{value}</span>
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
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
      </div>
      {/* Metrics Row Skeleton */}
      <div className="flex gap-6">
        <div className="space-y-1">
          <div className="h-3 w-12 bg-muted animate-pulse rounded" />
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-12 bg-muted animate-pulse rounded" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        </div>
      </div>
      {/* Filters Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * IncomeHeader - Hero header with inline metrics, filters with counts, and month navigation
 *
 * Features:
 * - Compact metrics display (expected, actual, progress %)
 * - Filter tabs with real-time counts
 * - Month navigation integrated
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeHeader({
  totals,
  statusFilter,
  onStatusFilterChange,
  onAddClick,
  filterCounts,
  loading,
}: IncomeHeaderProps) {
  if (loading) {
    return <HeaderSkeleton />;
  }

  const progressPercent =
    totals.totalExpected > 0
      ? Math.round((totals.totalActual / totals.totalExpected) * 100)
      : 0;

  const filters: { key: IncomeStatusFilter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'received', label: 'Recebidas' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'recurring', label: 'Recorrentes' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
      data-testid="income-header"
    >
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Rendimentos</h1>
        <Button onClick={onAddClick} data-testid="add-income-button">
          <Plus className="h-4 w-4 mr-2" />
          Nova Renda
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pb-3 border-b border-border/50">
        <MetricItem
          label="Previsto"
          value={formatCurrency(totals.totalExpected)}
        />
        <MetricItem
          label="Recebido"
          value={formatCurrency(totals.totalActual)}
        />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Realizado
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-lg font-semibold tracking-tight',
                progressPercent >= 100 && 'text-emerald-600 dark:text-emerald-500',
                progressPercent >= 50 && progressPercent < 100 && 'text-amber-600 dark:text-amber-500',
                progressPercent < 50 && 'text-muted-foreground'
              )}
            >
              {progressPercent}%
            </span>
          </div>
        </div>
        {totals.count > 0 && (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Fontes
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {totals.count}
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit"
        role="tablist"
        aria-label="Filtrar rendimentos por status"
      >
        {filters.map((filter) => (
          <FilterButton
            key={filter.key}
            label={filter.label}
            count={filterCounts[filter.key]}
            isActive={statusFilter === filter.key}
            onClick={() => onStatusFilterChange(filter.key)}
          />
        ))}
      </div>
    </motion.div>
  );
}
