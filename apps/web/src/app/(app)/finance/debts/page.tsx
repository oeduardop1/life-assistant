'use client';

import { useState } from 'react';
import { Plus, AlertCircle, RefreshCw, CreditCard, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDebts, useAllDebts } from '../hooks/use-debts';
import { useFinanceContext } from '../context/finance-context';
import {
  DebtList,
  DebtSummary,
  CreateDebtModal,
  EditDebtModal,
  DeleteDebtDialog,
  NegotiateDebtModal,
  PayInstallmentDialog,
} from '../components/debt';
import { calculateDebtTotals, formatMonthDisplay, type Debt } from '../types';

// =============================================================================
// Types
// =============================================================================

type DebtStatusFilter = 'all' | 'active' | 'overdue' | 'paid_off';

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
        data-testid="debts-empty-filtered"
      >
        <div className="rounded-full bg-muted p-4 mb-4">
          <CreditCard className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma dívida encontrada</h3>
        <p className="text-muted-foreground mb-4">
          Não há dívidas com o filtro selecionado.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      data-testid="debts-empty-state"
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <CreditCard className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhuma dívida cadastrada</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Cadastre suas dívidas para acompanhar o progresso dos pagamentos.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Dívida
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
      data-testid="debts-error-state"
    >
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar dívidas</h3>
      <p className="text-muted-foreground mb-4">
        Não foi possível carregar a lista de dívidas.
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
  statusFilter: DebtStatusFilter;
  onStatusFilterChange: (filter: DebtStatusFilter) => void;
  onAddClick: () => void;
  showAllDebts: boolean;
  onShowAllDebtsChange: (value: boolean) => void;
  currentMonth: string;
}

function PageHeader({
  statusFilter,
  onStatusFilterChange,
  onAddClick,
  showAllDebts,
  onShowAllDebtsChange,
  currentMonth,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Dívidas</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie suas dívidas e financiamentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs
            value={statusFilter}
            onValueChange={(value: string) => onStatusFilterChange(value as DebtStatusFilter)}
          >
            <TabsList data-testid="debt-status-filter">
              <TabsTrigger value="all" data-testid="debt-filter-all">
                Todas
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="debt-filter-active">
                Ativas
              </TabsTrigger>
              <TabsTrigger value="overdue" data-testid="debt-filter-overdue">
                Em Atraso
              </TabsTrigger>
              <TabsTrigger value="paid_off" data-testid="debt-filter-paid-off">
                Quitadas
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={onAddClick} data-testid="add-debt-button">
            <Plus className="h-4 w-4 mr-2" />
            Nova Dívida
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          {showAllDebts ? (
            <>
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Mostrando:</span>
              <span className="font-medium">Todas as dívidas</span>
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Mostrando dívidas de:</span>
              <span className="font-medium">{formatMonthDisplay(currentMonth)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="show-all-debts" className="text-sm text-muted-foreground cursor-pointer">
            Ver todas
          </Label>
          <Switch
            id="show-all-debts"
            checked={showAllDebts}
            onCheckedChange={onShowAllDebtsChange}
            data-testid="show-all-debts-toggle"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Section Header
// =============================================================================

interface SectionHeaderProps {
  title: string;
  count: number;
}

function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-base font-medium">{title}</h3>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Debts Page
 *
 * Lists all debts with CRUD operations, pay installment, and negotiate actions.
 * Separated into negotiated and pending negotiation sections.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function DebtsPage() {
  // Finance context - month navigation
  const { currentMonth } = useFinanceContext();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<DebtStatusFilter>('all');
  const [showAllDebts, setShowAllDebts] = useState(false);

  // Data fetching - all debts for KPIs (global view)
  const { data: allDebtsData, isLoading: isLoadingAll, isError: isErrorAll, refetch: refetchAll } = useAllDebts();

  // Data fetching - month filtered debts for list (when not showing all)
  const { data: monthDebtsData, isLoading: isLoadingMonth, isError: isErrorMonth, refetch: refetchMonth } = useDebts({ monthYear: currentMonth });

  // Choose which data to show in the list based on toggle
  const listDebts = showAllDebts ? (allDebtsData?.debts ?? []) : (monthDebtsData?.debts ?? []);
  const isLoading = showAllDebts ? isLoadingAll : isLoadingMonth;
  const isError = isErrorAll || isErrorMonth;

  const refetch = () => {
    refetchAll();
    refetchMonth();
  };

  // Filter debts based on status
  const filteredDebts = listDebts.filter((debt) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return debt.status === 'active' || debt.status === 'overdue';
    if (statusFilter === 'overdue') return debt.status === 'overdue';
    if (statusFilter === 'paid_off') return debt.status === 'paid_off';
    return true;
  });

  // Separate negotiated and pending debts
  const negotiatedDebts = filteredDebts.filter((debt) => debt.isNegotiated);
  const pendingDebts = filteredDebts.filter((debt) => !debt.isNegotiated);

  // KPIs always use ALL debts (global view)
  const allDebtsForTotals = allDebtsData?.debts ?? [];
  const totals = calculateDebtTotals(allDebtsForTotals);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
  const [negotiatingDebt, setNegotiatingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);

  // Handlers
  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
  };

  const handleDelete = (debt: Debt) => {
    setDeletingDebt(debt);
  };

  const handleNegotiate = (debt: Debt) => {
    setNegotiatingDebt(debt);
  };

  const handlePayInstallment = (debt: Debt) => {
    setPayingDebt(debt);
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    setCreateModalOpen(open);
  };

  const handleEditModalOpenChange = (open: boolean) => {
    if (!open) {
      setEditingDebt(null);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingDebt(null);
    }
  };

  const handleNegotiateModalOpenChange = (open: boolean) => {
    if (!open) {
      setNegotiatingDebt(null);
    }
  };

  const handlePayInstallmentDialogOpenChange = (open: boolean) => {
    if (!open) {
      setPayingDebt(null);
    }
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Empty state
  const isEmpty = !isLoading && filteredDebts.length === 0;
  const hasFilter = statusFilter !== 'all';

  return (
    <div className="space-y-6" data-testid="debts-page">
      {/* Header */}
      <PageHeader
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onAddClick={() => setCreateModalOpen(true)}
        showAllDebts={showAllDebts}
        onShowAllDebtsChange={setShowAllDebts}
        currentMonth={currentMonth}
      />

      {/* Summary - always uses global data */}
      <DebtSummary totals={totals} loading={isLoadingAll} />

      {/* List or Empty State */}
      {isEmpty ? (
        <EmptyState
          onAddClick={() => setCreateModalOpen(true)}
          hasFilter={hasFilter}
        />
      ) : (
        <div className="space-y-8">
          {/* Negotiated Debts Section */}
          {negotiatedDebts.length > 0 && (
            <section data-testid="negotiated-debts-section">
              <SectionHeader
                title="Dívidas Negociadas"
                count={negotiatedDebts.length}
              />
              <DebtList
                debts={negotiatedDebts}
                loading={isLoading}
                currentMonth={currentMonth}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPayInstallment={handlePayInstallment}
              />
            </section>
          )}

          {/* Pending Negotiation Section */}
          {pendingDebts.length > 0 && (
            <section data-testid="pending-debts-section">
              <SectionHeader
                title="Pendentes de Negociação"
                count={pendingDebts.length}
              />
              <DebtList
                debts={pendingDebts}
                loading={isLoading}
                currentMonth={currentMonth}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onNegotiate={handleNegotiate}
              />
            </section>
          )}
        </div>
      )}

      {/* Modals and Dialogs */}
      <CreateDebtModal
        open={createModalOpen}
        onOpenChange={handleCreateModalOpenChange}
      />

      <EditDebtModal
        debt={editingDebt}
        open={!!editingDebt}
        onOpenChange={handleEditModalOpenChange}
      />

      <DeleteDebtDialog
        debt={deletingDebt}
        open={!!deletingDebt}
        onOpenChange={handleDeleteDialogOpenChange}
      />

      <NegotiateDebtModal
        debt={negotiatingDebt}
        open={!!negotiatingDebt}
        onOpenChange={handleNegotiateModalOpenChange}
      />

      <PayInstallmentDialog
        debt={payingDebt}
        open={!!payingDebt}
        onOpenChange={handlePayInstallmentDialogOpenChange}
      />
    </div>
  );
}
