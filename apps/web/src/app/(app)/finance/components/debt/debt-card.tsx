'use client';

import { useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CreditCard,
  CheckCircle2,
  Handshake,
  AlertCircle,
  ChevronDown,
  Zap,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  debtStatusColors,
  calculateDebtProgress,
  formatMonthDisplay,
  type Debt,
  type UpcomingInstallmentStatus,
} from '../../types';
import { useDebtProjection, useUpcomingInstallments } from '../../hooks/use-debts';
import { DebtProgressBar } from './debt-progress-bar';
import { DebtStats } from './debt-stats';

// =============================================================================
// Props
// =============================================================================

interface DebtCardProps {
  debt: Debt;
  currentMonth: string;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onPayInstallment?: (debt: Debt) => void;
  onNegotiate?: (debt: Debt) => void;
  isPayingInstallment?: boolean;
}

// =============================================================================
// Installment Status Config
// =============================================================================

const installmentStatusConfig: Record<
  UpcomingInstallmentStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    badgeClass: string;
  }
> = {
  paid: {
    label: 'Pago',
    icon: CheckCircle2,
    badgeClass: 'bg-green-500/10 text-green-700 border-green-200',
  },
  paid_early: {
    label: 'Antecipado',
    icon: Zap,
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-200',
  },
  pending: {
    label: 'Pendente',
    icon: Clock,
    badgeClass: 'bg-orange-500/10 text-orange-700 border-orange-200',
  },
  overdue: {
    label: 'Vencido',
    icon: AlertCircle,
    badgeClass: 'bg-red-500/10 text-red-700 border-red-200',
  },
};

// =============================================================================
// Badge Color Map
// =============================================================================

const badgeColorClasses: Record<string, string> = {
  green: 'bg-green-500/10 text-green-700 border-green-200',
  blue: 'bg-blue-500/10 text-blue-700 border-blue-200',
  purple: 'bg-purple-500/10 text-purple-700 border-purple-200',
  orange: 'bg-orange-500/10 text-orange-700 border-orange-200',
  yellow: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  red: 'bg-red-500/10 text-red-700 border-red-200',
  gray: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

// =============================================================================
// Status Icon Map
// =============================================================================

const statusIcons: Record<string, typeof CreditCard> = {
  active: CreditCard,
  overdue: AlertCircle,
  paid_off: CheckCircle2,
  settled: Handshake,
  defaulted: AlertCircle,
};

// =============================================================================
// Component
// =============================================================================

/**
 * DebtCard - Displays a single debt item with different layouts for negotiated vs pending
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

  // Fetch projection when card is expanded (lazy loading)
  // Once expanded, keep fetching to maintain cache
  const { data: projection } = useDebtProjection(
    isExpanded && debt.isNegotiated ? debt.id : undefined
  );

  // Fetch upcoming installments for the current month to get this debt's installment status
  const { data: upcomingData } = useUpcomingInstallments(currentMonth);

  // Find this debt's installment status for the current month
  const currentInstallment = upcomingData?.installments.find(
    (inst) => inst.debtId === debt.id
  );

  const statusColor = debtStatusColors[debt.status] || 'gray';
  const StatusIcon = statusIcons[debt.status] || CreditCard;
  const isPaidOff = debt.status === 'paid_off';
  const isActive = debt.status === 'active';
  const isOverdue = debt.status === 'overdue';
  const canPayInstallment = (isActive || isOverdue) && debt.isNegotiated && onPayInstallment;
  const canNegotiate = isActive && !debt.isNegotiated && onNegotiate;

  const progress = calculateDebtProgress(debt);
  const hasDetails = debt.isNegotiated && debt.totalInstallments && debt.installmentAmount;

  // Get installment status config if available
  const installmentStatus = currentInstallment
    ? installmentStatusConfig[currentInstallment.status]
    : null;
  const InstallmentStatusIcon = installmentStatus?.icon;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]')) {
      return;
    }
    if (hasDetails) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card
      className={cn(
        isPaidOff && 'opacity-75',
        hasDetails && 'cursor-pointer hover:bg-accent/50 transition-colors'
      )}
      data-testid="debt-card"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header - Always Visible */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn('rounded-lg p-2 shrink-0', `bg-${statusColor}-500/10`)}>
              <StatusIcon className={cn('h-5 w-5', `text-${statusColor}-500`)} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Name */}
              <h3
                className={cn(
                  'font-medium text-sm truncate',
                  isPaidOff && 'line-through text-muted-foreground'
                )}
                data-testid="debt-name"
              >
                {debt.name}
              </h3>

              {/* Creditor */}
              {debt.creditor && (
                <p
                  className="text-xs text-muted-foreground truncate"
                  data-testid="debt-creditor"
                >
                  {debt.creditor}
                </p>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-xs', badgeColorClasses[statusColor])}
                  data-testid="debt-status-badge"
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {debtStatusLabels[debt.status]}
                </Badge>

                {!debt.isNegotiated && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-200"
                    data-testid="debt-pending-negotiation-badge"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pendente de Negociação
                  </Badge>
                )}

                {/* Current month installment status */}
                {debt.isNegotiated && installmentStatus && InstallmentStatusIcon && (
                  <Badge
                    variant="outline"
                    className={cn('text-xs', installmentStatus.badgeClass)}
                    data-testid="debt-installment-status-badge"
                  >
                    <InstallmentStatusIcon className="h-3 w-3 mr-1" />
                    {formatMonthDisplay(currentMonth)}: {installmentStatus.label}
                  </Badge>
                )}

                {/* Summary info when collapsed */}
                {hasDetails && !isExpanded && (
                  <span className="text-xs text-muted-foreground">
                    {progress.paidInstallments}/{debt.totalInstallments} parcelas
                  </span>
                )}
              </div>

              {/* Non-negotiated Debt: Total Amount Info */}
              {!debt.isNegotiated && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Valor total da dívida pendente de negociação
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Values + Actions */}
          <div className="flex items-start gap-2 shrink-0">
            {/* Values */}
            <div className="text-right">
              <p
                className={cn(
                  'text-sm font-medium',
                  isPaidOff && 'line-through text-muted-foreground'
                )}
                data-testid="debt-total-amount"
              >
                {formatCurrency(debt.totalAmount)}
              </p>
              {debt.isNegotiated && debt.installmentAmount && (
                <p
                  className="text-xs text-muted-foreground mt-0.5"
                  data-testid="debt-installment-amount"
                >
                  {formatCurrency(debt.installmentAmount)}/mês
                </p>
              )}
              {debt.isNegotiated && (
                <p
                  className="text-xs text-green-600 mt-0.5"
                  data-testid="debt-paid-amount"
                >
                  Pago: {formatCurrency(progress.paidAmount)}
                </p>
              )}
            </div>

            {/* Expand/Collapse Indicator */}
            {hasDetails && (
              <div className="flex items-center h-8">
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </div>
            )}

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="debt-actions-trigger"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Pay Installment (only for negotiated active debts) */}
                {canPayInstallment && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onPayInstallment(debt)}
                      disabled={isPayingInstallment}
                      data-testid="debt-pay-installment-action"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Pagar Parcela {debt.currentInstallment}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Negotiate (only for non-negotiated active debts) */}
                {canNegotiate && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onNegotiate(debt)}
                      data-testid="debt-negotiate-action"
                    >
                      <Handshake className="h-4 w-4 mr-2" />
                      Negociar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={() => onEdit(debt)}
                  data-testid="debt-edit-action"
                >
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

        {/* Expandable Details - Progress and Stats */}
        {hasDetails && (
          <div
            className={cn(
              'grid transition-all duration-200 ease-in-out',
              isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-3 pt-3 border-t">
                {/* Current Month Installment Info */}
                {currentInstallment && (
                  <div
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md',
                      installmentStatus?.badgeClass
                    )}
                    data-testid="debt-current-installment-info"
                  >
                    <div className="flex items-center gap-2">
                      {InstallmentStatusIcon && (
                        <InstallmentStatusIcon className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        Parcela de {formatMonthDisplay(currentMonth)}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      {currentInstallment.status === 'paid' && currentInstallment.paidAt && (
                        <span>
                          Pago em{' '}
                          {new Date(currentInstallment.paidAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      )}
                      {currentInstallment.status === 'paid_early' && currentInstallment.paidAt && (
                        <span>
                          Pago antecipadamente em{' '}
                          {new Date(currentInstallment.paidAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                          {currentInstallment.paidInMonth && (
                            <span className="text-xs opacity-75">
                              {' '}({formatMonthDisplay(currentInstallment.paidInMonth)})
                            </span>
                          )}
                        </span>
                      )}
                      {currentInstallment.status === 'pending' && (
                        <span>Vence dia {currentInstallment.dueDay}</span>
                      )}
                      {currentInstallment.status === 'overdue' && (
                        <span>Venceu dia {currentInstallment.dueDay}</span>
                      )}
                    </div>
                  </div>
                )}

                <DebtProgressBar
                  currentInstallment={debt.currentInstallment}
                  totalInstallments={debt.totalInstallments!}
                  showLabel
                  size="md"
                />
                <DebtStats
                  progress={progress}
                  installmentAmount={debt.installmentAmount!}
                  dueDay={debt.dueDay}
                  projection={projection ?? debt.projection}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
