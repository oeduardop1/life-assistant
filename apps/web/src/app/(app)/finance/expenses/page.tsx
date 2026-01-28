'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, RefreshCw, RefreshCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinanceContext } from '../context/finance-context';
import {
  useExpenses,
  calculateExpenseTotals,
} from '../hooks/use-expenses';
import {
  ExpenseList,
  ExpenseSummary,
  CreateExpenseModal,
  EditExpenseModal,
  DeleteExpenseDialog,
  ExpenseHeader,
  ExpenseEmptyState,
  ExpenseSectionEmptyState,
  ExpenseAlertBanner,
  ExpenseQuickUpdate,
  FAB,
  ScrollToTop,
  type ExpenseStatusFilter,
} from '../components/expense';
import type { Expense } from '../types';

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
      data-testid="expenses-error-state"
    >
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar despesas</h3>
      <p className="text-muted-foreground mb-4">
        Não foi possível carregar a lista de despesas.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Expenses Page
 *
 * Lists all variable expenses for the current month with CRUD operations.
 * Features improved UI/UX with header metrics, filters, alerts, and quick actions.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function ExpensesPage() {
  const { currentMonth } = useFinanceContext();

  // Data fetching
  const { data, isLoading, isError, refetch } = useExpenses({ monthYear: currentMonth });
  const expenses = useMemo(() => data?.expenses ?? [], [data?.expenses]);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>('all');

  // Separate expenses by type and filter
  const {
    allExpenses,
    recurringExpenses,
    oneTimeExpenses,
    overBudgetExpenses,
    filteredExpenses,
    filterCounts,
  } = useMemo(() => {
    const all = expenses;
    const recurring: Expense[] = [];
    const oneTime: Expense[] = [];
    const overBudget: Expense[] = [];

    all.forEach((expense) => {
      if (expense.isRecurring) {
        recurring.push(expense);
      } else {
        oneTime.push(expense);
      }

      // Check if over budget
      const expected = typeof expense.expectedAmount === 'string'
        ? parseFloat(expense.expectedAmount)
        : expense.expectedAmount;
      const actual = typeof expense.actualAmount === 'string'
        ? parseFloat(expense.actualAmount)
        : expense.actualAmount;
      if (actual > expected && expected > 0) {
        overBudget.push(expense);
      }
    });

    // Calculate filter counts
    const counts = {
      all: all.length,
      recurring: recurring.length,
      oneTime: oneTime.length,
      overBudget: overBudget.length,
    };

    // Apply filter
    let filtered = all;
    switch (statusFilter) {
      case 'recurring':
        filtered = recurring;
        break;
      case 'oneTime':
        filtered = oneTime;
        break;
      case 'overBudget':
        filtered = overBudget;
        break;
    }

    return {
      allExpenses: all,
      recurringExpenses: recurring,
      oneTimeExpenses: oneTime,
      overBudgetExpenses: overBudget,
      filteredExpenses: filtered,
      filterCounts: counts,
    };
  }, [expenses, statusFilter]);

  // Calculate totals
  const totals = calculateExpenseTotals(allExpenses);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [quickUpdateExpense, setQuickUpdateExpense] = useState<Expense | null>(null);

  // Handlers
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleDelete = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  const handleQuickUpdate = (expense: Expense) => {
    setQuickUpdateExpense(expense);
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open);
  };

  const handleEditModalOpenChange = (open: boolean) => {
    if (!open) {
      setEditingExpense(null);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingExpense(null);
    }
  };

  const handleQuickUpdateOpenChange = (open: boolean) => {
    if (!open) {
      setQuickUpdateExpense(null);
    }
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Check if empty
  const isEmpty = !isLoading && allExpenses.length === 0;

  // Check for celebration state (all on budget and has expenses)
  const allOnBudget = !isEmpty && overBudgetExpenses.length === 0 && totals.variance <= 0;

  // Determine what to show based on filter
  const showSplitView = statusFilter === 'all';
  const showEmptyFilterState = filteredExpenses.length === 0 && !isLoading && !isEmpty;

  return (
    <div className="space-y-6" data-testid="expenses-page">
      {/* Header with metrics and filters */}
      <ExpenseHeader
        totals={totals}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddClick={() => setCreateModalOpen(true)}
        filterCounts={filterCounts}
        loading={isLoading}
      />

      {/* Alert Banner (over budget or savings) */}
      {!isLoading && !isEmpty && (
        <ExpenseAlertBanner expenses={allExpenses} />
      )}

      {/* Summary with category breakdown */}
      <ExpenseSummary
        totals={totals}
        expenses={allExpenses}
        loading={isLoading}
      />

      {/* Empty State (when no expenses at all) */}
      {isEmpty && (
        <ExpenseEmptyState
          type="no-expenses"
          onAction={() => setCreateModalOpen(true)}
        />
      )}

      {/* Filter-specific empty states */}
      {showEmptyFilterState && (
        <>
          {statusFilter === 'recurring' && (
            <ExpenseEmptyState
              type="filter-empty-recurring"
              onAction={() => setCreateModalOpen(true)}
              onSecondaryAction={() => setStatusFilter('all')}
            />
          )}
          {statusFilter === 'oneTime' && (
            <ExpenseEmptyState
              type="filter-empty-onetime"
              onAction={() => setCreateModalOpen(true)}
              onSecondaryAction={() => setStatusFilter('all')}
            />
          )}
          {statusFilter === 'overBudget' && (
            <ExpenseEmptyState
              type="filter-empty-overbudget"
              onAction={() => setStatusFilter('all')}
            />
          )}
        </>
      )}

      {/* Celebration state (all on budget) */}
      {allOnBudget && statusFilter === 'all' && !isLoading && (
        <ExpenseEmptyState
          type="all-on-budget"
          savings={Math.abs(totals.variance)}
        />
      )}

      {/* Split view (All filter): Recurring and One-time sections */}
      {showSplitView && !isEmpty && (
        <>
          {/* Recurring Expenses Section */}
          <section data-testid="recurring-expenses-section">
            <ExpenseList
              expenses={recurringExpenses}
              loading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuickUpdate={handleQuickUpdate}
              showSectionHeader={true}
              sectionTitle="Despesas Recorrentes"
              sectionIcon={<RefreshCcw className="h-4 w-4 text-muted-foreground" />}
            />
            {!isLoading && recurringExpenses.length === 0 && (
              <ExpenseSectionEmptyState message="Nenhuma despesa recorrente este mês" />
            )}
          </section>

          {/* One-time Expenses Section */}
          <section data-testid="onetime-expenses-section">
            <ExpenseList
              expenses={oneTimeExpenses}
              loading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQuickUpdate={handleQuickUpdate}
              showSectionHeader={true}
              sectionTitle="Despesas Pontuais"
              sectionIcon={<Zap className="h-4 w-4 text-muted-foreground" />}
            />
            {!isLoading && oneTimeExpenses.length === 0 && (
              <ExpenseSectionEmptyState message="Nenhuma despesa pontual este mês" />
            )}
          </section>
        </>
      )}

      {/* Filtered view (non-All filters) */}
      {!showSplitView && !showEmptyFilterState && (
        <section data-testid="filtered-expenses-section">
          <ExpenseList
            expenses={filteredExpenses}
            loading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onQuickUpdate={handleQuickUpdate}
          />
        </section>
      )}

      {/* Mobile FAB */}
      <FAB onClick={() => setCreateModalOpen(true)} label="Nova" />

      {/* Scroll to Top */}
      <ScrollToTop />

      {/* Modals */}
      <CreateExpenseModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
        monthYear={currentMonth}
      />

      <EditExpenseModal
        expense={editingExpense}
        open={!!editingExpense}
        onOpenChange={handleEditModalOpenChange}
      />

      <DeleteExpenseDialog
        expense={deletingExpense}
        open={!!deletingExpense}
        onOpenChange={handleDeleteDialogOpenChange}
      />

      <ExpenseQuickUpdate
        expense={quickUpdateExpense}
        open={!!quickUpdateExpense}
        onOpenChange={handleQuickUpdateOpenChange}
      />
    </div>
  );
}
