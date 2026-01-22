'use client';

import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinanceContext } from '../context/finance-context';
import { useIncomes, calculateIncomeTotals } from '../hooks/use-incomes';
import {
  IncomeList,
  IncomeSummary,
  CreateIncomeModal,
  EditIncomeModal,
  DeleteIncomeDialog,
} from '../components/income';
import type { Income } from '../types';

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  onAddClick: () => void;
}

function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="incomes-empty-state"
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Wallet className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhuma renda cadastrada</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Comece adicionando suas fontes de renda para controlar seu orçamento mensal.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Renda
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
// Page Header
// =============================================================================

interface PageHeaderProps {
  onAddClick: () => void;
}

function PageHeader({ onAddClick }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">Rendas</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie suas fontes de renda
        </p>
      </div>
      <Button onClick={onAddClick} data-testid="add-income-button">
        <Plus className="h-4 w-4 mr-2" />
        Nova Renda
      </Button>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Incomes Page
 *
 * Lists all incomes for the current month with CRUD operations.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function IncomesPage() {
  const { currentMonth } = useFinanceContext();

  // Data fetching
  const { data, isLoading, isError, refetch } = useIncomes({ monthYear: currentMonth });
  const incomes = data?.incomes ?? [];
  const totals = calculateIncomeTotals(incomes);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);

  // Handlers
  const handleEdit = (income: Income) => {
    setEditingIncome(income);
  };

  const handleDelete = (income: Income) => {
    setDeletingIncome(income);
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

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Empty state
  const isEmpty = !isLoading && incomes.length === 0;

  return (
    <div className="space-y-6" data-testid="incomes-page">
      {/* Header */}
      <PageHeader onAddClick={() => setCreateModalOpen(true)} />

      {/* Summary */}
      <IncomeSummary
        totalExpected={totals.totalExpected}
        totalActual={totals.totalActual}
        count={totals.count}
        loading={isLoading}
      />

      {/* List or Empty State */}
      {isEmpty ? (
        <EmptyState onAddClick={() => setCreateModalOpen(true)} />
      ) : (
        <IncomeList
          incomes={incomes}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
    </div>
  );
}
