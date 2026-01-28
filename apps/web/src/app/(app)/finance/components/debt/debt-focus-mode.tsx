'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  ChevronRight,
  CheckCircle2,
  Clock,
  CreditCard,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatMonthDisplay, type UpcomingInstallmentItem } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface DebtFocusModeProps {
  upcomingInstallments: UpcomingInstallmentItem[];
  currentMonth: string;
  onPayInstallment: (debtId: string) => void;
  onPayAll: () => void;
  onClose: () => void;
  open: boolean;
}

// =============================================================================
// Installment Item Component
// =============================================================================

interface InstallmentItemProps {
  installment: UpcomingInstallmentItem;
  onPay: () => void;
  index: number;
}

function InstallmentItem({ installment, onPay, index }: InstallmentItemProps) {
  const isPaid = installment.status === 'paid' || installment.status === 'paid_early';
  const isOverdue = installment.status === 'overdue';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-colors',
        isPaid && 'bg-emerald-500/5 border-emerald-500/20',
        isOverdue && 'bg-destructive/5 border-destructive/20',
        !isPaid && !isOverdue && 'bg-card border-border hover:border-foreground/20'
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          isPaid && 'bg-emerald-500 text-white',
          isOverdue && 'bg-destructive text-white',
          !isPaid && !isOverdue && 'bg-muted text-muted-foreground'
        )}
      >
        {isPaid ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Clock className="h-5 w-5" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{installment.debtName}</p>
        <p className="text-sm text-muted-foreground">
          Parcela {installment.installmentNumber}/{installment.totalInstallments}
          {isOverdue && ' · Vencida'}
        </p>
      </div>

      {/* Amount & Action */}
      <div className="flex items-center gap-3">
        <span className="font-semibold tabular-nums">
          {formatCurrency(installment.amount)}
        </span>
        {!isPaid && (
          <Button
            size="sm"
            variant={isOverdue ? 'destructive' : 'default'}
            onClick={onPay}
            className="shrink-0"
          >
            Pagar
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Summary Header Component
// =============================================================================

interface SummaryHeaderProps {
  totalAmount: number;
  paidAmount: number;
  pendingCount: number;
  paidCount: number;
  month: string;
}

function SummaryHeader({
  totalAmount,
  paidAmount,
  pendingCount,
  paidCount,
  month,
}: SummaryHeaderProps) {
  const pendingAmount = totalAmount - paidAmount;
  const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {formatMonthDisplay(month)}
        </p>
        <motion.p
          key={pendingAmount}
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold tabular-nums mt-1"
        >
          {formatCurrency(pendingAmount)}
        </motion.p>
        <p className="text-sm text-muted-foreground mt-1">
          restante para pagar
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{paidCount} parcelas pagas</span>
          <span>{pendingCount} pendentes</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DebtFocusMode - Simplified payment dashboard
 *
 * Features:
 * - Focus on current month's payments
 * - Quick pay buttons for each installment
 * - Progress tracking
 * - "Pay All" option
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtFocusMode({
  upcomingInstallments,
  currentMonth,
  onPayInstallment,
  onPayAll,
  onClose,
  open,
}: DebtFocusModeProps) {
  // Filter installments for current month
  const monthInstallments = useMemo(() => {
    return upcomingInstallments.filter(() => {
      // All upcoming installments for the current month view
      return true;
    });
  }, [upcomingInstallments]);

  // Calculate stats
  const stats = useMemo(() => {
    const paid = monthInstallments.filter(
      (i) => i.status === 'paid' || i.status === 'paid_early'
    );
    const pending = monthInstallments.filter(
      (i) => i.status === 'pending' || i.status === 'overdue'
    );

    return {
      totalAmount: monthInstallments.reduce((sum, i) => sum + i.amount, 0),
      paidAmount: paid.reduce((sum, i) => sum + i.amount, 0),
      paidCount: paid.length,
      pendingCount: pending.length,
      pendingInstallments: pending,
    };
  }, [monthInstallments]);

  const allPaid = stats.pendingCount === 0 && stats.paidCount > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <span className="font-semibold">Modo Foco</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-6 max-w-lg mx-auto">
            {/* Summary */}
            <SummaryHeader
              totalAmount={stats.totalAmount}
              paidAmount={stats.paidAmount}
              pendingCount={stats.pendingCount}
              paidCount={stats.paidCount}
              month={currentMonth}
            />

            {/* All Paid State */}
            {allPaid && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-xl font-semibold">
                  Tudo pago!
                </h3>
                <p className="text-muted-foreground mt-1">
                  Você pagou todas as parcelas deste mês.
                </p>
              </motion.div>
            )}

            {/* Pending Installments */}
            {!allPaid && stats.pendingInstallments.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Parcelas Pendentes</h3>
                  {stats.pendingCount > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPayAll}
                      className="gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pagar Todas
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {stats.pendingInstallments.map((installment, index) => (
                    <InstallmentItem
                      key={`${installment.debtId}-${installment.installmentNumber}`}
                      installment={installment}
                      onPay={() => onPayInstallment(installment.debtId)}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Installments */}
            {monthInstallments.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma parcela para este mês.</p>
              </div>
            )}

            {/* Paid Installments (collapsed) */}
            {stats.paidCount > 0 && !allPaid && (
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  Ver {stats.paidCount} {stats.paidCount === 1 ? 'parcela paga' : 'parcelas pagas'}
                </summary>
                <div className="mt-3 space-y-2 pl-6">
                  {monthInstallments
                    .filter((i) => i.status === 'paid' || i.status === 'paid_early')
                    .map((installment) => (
                      <div
                        key={`${installment.debtId}-${installment.installmentNumber}`}
                        className="flex items-center gap-3 py-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="flex-1 truncate">{installment.debtName}</span>
                        <span className="tabular-nums">{formatCurrency(installment.amount)}</span>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>

          {/* Bottom Action */}
          {stats.pendingCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t">
              <div className="max-w-lg mx-auto">
                <Button
                  onClick={onPayAll}
                  className="w-full h-12 text-base gap-2"
                >
                  <CreditCard className="h-5 w-5" />
                  Pagar Tudo ({formatCurrency(stats.totalAmount - stats.paidAmount)})
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Focus Mode Trigger Button
// =============================================================================

interface FocusModeTriggerProps {
  pendingAmount: number;
  pendingCount: number;
  onClick: () => void;
  className?: string;
}

/**
 * FocusModeTrigger - Visually prominent shortcut to pay all installments
 */
export function FocusModeTrigger({
  pendingAmount,
  pendingCount,
  onClick,
  className,
}: FocusModeTriggerProps) {
  if (pendingCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-lg',
        'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent',
        'border border-primary/20 hover:border-primary/40',
        'hover:from-primary/15 hover:via-primary/10',
        'transition-all cursor-pointer',
        className
      )}
    >
      {/* Icon with accent background */}
      <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
        <Target className="h-3.5 w-3.5 text-primary" />
      </div>

      {/* Title + Count */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">Pagar Parcelas</span>
        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-medium tabular-nums">
          {pendingCount}
        </span>
      </div>

      {/* Amount - emphasized */}
      <span className="text-sm font-bold tabular-nums text-primary">
        {formatCurrency(pendingAmount)}
      </span>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-primary/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}
