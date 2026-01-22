'use client';

import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInvestments } from '../hooks/use-investments';
import {
  InvestmentList,
  InvestmentSummary,
  CreateInvestmentModal,
  EditInvestmentModal,
  UpdateValueModal,
  DeleteInvestmentDialog,
} from '../components/investment';
import { calculateInvestmentTotals, type Investment } from '../types';

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
      data-testid="investments-empty-state"
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <PiggyBank className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhum investimento cadastrado</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Cadastre seus investimentos para acompanhar o progresso das suas metas financeiras.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Investimento
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
      data-testid="investments-error-state"
    >
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar investimentos</h3>
      <p className="text-muted-foreground mb-4">
        Não foi possível carregar a lista de investimentos.
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Investimentos</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie seus investimentos e acompanhe suas metas
        </p>
      </div>
      <Button onClick={onAddClick} data-testid="add-investment-button">
        <Plus className="h-4 w-4 mr-2" />
        Novo Investimento
      </Button>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Investments Page
 *
 * Lists all investments with CRUD operations and value update functionality.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function InvestmentsPage() {
  // Data fetching
  const { data, isLoading, isError, refetch } = useInvestments();
  const investments = data?.investments ?? [];

  // Calculate totals
  const totals = calculateInvestmentTotals(investments);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [updatingValueInvestment, setUpdatingValueInvestment] = useState<Investment | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);

  // Handlers
  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
  };

  const handleDelete = (investment: Investment) => {
    setDeletingInvestment(investment);
  };

  const handleUpdateValue = (investment: Investment) => {
    setUpdatingValueInvestment(investment);
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open);
  };

  const handleEditModalOpenChange = (open: boolean) => {
    if (!open) {
      setEditingInvestment(null);
    }
  };

  const handleUpdateValueModalOpenChange = (open: boolean) => {
    if (!open) {
      setUpdatingValueInvestment(null);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingInvestment(null);
    }
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Empty state
  const isEmpty = !isLoading && investments.length === 0;

  return (
    <div className="space-y-6" data-testid="investments-page">
      {/* Header */}
      <PageHeader onAddClick={() => setCreateModalOpen(true)} />

      {/* Summary */}
      <InvestmentSummary totals={totals} loading={isLoading} />

      {/* List or Empty State */}
      {isEmpty ? (
        <EmptyState onAddClick={() => setCreateModalOpen(true)} />
      ) : (
        <InvestmentList
          investments={investments}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateValue={handleUpdateValue}
        />
      )}

      {/* Modals and Dialogs */}
      <CreateInvestmentModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
      />

      <EditInvestmentModal
        investment={editingInvestment}
        open={!!editingInvestment}
        onOpenChange={handleEditModalOpenChange}
      />

      <UpdateValueModal
        investment={updatingValueInvestment}
        open={!!updatingValueInvestment}
        onOpenChange={handleUpdateValueModalOpenChange}
      />

      <DeleteInvestmentDialog
        investment={deletingInvestment}
        open={!!deletingInvestment}
        onOpenChange={handleDeleteDialogOpenChange}
      />
    </div>
  );
}
