'use client';

import { useState, useCallback } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CreditCard,
  CheckCircle2,
  Handshake,
  AlertCircle,
  ChevronDown,
  Clock,
  Zap,
  History,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  debtStatusLabels,
  calculateDebtProgress,
  formatMonthDisplay,
  type Debt,
  type UpcomingInstallmentStatus,
} from '../../types';
import { useDebtProjection, useUpcomingInstallments } from '../../hooks/use-debts';
import { DebtPaymentHistory } from './debt-payment-history';

// =============================================================================
// Types
// =============================================================================

interface DebtCardProps {
  debt: Debt;
  currentMonth: string;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onPayInstallment?: (debt: Debt) => void;
  onNegotiate?: (debt: Debt) => void;
  /** @deprecated History is now handled via DebtPaymentHistory drawer wrapper */
  onViewHistory?: (debt: Debt) => void;
  isPayingInstallment?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const dueDate = new Date(currentYear, currentMonth, dueDay);
  if (dueDay < currentDay) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }

  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getInstallmentStatusConfig(status: UpcomingInstallmentStatus) {
  const config = {
    paid: {
      label: 'Pago',
      icon: CheckCircle2,
      className: 'text-emerald-700 dark:text-emerald-400',
      bgClassName: 'bg-emerald-500/10',
    },
    paid_early: {
      label: 'Antecipado',
      icon: Zap,
      className: 'text-blue-700 dark:text-blue-400',
      bgClassName: 'bg-blue-500/10',
    },
    pending: {
      label: 'Pendente',
      icon: Clock,
      className: 'text-amber-700 dark:text-amber-400',
      bgClassName: 'bg-amber-500/10',
    },
    overdue: {
      label: 'Vencido',
      icon: AlertCircle,
      className: 'text-destructive',
      bgClassName: 'bg-destructive/10',
    },
  };
  return config[status];
}

// =============================================================================
// Segmented Progress Bar Component
// =============================================================================

interface SegmentedProgressBarProps {
  current: number;
  total: number;
  className?: string;
  /** Maximum visible segments before collapsing */
  maxSegments?: number;
}

/**
 * SegmentedProgressBar - Visual progress indicator with individual segments
 *
 * Each segment represents one installment:
 * - Filled segments = paid
 * - Empty segments = remaining
 * - Current segment has pulse animation
 */
function SegmentedProgressBar({
  current,
  total,
  className,
  maxSegments = 12,
}: SegmentedProgressBarProps) {
  const paid = current - 1;
  const shouldCollapse = total > maxSegments;

  // For collapsed view, show proportional progress
  if (shouldCollapse) {
    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
    const getColor = () => {
      if (percent >= 75) return 'bg-emerald-500';
      if (percent >= 50) return 'bg-blue-500';
      if (percent >= 25) return 'bg-amber-500';
      return 'bg-foreground/30';
    };

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn('h-full rounded-full', getColor())}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
          {paid}/{total}
        </span>
      </div>
    );
  }

  // Segmented view for smaller totals
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: total }).map((_, index) => {
          const isPaid = index < paid;
          const isCurrent = index === paid;

          return (
            <motion.div
              key={index}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className={cn(
                'flex-1 h-2 rounded-sm transition-colors',
                isPaid && 'bg-emerald-500',
                !isPaid && !isCurrent && 'bg-muted',
                isCurrent && 'bg-blue-500'
              )}
            >
              {isCurrent && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full h-full bg-blue-400 rounded-sm"
                />
              )}
            </motion.div>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground font-mono tabular-nums whitespace-nowrap">
        {paid}/{total}
      </span>
    </div>
  );
}

// Keep old MiniProgressBar as alias for backwards compatibility
const MiniProgressBar = SegmentedProgressBar;

// =============================================================================
// Status Indicator
// =============================================================================

interface StatusIndicatorProps {
  status: Debt['status'];
  isNegotiated: boolean;
}

function StatusIndicator({ status, isNegotiated }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    if (!isNegotiated) {
      return {
        color: 'border-l-amber-500',
        icon: AlertCircle,
        iconColor: 'text-amber-500',
      };
    }

    switch (status) {
      case 'active':
        return {
          color: 'border-l-blue-500',
          icon: CreditCard,
          iconColor: 'text-blue-500',
        };
      case 'overdue':
        return {
          color: 'border-l-destructive',
          icon: AlertCircle,
          iconColor: 'text-destructive',
        };
      case 'paid_off':
        return {
          color: 'border-l-emerald-500',
          icon: CheckCircle2,
          iconColor: 'text-emerald-500',
        };
      default:
        return {
          color: 'border-l-muted-foreground',
          icon: CreditCard,
          iconColor: 'text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-center w-10 h-10 rounded-lg',
        'bg-muted/50'
      )}
    >
      <Icon className={cn('h-5 w-5', config.iconColor)} />
    </div>
  );
}

// =============================================================================
// CTA Button
// =============================================================================

interface CTAButtonProps {
  debt: Debt;
  installmentStatus?: UpcomingInstallmentStatus;
  onPayInstallment?: (debt: Debt) => void;
  onNegotiate?: (debt: Debt) => void;
  isPaying?: boolean;
}

function CTAButton({
  debt,
  installmentStatus,
  onPayInstallment,
  onNegotiate,
  isPaying,
}: CTAButtonProps) {
  const isPaidOff = debt.status === 'paid_off';
  const isActive = debt.status === 'active' || debt.status === 'overdue';

  // Pending negotiation - show negotiate CTA
  if (!debt.isNegotiated && isActive && onNegotiate) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onNegotiate(debt);
        }}
        className="shrink-0"
        data-testid="debt-negotiate-action"
      >
        <Handshake className="h-4 w-4 mr-1.5" />
        Negociar
      </Button>
    );
  }

  // Negotiated and active - show pay CTA
  if (debt.isNegotiated && isActive && onPayInstallment) {
    const isPaidThisMonth =
      installmentStatus === 'paid' || installmentStatus === 'paid_early';

    if (isPaidThisMonth) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          <span>Pago</span>
        </div>
      );
    }

    const isOverdue = installmentStatus === 'overdue' || debt.status === 'overdue';

    return (
      <Button
        size="sm"
        variant={isOverdue ? 'destructive' : 'default'}
        onClick={(e) => {
          e.stopPropagation();
          onPayInstallment(debt);
        }}
        disabled={isPaying}
        className="shrink-0"
        data-testid="debt-pay-installment-action"
      >
        {isOverdue ? 'Pagar Agora' : `Pagar ${formatCurrency(debt.installmentAmount!)}`}
      </Button>
    );
  }

  // Paid off - show status
  if (isPaidOff) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 className="h-4 w-4" />
        <span>Quitado</span>
      </div>
    );
  }

  return null;
}

// =============================================================================
// Expanded Details
// =============================================================================

interface ExpandedDetailsProps {
  debt: Debt;
  currentMonth: string;
  installmentStatus?: UpcomingInstallmentStatus;
  installmentPaidAt?: string | null;
  projection?: Debt['projection'];
}

function ExpandedDetails({
  debt,
  currentMonth,
  installmentStatus,
  installmentPaidAt,
  projection,
}: ExpandedDetailsProps) {
  const progress = calculateDebtProgress(debt);
  const statusConfig = installmentStatus
    ? getInstallmentStatusConfig(installmentStatus)
    : null;
  const StatusIcon = statusConfig?.icon;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="pt-4 mt-4 border-t border-border/50 space-y-4">
        {/* Current Month Installment Status */}
        {debt.isNegotiated && statusConfig && StatusIcon && (
          <div
            className={cn(
              'flex items-center justify-between p-3 rounded-lg',
              statusConfig.bgClassName
            )}
          >
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-4 w-4', statusConfig.className)} />
              <span className={cn('text-sm font-medium', statusConfig.className)}>
                Parcela de {formatMonthDisplay(currentMonth)}
              </span>
            </div>
            <span className="text-sm">
              {installmentStatus === 'paid' && installmentPaidAt && (
                <>
                  Pago em{' '}
                  {new Date(installmentPaidAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </>
              )}
              {installmentStatus === 'pending' && debt.dueDay && (
                <>Vence dia {debt.dueDay}</>
              )}
              {installmentStatus === 'overdue' && debt.dueDay && (
                <>Venceu dia {debt.dueDay}</>
              )}
            </span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Parcelas Pagas</span>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">
              {progress.paidInstallments}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Restantes</span>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-500">
              {progress.remainingInstallments}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Valor Parcela</span>
            <p className="text-sm font-semibold tabular-nums">
              {formatCurrency(debt.installmentAmount!)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Vencimento</span>
            <p className="text-sm font-semibold">Dia {debt.dueDay}</p>
          </div>
        </div>

        {/* Projection */}
        {projection && projection.message && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {projection.message}
            </p>
          </div>
        )}

        {/* View History Link - wrapped with DebtPaymentHistory drawer */}
        {debt.isNegotiated && debt.totalInstallments && (
          <DebtPaymentHistory debt={debt}>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-4 w-4" />
              Ver histórico de pagamentos
            </button>
          </DebtPaymentHistory>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DebtCard - Redesigned card with visible progress, exposed CTA, and clear states
 *
 * Features:
 * - Progress bar always visible
 * - Primary CTA exposed (Pay/Negotiate)
 * - Visual states: active, overdue, paid_off, pending negotiation
 * - Expandable details with stats and projection
 * - Countdown to due date
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtCard({
  debt,
  currentMonth,
  onEdit,
  onDelete,
  onPayInstallment,
  onNegotiate,
  isPayingInstallment,
}: DebtCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch projection when expanded
  const { data: projection } = useDebtProjection(
    isExpanded && debt.isNegotiated ? debt.id : undefined
  );

  // Fetch current month installment status
  const { data: upcomingData } = useUpcomingInstallments(currentMonth);
  const currentInstallment = upcomingData?.installments.find(
    (inst) => inst.debtId === debt.id
  );

  const isPaidOff = debt.status === 'paid_off';
  const isOverdue = debt.status === 'overdue';
  const hasDetails = debt.isNegotiated && debt.totalInstallments && debt.installmentAmount;
  const progress = calculateDebtProgress(debt);

  // Get days until due
  const daysUntil = debt.dueDay ? getDaysUntilDue(debt.dueDay) : null;

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="menuitem"]')) {
        return;
      }
      if (hasDetails) {
        setIsExpanded(!isExpanded);
      }
    },
    [hasDetails, isExpanded]
  );

  // Card border color based on status
  const getBorderClass = () => {
    if (!debt.isNegotiated) return 'border-l-4 border-l-amber-500';
    if (isOverdue) return 'border-l-4 border-l-destructive';
    if (isPaidOff) return 'border-l-4 border-l-emerald-500';
    return 'border-l-4 border-l-blue-500';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'group relative p-4 rounded-lg border bg-card transition-all duration-200',
        getBorderClass(),
        hasDetails && 'cursor-pointer hover:bg-accent/30',
        isPaidOff && 'opacity-60'
      )}
      onClick={handleCardClick}
      data-testid="debt-card"
    >
      {/* Main Content */}
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <StatusIndicator status={debt.status} isNegotiated={debt.isNegotiated} />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3
                className={cn(
                  'font-medium text-sm truncate',
                  isPaidOff && 'line-through text-muted-foreground'
                )}
                data-testid="debt-name"
              >
                {debt.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {debt.creditor && <span data-testid="debt-creditor">{debt.creditor}</span>}
                {debt.creditor && <span>·</span>}
                <span data-testid="debt-status-badge">{debtStatusLabels[debt.status]}</span>
                {!debt.isNegotiated && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-500" data-testid="debt-pending-badge">
                      Pendente de negociação
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right shrink-0">
              <p
                className={cn(
                  'text-sm font-semibold font-mono tabular-nums',
                  isPaidOff && 'line-through text-muted-foreground'
                )}
                data-testid="debt-amount"
              >
                {formatCurrency(debt.totalAmount)}
              </p>
              {debt.isNegotiated && debt.installmentAmount && (
                <p className="text-xs text-muted-foreground font-mono tabular-nums" data-testid="debt-installment-amount">
                  {formatCurrency(debt.installmentAmount)}/mês
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar (Negotiated only) */}
          {hasDetails && (
            <div data-testid="debt-progress-bar">
              <MiniProgressBar
                current={debt.currentInstallment}
                total={debt.totalInstallments!}
              />
            </div>
          )}

          {/* Bottom Row: Status + CTA */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Status Info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {debt.isNegotiated && daysUntil !== null && (
                <>
                  {currentInstallment?.status === 'paid' ||
                  currentInstallment?.status === 'paid_early' ? (
                    <span className="text-emerald-600 dark:text-emerald-500">
                      {formatMonthDisplay(currentMonth)}: Pago
                    </span>
                  ) : currentInstallment?.status === 'overdue' ? (
                    <span className="text-destructive">
                      Vencido há {Math.abs(daysUntil)} dias
                    </span>
                  ) : daysUntil === 0 ? (
                    <span className="text-amber-600 dark:text-amber-500 font-medium">
                      Vence hoje
                    </span>
                  ) : daysUntil > 0 && daysUntil <= 7 ? (
                    <span>
                      Vence em {daysUntil} dia{daysUntil > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span>Vence dia {debt.dueDay}</span>
                  )}
                </>
              )}
              {debt.isNegotiated && (
                <span className="text-emerald-600 dark:text-emerald-500" data-testid="debt-paid-amount">
                  Pago: {formatCurrency(progress.paidAmount)}
                </span>
              )}
            </div>

            {/* CTA + Menu */}
            <div className="flex items-center gap-2">
              <CTAButton
                debt={debt}
                installmentStatus={currentInstallment?.status}
                onPayInstallment={onPayInstallment}
                onNegotiate={onNegotiate}
                isPaying={isPayingInstallment}
              />

              {/* Expand Indicator */}
              {hasDetails && (
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              )}

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                    data-testid="debt-actions-trigger"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {debt.isNegotiated &&
                    (debt.status === 'active' || debt.status === 'overdue') &&
                    onPayInstallment && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onPayInstallment(debt)}
                          disabled={isPayingInstallment}
                          data-testid="debt-menu-pay-installment"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Pagar Parcela {debt.currentInstallment}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                  {!debt.isNegotiated &&
                    debt.status === 'active' &&
                    onNegotiate && (
                      <>
                        <DropdownMenuItem onClick={() => onNegotiate(debt)} data-testid="debt-menu-negotiate">
                          <Handshake className="h-4 w-4 mr-2" />
                          Negociar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                  {debt.isNegotiated && debt.totalInstallments && (
                    <DebtPaymentHistory debt={debt}>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <History className="h-4 w-4 mr-2" />
                        Histórico
                      </DropdownMenuItem>
                    </DebtPaymentHistory>
                  )}

                  <DropdownMenuItem onClick={() => onEdit(debt)} data-testid="debt-edit-action">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(debt)}
                    className="text-destructive focus:text-destructive"
                    data-testid="debt-delete-action"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <ExpandedDetails
            debt={debt}
            currentMonth={currentMonth}
            installmentStatus={currentInstallment?.status}
            installmentPaidAt={currentInstallment?.paidAt}
            projection={projection ?? debt.projection}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
