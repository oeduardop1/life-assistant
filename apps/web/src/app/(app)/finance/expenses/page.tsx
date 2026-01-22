'use client';

import { useState, useMemo } from 'react';
import { Plus, AlertCircle, RefreshCw, Wallet, RefreshCcw, Zap } from 'lucide-react';
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
} from '../components/expense';
import type { Expense } from '../types';

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  onAddClick: () => void;
  section?: 'recurring' | 'oneTime' | 'all';
}

function EmptyState({ onAddClick, section = 'all' }: EmptyStateProps) {
  if (section === 'recurring') {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 text-center"
        data-testid="expenses-empty-recurring"
      >
        <div className="rounded-full bg-muted p-3 mb-3">
          <RefreshCcw className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="text-sm font-medium mb-1">Sem despesas recorrentes</h4>
        <p className="text-xs text-muted-foreground mb-3 max-w-xs">
          Despesas que se repetem todo mês, como mercado ou combustível.
        </p>
        <Button variant="outline" size="sm" onClick={onAddClick}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>
    );
  }

  if (section === 'oneTime') {
    return (
      <div
        className="flex flex-col items-center justify-center py-8 text-center"
        data-testid="expenses-empty-onetime"
      >
        <div className="rounded-full bg-muted p-3 mb-3">
          <Zap className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="text-sm font-medium mb-1">Sem despesas pontuais</h4>
        <p className="text-xs text-muted-foreground mb-3 max-w-xs">
          Gastos únicos deste mês, como presentes ou reparos.
        </p>
        <Button variant="outline" size="sm" onClick={onAddClick}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="expenses-empty-state"
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Wallet className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhuma despesa cadastrada</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Comece adicionando suas despesas variáveis para controlar seus gastos mensais.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Despesa
      </Button>
    </div>
  );
}

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
// Section Header
// =============================================================================

interface SectionHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
}

function SectionHeader({ title, description, icon, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="rounded-lg bg-muted p-2">
        {icon}
      </div>
      <div>
        <h3 className="font-medium flex items-center gap-2">
          {title}
          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {count}
          </span>
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Page Header
// =============================================================================

interface PageHeaderProps {
  onAddClick: () => void;
}

function PageHeader({ onAddClick }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Despesas Variáveis</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie suas despesas do mês
        </p>
      </div>
      <Button onClick={onAddClick} data-testid="add-expense-button">
        <Plus className="h-4 w-4 mr-2" />
        Nova Despesa
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
 * Separated into two sections: recurring and one-time expenses.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function ExpensesPage() {
  const { currentMonth } = useFinanceContext();

  // Data fetching
  const { data, isLoading, isError, refetch } = useExpenses({ monthYear: currentMonth });
  const expenses = data?.expenses;

  // Separate expenses by type
  const { allExpenses, recurringExpenses, oneTimeExpenses } = useMemo(() => {
    const all = expenses ?? [];
    const recurring: Expense[] = [];
    const oneTime: Expense[] = [];

    all.forEach((expense) => {
      if (expense.isRecurring) {
        recurring.push(expense);
      } else {
        oneTime.push(expense);
      }
    });

    return { allExpenses: all, recurringExpenses: recurring, oneTimeExpenses: oneTime };
  }, [expenses]);

  // Calculate totals
  const totals = calculateExpenseTotals(allExpenses);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  // Handlers
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleDelete = (expense: Expense) => {
    setDeletingExpense(expense);
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

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Check if empty
  const isEmpty = !isLoading && allExpenses.length === 0;

  return (
    <div className="space-y-6" data-testid="expenses-page">
      {/* Header */}
      <PageHeader onAddClick={() => setCreateModalOpen(true)} />

      {/* Summary */}
      <ExpenseSummary totals={totals} loading={isLoading} />

      {/* Empty State (when no expenses at all) */}
      {isEmpty && (
        <EmptyState
          onAddClick={() => setCreateModalOpen(true)}
          section="all"
        />
      )}

      {/* Recurring Expenses Section */}
      {!isEmpty && (
        <section data-testid="recurring-expenses-section">
          <SectionHeader
            title="Despesas Recorrentes"
            description="Gastos que se repetem todo mês"
            icon={<RefreshCcw className="h-4 w-4 text-muted-foreground" />}
            count={recurringExpenses.length}
          />

          {isLoading ? (
            <ExpenseList
              expenses={[]}
              loading={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : recurringExpenses.length === 0 ? (
            <EmptyState
              onAddClick={() => setCreateModalOpen(true)}
              section="recurring"
            />
          ) : (
            <ExpenseList
              expenses={recurringExpenses}
              loading={false}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </section>
      )}

      {/* One-time Expenses Section */}
      {!isEmpty && (
        <section data-testid="onetime-expenses-section">
          <SectionHeader
            title="Despesas Pontuais"
            description="Gastos únicos deste mês"
            icon={<Zap className="h-4 w-4 text-muted-foreground" />}
            count={oneTimeExpenses.length}
          />

          {isLoading ? (
            <ExpenseList
              expenses={[]}
              loading={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : oneTimeExpenses.length === 0 ? (
            <EmptyState
              onAddClick={() => setCreateModalOpen(true)}
              section="oneTime"
            />
          ) : (
            <ExpenseList
              expenses={oneTimeExpenses}
              loading={false}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </section>
      )}

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
    </div>
  );
}
