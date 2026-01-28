'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  BillHeader,
  BillAlertBanner,
  BillEmptyState,
  BillQuickPay,
  QuickPayTrigger,
  FAB,
  ScrollToTop,
  CreateBillModal,
  EditBillModal,
  DeleteBillDialog,
  type BillStatusFilter,
} from '../components/bill';
import type { Bill } from '../types';

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

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const counts = {
      all: allBills.length,
      pending: 0,
      paid: 0,
      overdue: 0,
    };

    for (const bill of allBills) {
      if (bill.status === 'paid') {
        counts.paid++;
      } else if (bill.status === 'overdue') {
        counts.overdue++;
      } else if (bill.status === 'pending') {
        counts.pending++;
      }
    }

    return counts;
  }, [allBills]);

  // Filter bills based on status
  const filteredBills = useMemo(() => {
    return allBills.filter((bill) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'pending') return bill.status === 'pending';
      if (statusFilter === 'paid') return bill.status === 'paid';
      if (statusFilter === 'overdue') return bill.status === 'overdue';
      return true;
    });
  }, [allBills, statusFilter]);

  const totals = calculateBillTotals(allBills);

  // Pending amount for quick pay
  const pendingAmount = totals.pending + totals.overdue;
  const pendingCount = totals.pendingCount + totals.overdueCount;

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [quickPayOpen, setQuickPayOpen] = useState(false);

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

  const handlePayAllPending = async () => {
    const pendingBills = allBills.filter(
      (b) => b.status === 'pending' || b.status === 'overdue'
    );

    for (const bill of pendingBills) {
      try {
        await markPaid.mutateAsync({ id: bill.id, monthYear: bill.monthYear });
      } catch {
        toast.error(`Erro ao pagar ${bill.name}`);
      }
    }

    toast.success(`${pendingBills.length} contas pagas com sucesso!`);
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

  // Get empty state type
  const getEmptyStateType = () => {
    if (allBills.length === 0) return 'no-bills';
    if (statusFilter === 'overdue' && filterCounts.overdue === 0) return 'no-overdue';
    if (statusFilter !== 'all' && filteredBills.length === 0) return 'filter-empty';
    if (pendingCount === 0 && totals.paidCount > 0) return 'all-paid';
    return null;
  };

  const getFilterName = () => {
    const names: Record<BillStatusFilter, string> = {
      all: 'Todas',
      pending: 'Pendentes',
      paid: 'Pagas',
      overdue: 'Vencidas',
    };
    return names[statusFilter];
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Determine content to render
  const emptyStateType = getEmptyStateType();
  const showEmptyState = !isLoading && emptyStateType !== null &&
    (emptyStateType !== 'all-paid' || statusFilter === 'pending');

  return (
    <div className="space-y-6" data-testid="bills-page">
      {/* Header with metrics and filters */}
      <BillHeader
        totals={totals}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddClick={() => setCreateModalOpen(true)}
        filterCounts={filterCounts}
        loading={isLoading}
      />

      {/* Alert Banner for overdue/due today */}
      {!isLoading && (
        <BillAlertBanner
          bills={allBills}
          onQuickPayClick={() => setQuickPayOpen(true)}
        />
      )}

      {/* Quick Pay Trigger */}
      {!isLoading && pendingCount > 0 && statusFilter === 'all' && (
        <QuickPayTrigger
          pendingAmount={pendingAmount}
          pendingCount={pendingCount}
          onClick={() => setQuickPayOpen(true)}
        />
      )}

      {/* Summary with progress bar */}
      {!isLoading && allBills.length > 0 && (
        <BillSummary
          totals={totals}
          bills={allBills}
          loading={isLoading}
        />
      )}

      {/* Empty State or List */}
      {showEmptyState ? (
        <BillEmptyState
          type={emptyStateType!}
          filterName={getFilterName()}
          totalPaid={totals.paid}
          onAction={() => {
            if (emptyStateType === 'no-bills') {
              setCreateModalOpen(true);
            } else if (emptyStateType === 'all-paid') {
              // View history or do nothing
            } else {
              setStatusFilter('all');
            }
          }}
          onSecondaryAction={
            emptyStateType === 'all-paid'
              ? () => setCreateModalOpen(true)
              : undefined
          }
        />
      ) : (
        <BillList
          bills={filteredBills}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTogglePaid={handleTogglePaid}
          togglingBillId={togglingBillId}
          grouped={statusFilter === 'all'}
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

      {/* Quick Pay Mode */}
      <BillQuickPay
        bills={allBills}
        currentMonth={currentMonth}
        onPayBill={handleTogglePaid}
        onPayAll={handlePayAllPending}
        onClose={() => setQuickPayOpen(false)}
        open={quickPayOpen}
        payingBillId={togglingBillId}
      />

      {/* Mobile Components */}
      <FAB
        onClick={() => setCreateModalOpen(true)}
        label="Nova Conta"
      />
      <ScrollToTop />
    </div>
  );
}
