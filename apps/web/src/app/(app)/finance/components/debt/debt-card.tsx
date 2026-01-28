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
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
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
          const isPaidSegment = index < paid;
          const isCurrent = index === paid;

          return (
            <motion.div
              key={index}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className={cn(
                'flex-1 h-1.5 rounded-sm transition-colors',
                isPaidSegment && 'bg-emerald-500',
                !isPaidSegment && !isCurrent && 'bg-muted',
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
// Status Config
// =============================================================================

function getStatusConfig(status: Debt['status'], isNegotiated: boolean) {
  if (!isNegotiated) {
    return {
      indicatorColor: 'bg-amber-500',
      icon: AlertCircle,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10',
    };
  }

  switch (status) {
    case 'active':
      return {
        indicatorColor: 'bg-blue-500',
        icon: CreditCard,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-500/10',
      };
    case 'overdue':
      return {
        indicatorColor: 'bg-destructive',
        icon: AlertCircle,
        iconColor: 'text-destructive',
        iconBg: 'bg-destructive/10',
      };
    case 'paid_off':
      return {
        indicatorColor: 'bg-emerald-500',
        icon: CheckCircle2,
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-500/10',
      };
    default:
      return {
        indicatorColor: 'bg-muted-foreground',
        icon: CreditCard,
        iconColor: 'text-muted-foreground',
        iconBg: 'bg-muted/50',
      };
  }
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
        className="h-7 px-2.5 text-xs shrink-0"
        data-testid="debt-negotiate-action"
      >
        <Handshake className="h-3 w-3 mr-1" />
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
        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 className="h-3 w-3" />
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
        className="h-7 px-2.5 text-xs shrink-0"
        data-testid="debt-pay-installment-action"
      >
        {isOverdue ? 'Pagar' : `Pagar ${formatCurrency(debt.installmentAmount!)}`}
      </Button>
    );
  }

  // Paid off - show status
  if (isPaidOff) {
    return (
      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 className="h-3 w-3" />
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
      <div className="pt-3 mt-3 border-t border-border/50 space-y-3 pl-2">
        {/* Current Month Installment Status - Compact inline */}
        {debt.isNegotiated && statusConfig && StatusIcon && (
          <div
            className={cn(
              'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm',
              statusConfig.bgClassName
            )}
          >
            <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', statusConfig.className)} />
            <span className={cn('font-medium', statusConfig.className)}>
              {formatMonthDisplay(currentMonth)}
            </span>
            <span className="text-muted-foreground/70">·</span>
            <span className="text-xs">
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

        {/* Stats - Compact inline row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Pagas:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-500">
              {progress.paidInstallments}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Restantes:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-500">
              {progress.remainingInstallments}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Parcela:</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(debt.installmentAmount!)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Venc:</span>
            <span className="font-semibold">Dia {debt.dueDay}</span>
          </div>
        </div>

        {/* Projection - More subtle */}
        {projection && projection.message && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-blue-500/5">
            <Target className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {projection.message}
            </p>
          </div>
        )}

        {/* View History Link */}
        {debt.isNegotiated && debt.totalInstallments && (
          <DebtPaymentHistory debt={debt}>
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              Ver histórico
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
 * DebtCard - Compact, elegant debt card with integrated progress
 *
 * Design: Refined financial aesthetic matching BillCard and ExpenseCard
 * Layout: Compact rows with icon | info | amount | actions
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

  // Get status config
  const statusConfig = getStatusConfig(debt.status, debt.isNegotiated);
  const StatusIcon = statusConfig.icon;

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

  // Get due date display
  const getDueDateDisplay = () => {
    if (!debt.isNegotiated || daysUntil === null) return null;

    if (currentInstallment?.status === 'paid' || currentInstallment?.status === 'paid_early') {
      return { text: 'Pago este mês', className: 'text-emerald-600 dark:text-emerald-500' };
    }
    if (currentInstallment?.status === 'overdue') {
      return { text: `Vencido há ${Math.abs(daysUntil)}d`, className: 'text-destructive' };
    }
    if (daysUntil === 0) {
      return { text: 'Vence hoje', className: 'text-amber-600 dark:text-amber-500' };
    }
    if (daysUntil > 0 && daysUntil <= 7) {
      return { text: `Vence em ${daysUntil}d`, className: 'text-muted-foreground' };
    }
    return { text: `Dia ${debt.dueDay}`, className: 'text-muted-foreground' };
  };

  const dueDateDisplay = getDueDateDisplay();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative px-3 py-2.5 rounded-lg border bg-card/80 backdrop-blur-sm',
        'transition-all duration-200',
        'hover:bg-card hover:shadow-sm',
        hasDetails && 'cursor-pointer',
        isPaidOff && 'opacity-60 hover:opacity-80',
        isOverdue && 'border-destructive/30 bg-destructive/5'
      )}
      onClick={handleCardClick}
      data-testid="debt-card"
    >
      {/* Status indicator line */}
      <div
        className={cn(
          'absolute left-0 top-2 bottom-2 w-0.5 rounded-full',
          statusConfig.indicatorColor
        )}
      />

      <div className="pl-2 space-y-2">
        {/* Top Row: Icon + Name + Meta + Amount + Actions */}
        <div className="flex items-center gap-3">
          {/* Compact Status Icon */}
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              statusConfig.iconBg
            )}
          >
            <StatusIcon className={cn('h-4 w-4', statusConfig.iconColor)} />
          </div>

          {/* Name & Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  'font-medium text-sm truncate',
                  isPaidOff && 'line-through text-muted-foreground'
                )}
                data-testid="debt-name"
              >
                {debt.name}
              </h3>
              {!debt.isNegotiated && (
                <Handshake className="h-3 w-3 text-amber-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {debt.creditor && (
                <>
                  <span className="text-xs text-muted-foreground" data-testid="debt-creditor">
                    {debt.creditor}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                </>
              )}
              <span className="text-xs text-muted-foreground" data-testid="debt-status-badge">
                {debtStatusLabels[debt.status]}
              </span>
              {!debt.isNegotiated && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs text-amber-600 dark:text-amber-500" data-testid="debt-pending-badge">
                    Negociar
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

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <CTAButton
              debt={debt}
              installmentStatus={currentInstallment?.status}
              onPayInstallment={onPayInstallment}
              onNegotiate={onNegotiate}
              isPaying={isPayingInstallment}
            />

            {hasDetails && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="debt-actions-trigger"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
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

        {/* Bottom Row: Progress + Status Info (Negotiated debts only) */}
        {hasDetails && (
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="flex-1" data-testid="debt-progress-bar">
              <MiniProgressBar
                current={debt.currentInstallment}
                total={debt.totalInstallments!}
              />
            </div>

            {/* Status info */}
            <div className="flex items-center gap-2 shrink-0 text-xs">
              {dueDateDisplay && (
                <span className={dueDateDisplay.className}>{dueDateDisplay.text}</span>
              )}
              <span className="text-muted-foreground/40">·</span>
              <span className="text-emerald-600 dark:text-emerald-500" data-testid="debt-paid-amount">
                Pago: {formatCurrency(progress.paidAmount)}
              </span>
            </div>
          </div>
        )}
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
