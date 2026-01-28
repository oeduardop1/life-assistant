'use client';

import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinanceContext } from '../context/finance-context';
import { useIncomes, calculateIncomeTotals } from '../hooks/use-incomes';
import {
  IncomeHeader,
  IncomeSummary,
  IncomeList,
  CreateIncomeModal,
  EditIncomeModal,
  DeleteIncomeDialog,
  IncomeQuickRegister,
  IncomeEmptyState,
} from '../components/income';
import type { IncomeStatusFilter } from '../components/income/income-header';
import type { Income } from '../types';

// =============================================================================
// Error State
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="incomes-error-state"
    >
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar rendas</h3>
      <p className="text-muted-foreground mb-4">
        Não foi possível carregar a lista de rendas.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  );
}

// =============================================================================
// Filter Helpers
// =============================================================================

function filterIncomes(incomes: Income[], filter: IncomeStatusFilter): Income[] {
  switch (filter) {
    case 'received':
      return incomes.filter((i) => i.actualAmount !== null && i.actualAmount > 0);
    case 'pending':
      return incomes.filter((i) => i.actualAmount === null || i.actualAmount === 0);
    case 'recurring':
      return incomes.filter((i) => i.isRecurring);
    case 'all':
    default:
      return incomes;
  }
}

function calculateFilterCounts(incomes: Income[]) {
  const received = incomes.filter((i) => i.actualAmount !== null && i.actualAmount > 0);
  const pending = incomes.filter((i) => i.actualAmount === null || i.actualAmount === 0);
  const recurring = incomes.filter((i) => i.isRecurring);

  return {
    all: incomes.length,
    received: received.length,
    pending: pending.length,
    recurring: recurring.length,
  };
}

const filterLabels: Record<IncomeStatusFilter, string> = {
  all: 'Todas',
  received: 'Recebidas',
  pending: 'Pendentes',
  recurring: 'Recorrentes',
};

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Incomes Page
 *
 * Redesigned page with:
 * - Hero header with inline metrics and filters
 * - Progress-focused summary with type breakdown
 * - Visual cards with status indicators and quick actions
 * - Contextual empty states
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function IncomesPage() {
  const {
    currentMonth,
    goToPrevMonth,
    goToNextMonth,
  } = useFinanceContext();

  // Data fetching
  const { data, isLoading, isError, refetch } = useIncomes({ monthYear: currentMonth });

  // Memoize incomes array to prevent reference changes
  const incomes = useMemo(() => data?.incomes ?? [], [data?.incomes]);
  const totals = useMemo(() => calculateIncomeTotals(incomes), [incomes]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<IncomeStatusFilter>('all');

  // Celebration dismissal state (reset when month changes)
  const [dismissCelebration, setDismissCelebration] = useState(false);

  // Reset celebration dismissal when month changes
  useEffect(() => {
    setDismissCelebration(false);
  }, [currentMonth]);

  // Filtered incomes
  const filteredIncomes = useMemo(
    () => filterIncomes(incomes, statusFilter),
    [incomes, statusFilter]
  );

  const filterCounts = useMemo(
    () => calculateFilterCounts(incomes),
    [incomes]
  );

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);
  const [registeringIncome, setRegisteringIncome] = useState<Income | null>(null);

  // Handlers
  const handleEdit = (income: Income) => {
    setEditingIncome(income);
  };

  const handleDelete = (income: Income) => {
    setDeletingIncome(income);
  };

  const handleRegisterValue = (income: Income) => {
    setRegisteringIncome(income);
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open);
  };

  const handleEditModalOpenChange = (open: boolean) => {
    if (!open) {
      setEditingIncome(null);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingIncome(null);
    }
  };

  const handleQuickRegisterOpenChange = (open: boolean) => {
    if (!open) {
      setRegisteringIncome(null);
    }
  };

  const handleFilterChange = (filter: IncomeStatusFilter) => {
    setStatusFilter(filter);
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Determine empty state type
  const getEmptyStateType = () => {
    if (incomes.length === 0) return 'no-incomes';
    if (filteredIncomes.length === 0 && statusFilter !== 'all') return 'filter-empty';
    if (
      statusFilter === 'all' &&
      filterCounts.pending === 0 &&
      filterCounts.received > 0 &&
      !dismissCelebration
    ) {
      return 'all-received';
    }
    return null;
  };

  const emptyStateType = getEmptyStateType();
  const showEmptyState = emptyStateType !== null && !isLoading;
  const showList = filteredIncomes.length > 0 && !isLoading;
  const showSummary = incomes.length > 0;

  // Handle empty state actions
  const handleEmptyStateAction = () => {
    if (emptyStateType === 'no-incomes') {
      setCreateModalOpen(true);
    } else if (emptyStateType === 'filter-empty') {
      setStatusFilter('all');
    } else if (emptyStateType === 'all-received') {
      // Dismiss celebration and show the income list
      setDismissCelebration(true);
    }
  };

  const handleEmptyStateSecondaryAction = () => {
    setCreateModalOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="incomes-page">
      {/* Header with Metrics and Filters */}
      <IncomeHeader
        totals={totals}
        currentMonth={currentMonth}
        onPreviousMonth={goToPrevMonth}
        onNextMonth={goToNextMonth}
        statusFilter={statusFilter}
        onStatusFilterChange={handleFilterChange}
        onAddClick={() => setCreateModalOpen(true)}
        filterCounts={filterCounts}
        loading={isLoading}
      />

      {/* Summary with Progress Bar and Type Breakdown */}
      {showSummary && (
        <IncomeSummary
          incomes={incomes}
          totalExpected={totals.totalExpected}
          totalActual={totals.totalActual}
          loading={isLoading}
        />
      )}

      {/* Empty States */}
      {showEmptyState && emptyStateType && (
        <IncomeEmptyState
          type={emptyStateType}
          filterName={filterLabels[statusFilter]}
          totalReceived={totals.totalActual}
          onAction={handleEmptyStateAction}
          onSecondaryAction={
            emptyStateType === 'all-received' ? handleEmptyStateSecondaryAction : undefined
          }
        />
      )}

      {/* Income List */}
      {showList && (
        <IncomeList
          incomes={filteredIncomes}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRegisterValue={handleRegisterValue}
        />
      )}

      {/* Modals */}
      <CreateIncomeModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
        monthYear={currentMonth}
      />

      <EditIncomeModal
        income={editingIncome}
        open={!!editingIncome}
        onOpenChange={handleEditModalOpenChange}
      />

      <DeleteIncomeDialog
        income={deletingIncome}
        open={!!deletingIncome}
        onOpenChange={handleDeleteDialogOpenChange}
      />

      <IncomeQuickRegister
        income={registeringIncome}
        open={!!registeringIncome}
        onOpenChange={handleQuickRegisterOpenChange}
      />
    </div>
  );
}
