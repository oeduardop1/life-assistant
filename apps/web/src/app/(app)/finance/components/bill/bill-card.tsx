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
  getDaysUntilDue,
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
  /** Today's date in YYYY-MM-DD format (from timezone-aware helper) */
  today: string;
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
 * BillCard - Compact, elegant bill card with clear visual hierarchy
 *
 * Design: Refined financial aesthetic - information-dense but clean
 * Layout: Single row with icon | info | amount | actions
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillCard({
  bill,
  onEdit,
  onDelete,
  onTogglePaid,
  isTogglingPaid,
  today,
}: BillCardProps) {
  const CategoryIcon = categoryIcons[bill.category] || Receipt;
  const categoryBg = categoryBgColors[bill.category] || 'bg-gray-500/10';
  const categoryText = categoryTextColors[bill.category] || 'text-gray-600';

  const isPaid = bill.status === 'paid';
  const isOverdue = bill.status === 'overdue';
  const isCanceled = bill.status === 'canceled';
  const canToggle = !isCanceled;

  const daysUntilDue = getDaysUntilDue(bill.monthYear, bill.dueDay, today);
  const urgencyInfo = getUrgencyInfo(daysUntilDue, isPaid, isOverdue);

  return (
    <HoverCard>
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
          isPaid && 'opacity-60 hover:opacity-80',
          isOverdue && 'border-destructive/30 bg-destructive/5'
        )}
        data-testid="bill-card"
      >
        {/* Status indicator line */}
        <div
          className={cn(
            'absolute left-0 top-2 bottom-2 w-0.5 rounded-full',
            isPaid && 'bg-emerald-500',
            isOverdue && 'bg-destructive',
            !isPaid && !isOverdue && 'bg-amber-500'
          )}
        />

        <div className="flex items-center gap-3 pl-2">
          {/* Compact Category Icon */}
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
              categoryBg
            )}
          >
            <CategoryIcon className={cn('h-4 w-4', categoryText)} />
          </div>

          {/* Main Info - Name & Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  'font-medium text-sm truncate',
                  isPaid && 'line-through text-muted-foreground'
                )}
                data-testid="bill-name"
              >
                {bill.name}
              </h3>
              {bill.isRecurring && (
                <RefreshCw
                  className="h-3 w-3 text-blue-500 shrink-0"
                  data-testid="bill-recurring-badge"
                />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {billCategoryLabels[bill.category]}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span
                className={cn(
                  'text-xs',
                  isPaid && 'text-emerald-600 dark:text-emerald-400',
                  isOverdue && 'text-destructive',
                  !isPaid && !isOverdue && 'text-muted-foreground'
                )}
                data-testid="bill-due-date"
              >
                {isPaid
                  ? `Pago ${bill.paidAt ? new Date(bill.paidAt).toLocaleDateString('pt-BR') : ''}`
                  : formatDueDate(bill.monthYear, bill.dueDay)}
              </span>
              {urgencyInfo && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span
                    className={cn('text-xs font-medium', urgencyInfo.color)}
                    data-testid="bill-urgency-badge"
                  >
                    {urgencyInfo.label}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Amount */}
          <p
            className={cn(
              'text-sm font-semibold font-mono tabular-nums shrink-0',
              isPaid && 'line-through text-muted-foreground'
            )}
            data-testid="bill-amount"
          >
            {formatCurrency(bill.amount)}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Pay Button */}
            {canToggle && !isPaid && (
              <Button
                size="sm"
                variant={isOverdue ? 'destructive' : 'default'}
                onClick={() => onTogglePaid(bill)}
                disabled={isTogglingPaid}
                data-testid="bill-pay-button"
                className="h-7 px-2.5 text-xs gap-1"
              >
                <Check className="h-3 w-3" />
                Pagar
              </Button>
            )}

            {/* Paid Badge */}
            {isPaid && (
              <Badge
                variant="outline"
                className="h-7 gap-1 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-500/10"
                data-testid="bill-paid-badge"
              >
                <Check className="h-3 w-3" />
                Pago
              </Badge>
            )}

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid="bill-actions-trigger"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canToggle && isPaid && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onTogglePaid(bill)}
                      disabled={isTogglingPaid}
                      data-testid="bill-toggle-paid-action"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Marcar Pendente
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
      </motion.div>
    </HoverCard>
  );
}
