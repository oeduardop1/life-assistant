'use client';

import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinanceContext } from '../context/finance-context';
import {
  useBills,
  useMarkBillPaid,
  useMarkBillUnpaid,
  calculateBillTotals,
} from '../hooks/use-bills';
import {
  BillList,
  BillSummary,
  CreateBillModal,
  EditBillModal,
  DeleteBillDialog,
} from '../components/bill';
import type { Bill, BillStatusFilter } from '../types';

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  onAddClick: () => void;
  hasFilter: boolean;
}

function EmptyState({ onAddClick, hasFilter }: EmptyStateProps) {
  if (hasFilter) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        data-testid="bills-empty-filtered"
      >
        <div className="rounded-full bg-muted p-4 mb-4">
          <Receipt className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma conta encontrada</h3>
        <p className="text-muted-foreground mb-4">
          Não há contas com o filtro selecionado.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="bills-empty-state"
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Receipt className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhuma conta cadastrada</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Comece adicionando suas contas fixas para controlar seus gastos mensais.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Conta
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
      data-testid="bills-error-state"
    >
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar contas</h3>
      <p className="text-muted-foreground mb-4">
        Não foi possível carregar a lista de contas.
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
  statusFilter: BillStatusFilter;
  onStatusFilterChange: (filter: BillStatusFilter) => void;
  onAddClick: () => void;
}

function PageHeader({ statusFilter, onStatusFilterChange, onAddClick }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold">Contas Fixas</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie suas contas mensais
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Tabs
          value={statusFilter}
          onValueChange={(value: string) => onStatusFilterChange(value as BillStatusFilter)}
        >
          <TabsList data-testid="bill-status-filter">
            <TabsTrigger value="all" data-testid="bill-filter-all">
              Todas
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="bill-filter-pending">
              Pendentes
            </TabsTrigger>
            <TabsTrigger value="paid" data-testid="bill-filter-paid">
              Pagas
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={onAddClick} data-testid="add-bill-button">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Bills Page
 *
 * Lists all bills for the current month with CRUD operations and status toggle.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function BillsPage() {
  const { currentMonth } = useFinanceContext();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<BillStatusFilter>('all');

  // Data fetching
  const { data, isLoading, isError, refetch } = useBills({ monthYear: currentMonth });
  const allBills = data?.bills ?? [];

  // Filter bills based on status
  const filteredBills = allBills.filter((bill) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return bill.status === 'pending' || bill.status === 'overdue';
    if (statusFilter === 'paid') return bill.status === 'paid';
    return true;
  });

  const totals = calculateBillTotals(allBills);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);

  // Toggle paid mutations
  const markPaid = useMarkBillPaid();
  const markUnpaid = useMarkBillUnpaid();
  const [togglingBillId, setTogglingBillId] = useState<string | undefined>(undefined);

  // Handlers
  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
  };

  const handleDelete = (bill: Bill) => {
    setDeletingBill(bill);
  };

  const handleTogglePaid = async (bill: Bill) => {
    const isPaid = bill.status === 'paid';
    setTogglingBillId(bill.id);

    try {
      if (isPaid) {
        await markUnpaid.mutateAsync({ id: bill.id, monthYear: bill.monthYear });
        toast.success('Conta marcada como pendente');
      } else {
        await markPaid.mutateAsync({ id: bill.id, monthYear: bill.monthYear });
        toast.success('Conta marcada como paga');
      }
    } catch {
      toast.error('Erro ao atualizar status da conta');
    } finally {
      setTogglingBillId(undefined);
    }
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open);
  };

  const handleEditModalOpenChange = (open: boolean) => {
    if (!open) {
      setEditingBill(null);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingBill(null);
    }
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Empty state
  const isEmpty = !isLoading && filteredBills.length === 0;
  const hasFilter = statusFilter !== 'all';

  return (
    <div className="space-y-6" data-testid="bills-page">
      {/* Header */}
      <PageHeader
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddClick={() => setCreateModalOpen(true)}
      />

      {/* Summary */}
      <BillSummary totals={totals} loading={isLoading} />

      {/* List or Empty State */}
      {isEmpty ? (
        <EmptyState
          onAddClick={() => setCreateModalOpen(true)}
          hasFilter={hasFilter}
        />
      ) : (
        <BillList
          bills={filteredBills}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTogglePaid={handleTogglePaid}
          togglingBillId={togglingBillId}
        />
      )}

      {/* Modals */}
      <CreateBillModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
        monthYear={currentMonth}
      />

      <EditBillModal
        bill={editingBill}
        open={!!editingBill}
        onOpenChange={handleEditModalOpenChange}
      />

      <DeleteBillDialog
        bill={deletingBill}
        open={!!deletingBill}
        onOpenChange={handleDeleteDialogOpenChange}
      />
    </div>
  );
}
