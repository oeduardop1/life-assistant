'use client';

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Receipt,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  billStatusLabels,
  billCategoryColors,
  billStatusColors,
  getDueDateForMonth,
  type Bill,
} from '../../types';

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
// Helper
// =============================================================================

function formatDueDate(monthYear: string, dueDay: number): string {
  const dueDate = getDueDateForMonth(monthYear, dueDay);
  const [year, month, day] = dueDate.split('-');
  return `${day}/${month}/${year}`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * BillCard - Displays a single bill item with checkbox for paid status
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
  const categoryColor = billCategoryColors[bill.category] || 'gray';
  const statusColor = billStatusColors[bill.status] || 'gray';
  const isPaid = bill.status === 'paid';
  const isOverdue = bill.status === 'overdue';
  const isCanceled = bill.status === 'canceled';
  const canToggle = !isCanceled;

  return (
    <Card
      className={cn(isPaid && 'opacity-75')}
      data-testid="bill-card"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Checkbox + Icon + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Checkbox */}
            {canToggle && (
              <Checkbox
                checked={isPaid}
                disabled={isTogglingPaid}
                onCheckedChange={() => onTogglePaid(bill)}
                className="mt-1"
                data-testid="bill-paid-checkbox"
              />
            )}

            {/* Icon */}
            <div className={cn('rounded-lg p-2 shrink-0', `bg-${categoryColor}-500/10`)}>
              <Receipt className={cn('h-5 w-5', `text-${categoryColor}-500`)} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Name */}
              <h3
                className={cn(
                  'font-medium text-sm truncate',
                  isPaid && 'line-through text-muted-foreground'
                )}
                data-testid="bill-name"
              >
                {bill.name}
              </h3>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-xs', badgeColorClasses[categoryColor])}
                  data-testid="bill-category-badge"
                >
                  {billCategoryLabels[bill.category]}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', badgeColorClasses[statusColor])}
                  data-testid="bill-status-badge"
                >
                  {isPaid && <Check className="h-3 w-3 mr-1" />}
                  {isOverdue && <X className="h-3 w-3 mr-1" />}
                  {billStatusLabels[bill.status]}
                </Badge>
                {bill.isRecurring && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-700 border-blue-200"
                    data-testid="bill-recurring-badge"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Recorrente
                  </Badge>
                )}
              </div>

              {/* Due Date */}
              <p className="text-xs text-muted-foreground mt-1" data-testid="bill-due-date">
                Vencimento: {formatDueDate(bill.monthYear, bill.dueDay)}
              </p>
            </div>
          </div>

          {/* Right: Value + Actions */}
          <div className="flex items-start gap-3 shrink-0">
            {/* Value */}
            <div className="text-right">
              <p
                className={cn(
                  'text-sm font-medium',
                  isPaid && 'line-through text-muted-foreground'
                )}
                data-testid="bill-amount"
              >
                {formatCurrency(bill.amount)}
              </p>
              {isPaid && bill.paidAt && (
                <p className="text-xs text-muted-foreground mt-1" data-testid="bill-paid-at">
                  Pago em {new Date(bill.paidAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            {/* Actions */}
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
      </CardContent>
    </Card>
  );
}
