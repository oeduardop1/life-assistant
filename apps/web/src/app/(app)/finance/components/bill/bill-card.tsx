'use client';

import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Home,
  Zap,
  Tv,
  Shield,
  Receipt,
  Check,
  X,
  Clock,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
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
  billCategoryLabels,
  getDueDateForMonth,
  type Bill,
  type BillCategory,
} from '../../types';
import { HoverCard } from './bill-animations';

// =============================================================================
// Props
// =============================================================================

interface BillCardProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onTogglePaid: (bill: Bill) => void;
  isTogglingPaid?: boolean;
}

// =============================================================================
// Category Icons
// =============================================================================

const categoryIcons: Record<BillCategory, typeof Home> = {
  housing: Home,
  utilities: Zap,
  subscription: Tv,
  insurance: Shield,
  other: Receipt,
};

const categoryBgColors: Record<BillCategory, string> = {
  housing: 'bg-blue-500/10',
  utilities: 'bg-yellow-500/10',
  subscription: 'bg-purple-500/10',
  insurance: 'bg-green-500/10',
  other: 'bg-gray-500/10',
};

const categoryTextColors: Record<BillCategory, string> = {
  housing: 'text-blue-600 dark:text-blue-400',
  utilities: 'text-yellow-600 dark:text-yellow-400',
  subscription: 'text-purple-600 dark:text-purple-400',
  insurance: 'text-green-600 dark:text-green-400',
  other: 'text-gray-600 dark:text-gray-400',
};

// =============================================================================
// Helpers
// =============================================================================

function formatDueDate(monthYear: string, dueDay: number): string {
  const dueDate = getDueDateForMonth(monthYear, dueDay);
  const [year, month, day] = dueDate.split('-');
  return `${day}/${month}/${year}`;
}

function getDaysUntilDue(monthYear: string, dueDay: number): number {
  const dueDate = getDueDateForMonth(monthYear, dueDay);
  const today = new Date();
  const due = new Date(dueDate + 'T00:00:00');

  // Reset hours for accurate day calculation
  today.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

interface UrgencyInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Clock;
}

function getUrgencyInfo(daysUntil: number, isPaid: boolean, isOverdue: boolean): UrgencyInfo | null {
  if (isPaid) return null;

  if (isOverdue || daysUntil < 0) {
    return {
      label: 'Vencida',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      icon: AlertTriangle,
    };
  }

  if (daysUntil === 0) {
    return {
      label: 'Vence hoje',
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      icon: Clock,
    };
  }

  if (daysUntil === 1) {
    return {
      label: 'Vence amanhã',
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
      icon: Clock,
    };
  }

  if (daysUntil <= 7) {
    return {
      label: `Vence em ${daysUntil} dias`,
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: Calendar,
    };
  }

  return null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * BillCard - Displays a single bill item with urgency indicators and exposed actions
 *
 * Features:
 * - Prominent category icon with background color
 * - Urgency badge for upcoming/overdue bills
 * - Exposed "Pagar" button
 * - Hover effect with scale
 * - Animated check when paid
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillCard({
  bill,
  onEdit,
  onDelete,
  onTogglePaid,
  isTogglingPaid,
}: BillCardProps) {
  const CategoryIcon = categoryIcons[bill.category] || Receipt;
  const categoryBg = categoryBgColors[bill.category] || 'bg-gray-500/10';
  const categoryText = categoryTextColors[bill.category] || 'text-gray-600';

  const isPaid = bill.status === 'paid';
  const isOverdue = bill.status === 'overdue';
  const isCanceled = bill.status === 'canceled';
  const canToggle = !isCanceled;

  const daysUntilDue = getDaysUntilDue(bill.monthYear, bill.dueDay);
  const urgencyInfo = getUrgencyInfo(daysUntilDue, isPaid, isOverdue);

  // Status-based border color
  const getStatusBorderClass = () => {
    if (isPaid) return 'border-l-emerald-500';
    if (isOverdue) return 'border-l-destructive';
    if (isCanceled) return 'border-l-muted-foreground';
    return 'border-l-amber-500'; // pending
  };

  return (
    <HoverCard>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'p-4 rounded-xl border bg-card transition-colors',
          'border-l-4',
          getStatusBorderClass(),
          isPaid && 'bg-card/50',
          isOverdue && 'bg-destructive/5'
        )}
        data-testid="bill-card"
      >
        <div className="flex items-start gap-4">
          {/* Category Icon */}
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              categoryBg,
              isPaid && 'opacity-50'
            )}
          >
            <CategoryIcon className={cn('h-6 w-6', categoryText)} />
          </div>

          {/* Info Section */}
          <div className="flex-1 min-w-0">
            {/* Name and Badges Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className={cn(
                    'font-semibold text-base truncate',
                    isPaid && 'line-through text-muted-foreground'
                  )}
                  data-testid="bill-name"
                >
                  {bill.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {billCategoryLabels[bill.category]}
                  </span>
                  {bill.isRecurring && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                      data-testid="bill-recurring-badge"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Recorrente
                    </Badge>
                  )}
                </div>
              </div>

              {/* Amount */}
              <p
                className={cn(
                  'text-lg font-semibold font-mono tabular-nums shrink-0',
                  isPaid && 'line-through text-muted-foreground'
                )}
                data-testid="bill-amount"
              >
                {formatCurrency(bill.amount)}
              </p>
            </div>

            {/* Due Date and Status Row */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                {/* Due Date */}
                <span
                  className={cn(
                    'text-sm text-muted-foreground',
                    isOverdue && 'text-destructive'
                  )}
                  data-testid="bill-due-date"
                >
                  {isPaid ? (
                    <>
                      <Check className="h-3.5 w-3.5 inline mr-1 text-emerald-500" />
                      Pago em {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString('pt-BR') : formatDueDate(bill.monthYear, bill.dueDay)}
                    </>
                  ) : (
                    <>Venc. {formatDueDate(bill.monthYear, bill.dueDay)}</>
                  )}
                </span>

                {/* Urgency Badge */}
                {urgencyInfo && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      urgencyInfo.bgColor,
                      urgencyInfo.color,
                      'border-transparent'
                    )}
                    data-testid="bill-urgency-badge"
                  >
                    <urgencyInfo.icon className="h-3 w-3 mr-1" />
                    {urgencyInfo.label}
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Pay Button - Exposed */}
                {canToggle && !isPaid && (
                  <Button
                    size="sm"
                    variant={isOverdue ? 'destructive' : 'default'}
                    onClick={() => onTogglePaid(bill)}
                    disabled={isTogglingPaid}
                    data-testid="bill-pay-button"
                    className="gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Pagar
                  </Button>
                )}

                {/* Paid indicator button to undo */}
                {isPaid && canToggle && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onTogglePaid(bill)}
                    disabled={isTogglingPaid}
                    data-testid="bill-unpay-button"
                    className="gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/10"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Pago
                  </Button>
                )}

                {/* More Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      data-testid="bill-actions-trigger"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canToggle && (
                      <>
                        <DropdownMenuItem
                          onClick={() => onTogglePaid(bill)}
                          disabled={isTogglingPaid}
                          data-testid="bill-toggle-paid-action"
                        >
                          {isPaid ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Marcar como Pendente
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como Pago
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => onEdit(bill)}
                      data-testid="bill-edit-action"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(bill)}
                      className="text-destructive focus:text-destructive"
                      data-testid="bill-delete-action"
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
      </motion.div>
    </HoverCard>
  );
}
