'use client';

import type { ReactNode } from 'react';
import { Plus, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  type DebtTotals,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

type DebtStatusFilter = 'all' | 'active' | 'overdue' | 'paid_off';

interface FilterCounts {
  all: number;
  active: number;
  overdue: number;
  paid_off: number;
}

interface DebtHeaderProps {
  totals: DebtTotals;
  statusFilter: DebtStatusFilter;
  onStatusFilterChange: (filter: DebtStatusFilter) => void;
  onAddClick: () => void;
  filterCounts: FilterCounts;
  loading?: boolean;
  /** Optional simulator trigger element (e.g., DebtSimulator wrapping a button) */
  simulatorTrigger?: ReactNode;
  /** Callback to open the debt ledger drawer */
  onOpenLedger?: () => void;
}

// =============================================================================
// Filter Button Component
// =============================================================================

interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  hasAlert?: boolean;
  onClick: () => void;
}

function FilterButton({ label, count, isActive, hasAlert, onClick }: FilterButtonProps) {
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
        {hasAlert && !isActive && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
        )}
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
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
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
 * DebtHeader - Hero header with inline metrics, filters with counts, and month navigation
 *
 * Features:
 * - Compact metrics display (total, monthly, progress %)
 * - Filter tabs with real-time counts
 * - Visual alert for overdue debts
 * - Month navigation integrated
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtHeader({
  totals,
  statusFilter,
  onStatusFilterChange,
  onAddClick,
  filterCounts,
  loading,
  simulatorTrigger,
  onOpenLedger,
}: DebtHeaderProps) {
  if (loading) {
    return <HeaderSkeleton />;
  }

  const progressPercent =
    totals.totalAmount > 0
      ? Math.round((totals.totalPaid / (totals.totalPaid + totals.totalRemaining)) * 100)
      : 0;

  const filters: { key: DebtStatusFilter; label: string; hasAlert?: boolean }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'active', label: 'Ativas' },
    { key: 'overdue', label: 'Atraso', hasAlert: filterCounts.overdue > 0 },
    { key: 'paid_off', label: 'Quitadas' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
      data-testid="debt-header"
    >
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dívidas</h1>
        <div className="flex items-center gap-2">
          {simulatorTrigger}
          {onOpenLedger && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenLedger}
              data-testid="open-ledger-button"
            >
              <List className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Ver Todas</span>
            </Button>
          )}
          <Button onClick={onAddClick} data-testid="add-debt-button">
            <Plus className="h-4 w-4 mr-2" />
            Nova Dívida
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 pb-3 border-b border-border/50">
        <MetricItem
          label="Total"
          value={formatCurrency(totals.totalAmount)}
        />
        <MetricItem
          label="Mensal"
          value={formatCurrency(totals.monthlyInstallmentSum)}
        />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Progresso
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">
              {progressPercent}%
            </span>
            <span className="text-xs text-muted-foreground">
              quitado
            </span>
          </div>
        </div>
        {totals.pendingNegotiationCount > 0 && (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Pendentes
            </span>
            <span className="text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-500">
              {totals.pendingNegotiationCount}
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit"
        role="tablist"
        aria-label="Filtrar dívidas por status"
      >
        {filters.map((filter) => (
          <FilterButton
            key={filter.key}
            label={filter.label}
            count={filterCounts[filter.key]}
            isActive={statusFilter === filter.key}
            hasAlert={filter.hasAlert}
            onClick={() => onStatusFilterChange(filter.key)}
          />
        ))}
      </div>
    </motion.div>
  );
}
