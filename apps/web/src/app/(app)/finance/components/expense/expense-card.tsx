'use client';

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  expenseCategoryLabels,
  expenseCategoryColors,
  type Expense,
} from '../../types';

// =============================================================================
// Props
// =============================================================================

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

// =============================================================================
// Badge Color Map
// =============================================================================

const badgeColorClasses: Record<string, string> = {
  orange: 'bg-orange-500/10 text-orange-700 border-orange-200',
  blue: 'bg-blue-500/10 text-blue-700 border-blue-200',
  purple: 'bg-purple-500/10 text-purple-700 border-purple-200',
  red: 'bg-red-500/10 text-red-700 border-red-200',
  indigo: 'bg-indigo-500/10 text-indigo-700 border-indigo-200',
  pink: 'bg-pink-500/10 text-pink-700 border-pink-200',
  yellow: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  gray: 'bg-gray-500/10 text-gray-700 border-gray-200',
  cyan: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  green: 'bg-green-500/10 text-green-700 border-green-200',
  rose: 'bg-rose-500/10 text-rose-700 border-rose-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  slate: 'bg-slate-500/10 text-slate-700 border-slate-200',
};

const iconBgClasses: Record<string, string> = {
  orange: 'bg-orange-500/10',
  blue: 'bg-blue-500/10',
  purple: 'bg-purple-500/10',
  red: 'bg-red-500/10',
  indigo: 'bg-indigo-500/10',
  pink: 'bg-pink-500/10',
  yellow: 'bg-yellow-500/10',
  gray: 'bg-gray-500/10',
  cyan: 'bg-cyan-500/10',
  green: 'bg-green-500/10',
  rose: 'bg-rose-500/10',
  emerald: 'bg-emerald-500/10',
  slate: 'bg-slate-500/10',
};

const iconTextClasses: Record<string, string> = {
  orange: 'text-orange-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  red: 'text-red-500',
  indigo: 'text-indigo-500',
  pink: 'text-pink-500',
  yellow: 'text-yellow-500',
  gray: 'text-gray-500',
  cyan: 'text-cyan-500',
  green: 'text-green-500',
  rose: 'text-rose-500',
  emerald: 'text-emerald-500',
  slate: 'text-slate-500',
};

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseCard - Displays a single variable expense item with progress bar
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  const categoryColor = expenseCategoryColors[expense.category] || 'gray';

  // Calculate progress percentage
  const progressPercent = expense.expectedAmount > 0
    ? Math.min((expense.actualAmount / expense.expectedAmount) * 100, 100)
    : 0;

  // Determine if over budget
  const isOverBudget = expense.actualAmount > expense.expectedAmount && expense.expectedAmount > 0;
  const variance = expense.actualAmount - expense.expectedAmount;

  return (
    <Card data-testid="expense-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn('rounded-lg p-2 shrink-0', iconBgClasses[categoryColor])}>
              <Wallet className={cn('h-5 w-5', iconTextClasses[categoryColor])} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Name */}
              <h3
                className="font-medium text-sm truncate"
                data-testid="expense-name"
              >
                {expense.name}
              </h3>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-xs', badgeColorClasses[categoryColor])}
                  data-testid="expense-category-badge"
                >
                  {expenseCategoryLabels[expense.category]}
                </Badge>
                {expense.isRecurring && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-700 border-blue-200"
                    data-testid="expense-recurring-badge"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Recorrente
                  </Badge>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-3 space-y-1">
                <div
                  className="h-2 w-full bg-muted rounded-full overflow-hidden"
                  data-testid="expense-progress"
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isOverBudget ? 'bg-red-500' : 'bg-primary'
                    )}
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {formatCurrency(expense.actualAmount)} de {formatCurrency(expense.expectedAmount)}
                  </span>
                  <span className={cn(isOverBudget && 'text-red-600 font-medium')}>
                    {progressPercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Values + Actions */}
          <div className="flex items-start gap-3 shrink-0">
            {/* Values */}
            <div className="text-right">
              <p
                className="text-sm font-medium"
                data-testid="expense-actual-amount"
              >
                {formatCurrency(expense.actualAmount)}
              </p>
              {isOverBudget && (
                <p
                  className="text-xs text-red-600 font-medium"
                  data-testid="expense-over-budget"
                >
                  +{formatCurrency(variance)}
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
                  data-testid="expense-actions-trigger"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onEdit(expense)}
                  data-testid="expense-edit-action"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(expense)}
                  className="text-destructive focus:text-destructive"
                  data-testid="expense-delete-action"
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
