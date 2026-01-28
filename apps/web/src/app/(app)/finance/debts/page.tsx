'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { DebtHeader } from '../components/debt/debt-header';
import { DebtEmptyState } from '../components/debt/debt-empty-states';
import { DebtSimulator } from '../components/debt/debt-simulator';
import { DebtFocusMode, FocusModeTrigger } from '../components/debt/debt-focus-mode';
import { FAB, ScrollToTop } from '../components/debt/debt-mobile-components';
import { StaggerList, DebtCardSkeleton } from '../components/debt/debt-animations';
import {
  calculateDebtTotals,
  formatCurrency,
  type Debt,
  type UpcomingInstallmentItem,
} from '../types';

// =============================================================================
// Types
// =============================================================================

type DebtStatusFilter = 'all' | 'active' | 'overdue' | 'paid_off';

// =============================================================================
// Error State
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
      data-testid="debts-error-state"
    >
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar dívidas</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Não foi possível carregar a lista de dívidas. Verifique sua conexão e tente novamente.
      </p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </Button>
    </motion.div>
  );
}

// =============================================================================
// Section Header
// =============================================================================

interface SectionHeaderProps {
  title: string;
  count: number;
  monthlySum?: number;
  paidCount?: number;
  pendingCount?: number;
  overdueCount?: number;
}

function SectionHeader({
  title,
  count,
  monthlySum,
  paidCount = 0,
  pendingCount = 0,
  overdueCount = 0,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4"
    >
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full tabular-nums">
          {count}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {monthlySum !== undefined && monthlySum > 0 && (
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{formatCurrency(monthlySum)}</span>/mês
          </span>
        )}
        <div className="flex items-center gap-2 text-xs">
          {paidCount > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {paidCount} em dia
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {pendingCount} pendentes
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-destructive font-medium">
              {overdueCount} em atraso
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <DebtCardSkeleton key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Debts Page - Redesigned with enhanced UX
 *
 * Features:
 * - Hero header with inline metrics
 * - Contextual alerts for overdue/upcoming payments
 * - Progress-focused summary
 * - Improved card layouts with exposed CTAs
 * - Focus mode for simplified payment flow
 * - Mobile-optimized experience with FAB
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function DebtsPage() {
  // Finance context - month
  const { currentMonth } = useFinanceContext();

  // Filter state
  const [statusFilter, setStatusFilter] = useState<DebtStatusFilter>('all');
  const [showAllDebts, setShowAllDebts] = useState(false);

  // Celebration dismissal state (reset when month changes)
  const [dismissCelebration, setDismissCelebration] = useState(false);

  // Reset celebration dismissal when month changes
  useEffect(() => {
    setDismissCelebration(false);
  }, [currentMonth]);

  // Data fetching - all debts for KPIs (global view)
  const {
    data: allDebtsData,
    isLoading: isLoadingAll,
    isError: isErrorAll,
    refetch: refetchAll,
  } = useAllDebts();

  // Data fetching - month filtered debts for list (when not showing all)
  const {
    data: monthDebtsData,
    isLoading: isLoadingMonth,
    isError: isErrorMonth,
    refetch: refetchMonth,
  } = useDebts({ monthYear: currentMonth });

  // Choose which data to show in the list based on toggle
  const listDebts = useMemo(
    () =>
      showAllDebts
        ? (allDebtsData?.debts ?? [])
        : (monthDebtsData?.debts ?? []),
    [showAllDebts, allDebtsData?.debts, monthDebtsData?.debts]
  );
  const isLoading = showAllDebts ? isLoadingAll : isLoadingMonth;
  const isError = isErrorAll || isErrorMonth;

  const refetch = () => {
    refetchAll();
    refetchMonth();
  };

  // Filter debts based on status
  const filteredDebts = useMemo(() => {
    return listDebts.filter((debt) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active')
        return debt.status === 'active' || debt.status === 'overdue';
      if (statusFilter === 'overdue') return debt.status === 'overdue';
      if (statusFilter === 'paid_off') return debt.status === 'paid_off';
      return true;
    });
  }, [listDebts, statusFilter]);

  // Separate negotiated and pending debts
  const negotiatedDebts = useMemo(
    () => filteredDebts.filter((debt) => debt.isNegotiated),
    [filteredDebts]
  );
  const pendingDebts = useMemo(
    () => filteredDebts.filter((debt) => !debt.isNegotiated),
    [filteredDebts]
  );

  // Calculate section stats
  const negotiatedStats = useMemo(() => {
    const paid = negotiatedDebts.filter((d) => d.status === 'paid_off').length;
    const active = negotiatedDebts.filter((d) => d.status === 'active').length;
    const overdue = negotiatedDebts.filter((d) => d.status === 'overdue').length;
    const monthlySum = negotiatedDebts
      .filter((d) => d.status !== 'paid_off')
      .reduce((sum, d) => sum + (d.installmentAmount || 0), 0);

    return { paid, pending: active, overdue, monthlySum };
  }, [negotiatedDebts]);

  // KPIs always use ALL debts (global view)
  const allDebtsForTotals = allDebtsData?.debts ?? [];
  const totals = calculateDebtTotals(allDebtsForTotals);

  // Filter counts for tabs
  const filterCounts = useMemo(() => {
    const all = listDebts.length;
    const active = listDebts.filter(
      (d) => d.status === 'active' || d.status === 'overdue'
    ).length;
    const overdue = listDebts.filter((d) => d.status === 'overdue').length;
    const paid_off = listDebts.filter((d) => d.status === 'paid_off').length;

    return { all, active, overdue, paid_off };
  }, [listDebts]);

  // Generate upcoming installments for alerts and focus mode
  const upcomingInstallments = useMemo(() => {
    const items: UpcomingInstallmentItem[] = [];

    for (const debt of negotiatedDebts) {
      if (
        debt.status === 'paid_off' ||
        !debt.installmentAmount ||
        !debt.totalInstallments
      ) {
        continue;
      }

      const isPaid = false; // Would check actual payment status
      const isOverdue = debt.status === 'overdue';

      items.push({
        debtId: debt.id,
        debtName: debt.name,
        creditor: debt.creditor || null,
        installmentNumber: debt.currentInstallment,
        totalInstallments: debt.totalInstallments,
        amount: typeof debt.installmentAmount === 'string'
          ? parseFloat(debt.installmentAmount)
          : debt.installmentAmount,
        dueDay: debt.dueDay || 10,
        belongsToMonthYear: currentMonth,
        status: isOverdue ? 'overdue' : isPaid ? 'paid' : 'pending',
        paidAt: null,
        paidInMonth: null,
      });
    }

    return items;
  }, [negotiatedDebts, currentMonth]);

  // Focus mode state
  const [focusModeOpen, setFocusModeOpen] = useState(false);

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

  const handleFocusModePayInstallment = (debtId: string) => {
    const debt = listDebts.find((d) => d.id === debtId);
    if (debt) {
      setPayingDebt(debt);
    }
  };

  const handlePayAll = () => {
    // Would implement batch payment
    console.log('Pay all installments');
  };

  // Error state
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  // Empty state logic
  const isEmpty = !isLoading && filteredDebts.length === 0;
  const hasNoDebtsAtAll = !isLoading && listDebts.length === 0;
  const allPaidOff =
    !isLoading &&
    listDebts.length > 0 &&
    listDebts.every((d) => d.status === 'paid_off');

  // Determine empty state type
  const getEmptyStateType = (): 'no-debts' | 'all-paid' | 'no-overdue' | 'no-active' | 'filter-empty' | null => {
    if (hasNoDebtsAtAll) return 'no-debts';
    // Show celebration when all debts are paid off and filter is 'all'
    if (statusFilter === 'all' && allPaidOff && !dismissCelebration) {
      return 'all-paid';
    }
    if (isEmpty) {
      if (statusFilter === 'overdue') return 'no-overdue';
      if (statusFilter === 'active') return 'no-active';
      return 'filter-empty';
    }
    return null;
  };

  const emptyStateType = getEmptyStateType();
  const showEmptyState = emptyStateType !== null;
  // Show list even during celebration (all-paid), but not for other empty states
  const showList = filteredDebts.length > 0 && !isLoading &&
    (emptyStateType === null || emptyStateType === 'all-paid');

  const getFilterName = () => {
    switch (statusFilter) {
      case 'overdue':
        return 'Em Atraso';
      case 'active':
        return 'Ativas';
      case 'paid_off':
        return 'Quitadas';
      default:
        return '';
    }
  };

  // Pending installments for focus mode
  const pendingInstallments = upcomingInstallments.filter(
    (i) => i.status === 'pending' || i.status === 'overdue'
  );
  const pendingAmount = pendingInstallments.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6 pb-24" data-testid="debts-page">
      {/* Header with Metrics */}
      <DebtHeader
        totals={totals}
        filterCounts={filterCounts}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showAllDebts={showAllDebts}
        onShowAllDebtsChange={setShowAllDebts}
        onAddClick={() => setCreateModalOpen(true)}
        loading={isLoadingAll}
        simulatorTrigger={
          totals.totalRemaining > 0 && totals.monthlyInstallmentSum > 0 ? (
            <DebtSimulator totals={totals}>
              <Button variant="ghost" size="sm" className="gap-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Simular</span>
              </Button>
            </DebtSimulator>
          ) : undefined
        }
      />

      {/* Summary with Progress - Only show when there's debt data */}
      {totals.totalAmount > 0 && (
        <DebtSummary
          totals={totals}
          upcomingInstallments={upcomingInstallments}
          loading={isLoadingAll}
        />
      )}

      {/* Focus Mode Trigger */}
      {pendingInstallments.length > 0 && (
        <FocusModeTrigger
          pendingAmount={pendingAmount}
          pendingCount={pendingInstallments.length}
          onClick={() => setFocusModeOpen(true)}
        />
      )}


      {/* Loading State */}
      {isLoading && <LoadingSkeleton />}

      {/* Empty State / Celebration */}
      {!isLoading && showEmptyState && (
        <DebtEmptyState
          type={emptyStateType!}
          filterName={getFilterName()}
          totalPaid={emptyStateType === 'all-paid' ? totals.totalPaid : undefined}
          onAction={emptyStateType !== 'all-paid' ? () => {
            if (emptyStateType === 'no-debts') {
              setCreateModalOpen(true);
            } else {
              setStatusFilter('all');
            }
          } : undefined}
        />
      )}

      {/* Content: Debt List */}
      {showList && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Negotiated Debts Section */}
            {negotiatedDebts.length > 0 && (
              <section data-testid="negotiated-debts-section">
                <SectionHeader
                  title="Dívidas Negociadas"
                  count={negotiatedDebts.length}
                  monthlySum={negotiatedStats.monthlySum}
                  paidCount={negotiatedStats.paid}
                  pendingCount={negotiatedStats.pending}
                  overdueCount={negotiatedStats.overdue}
                />
                <StaggerList>
                  <DebtList
                    debts={negotiatedDebts}
                    loading={false}
                    currentMonth={currentMonth}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPayInstallment={handlePayInstallment}
                  />
                </StaggerList>
              </section>
            )}

            {/* Pending Negotiation Section */}
            {pendingDebts.length > 0 && (
              <section data-testid="pending-debts-section">
                <SectionHeader
                  title="Pendentes de Negociação"
                  count={pendingDebts.length}
                />
                <StaggerList>
                  <DebtList
                    debts={pendingDebts}
                    loading={false}
                    currentMonth={currentMonth}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onNegotiate={handleNegotiate}
                  />
                </StaggerList>
              </section>
            )}
          </motion.div>
      )}

      {/* Mobile FAB */}
      <div className="sm:hidden">
        <FAB
          onClick={() => setCreateModalOpen(true)}
          label="Nova Dívida"
        />
      </div>

      {/* Scroll to Top */}
      <ScrollToTop />

      {/* Focus Mode */}
      <DebtFocusMode
        upcomingInstallments={upcomingInstallments}
        currentMonth={currentMonth}
        onPayInstallment={handleFocusModePayInstallment}
        onPayAll={handlePayAll}
        onClose={() => setFocusModeOpen(false)}
        open={focusModeOpen}
      />

      {/* Modals and Dialogs */}
      <CreateDebtModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <EditDebtModal
        debt={editingDebt}
        open={!!editingDebt}
        onOpenChange={(open) => !open && setEditingDebt(null)}
      />

      <DeleteDebtDialog
        debt={deletingDebt}
        open={!!deletingDebt}
        onOpenChange={(open) => !open && setDeletingDebt(null)}
      />

      <NegotiateDebtModal
        debt={negotiatingDebt}
        open={!!negotiatingDebt}
        onOpenChange={(open) => !open && setNegotiatingDebt(null)}
      />

      <PayInstallmentDialog
        debt={payingDebt}
        open={!!payingDebt}
        onOpenChange={(open) => !open && setPayingDebt(null)}
      />
    </div>
  );
}
