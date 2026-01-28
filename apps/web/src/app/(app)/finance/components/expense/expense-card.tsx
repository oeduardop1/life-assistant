'use client';

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Utensils,
  Car,
  Home,
  Heart,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  Receipt,
  Tv,
  Plane,
  Gift,
  TrendingUp,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  expenseCategoryLabels,
  expenseCategoryColors,
  type Expense,
  type ExpenseCategory,
} from '../../types';
import { HoverCard } from './expense-animations';

// =============================================================================
// Props
// =============================================================================

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onQuickUpdate?: (expense: Expense) => void;
}

// =============================================================================
// Category Icon Map
// =============================================================================

const categoryIcons: Record<ExpenseCategory, typeof Utensils> = {
  food: Utensils,
  transport: Car,
  housing: Home,
  health: Heart,
  education: GraduationCap,
  entertainment: Gamepad2,
  shopping: ShoppingBag,
  bills: Receipt,
  subscriptions: Tv,
  travel: Plane,
  gifts: Gift,
  investments: TrendingUp,
  other: MoreVertical,
};

// =============================================================================
// Color Classes
// =============================================================================

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
  orange: 'text-orange-600 dark:text-orange-400',
  blue: 'text-blue-600 dark:text-blue-400',
  purple: 'text-purple-600 dark:text-purple-400',
  red: 'text-red-600 dark:text-red-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  pink: 'text-pink-600 dark:text-pink-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  gray: 'text-gray-600 dark:text-gray-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  green: 'text-green-600 dark:text-green-400',
  rose: 'text-rose-600 dark:text-rose-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  slate: 'text-slate-600 dark:text-slate-400',
};

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseCard - Compact, elegant expense card with inline progress
 *
 * Design: Refined financial aesthetic matching BillCard
 * Layout: Two-row compact design with integrated progress bar
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onQuickUpdate,
}: ExpenseCardProps) {
  const categoryColor = expenseCategoryColors[expense.category] || 'gray';
  const CategoryIcon = categoryIcons[expense.category] || MoreVertical;

  // Parse amounts (handle string values from API)
  const expectedAmount = typeof expense.expectedAmount === 'string'
    ? parseFloat(expense.expectedAmount)
    : expense.expectedAmount;
  const actualAmount = typeof expense.actualAmount === 'string'
    ? parseFloat(expense.actualAmount)
    : expense.actualAmount;

  // Calculate progress percentage
  const progressPercent = expectedAmount > 0
    ? Math.min((actualAmount / expectedAmount) * 100, 100)
    : 0;

  // Determine if over budget
  const isOverBudget = actualAmount > expectedAmount && expectedAmount > 0;
  const variance = actualAmount - expectedAmount;

  // Determine status color
  const statusColor = isOverBudget
    ? 'destructive'
    : progressPercent >= 80
    ? 'amber'
    : 'emerald';

  const progressBarColor = {
    destructive: 'bg-destructive',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  }[statusColor];

  const statusIndicatorColor = {
    destructive: 'bg-destructive',
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
  }[statusColor];

  return (
    <HoverCard>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'group relative px-3 py-2.5 rounded-lg border bg-card/80 backdrop-blur-sm',
          'transition-all duration-200',
          'hover:bg-card hover:shadow-sm',
          isOverBudget && 'border-destructive/30 bg-destructive/5'
        )}
        data-testid="expense-card"
      >
        {/* Status indicator line */}
        <div
          className={cn(
            'absolute left-0 top-2 bottom-2 w-0.5 rounded-full',
            statusIndicatorColor
          )}
        />

        <div className="pl-2 space-y-2">
          {/* Top Row: Icon + Name + Meta + Actions */}
          <div className="flex items-center gap-3">
            {/* Compact Category Icon */}
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                iconBgClasses[categoryColor]
              )}
            >
              <CategoryIcon className={cn('h-4 w-4', iconTextClasses[categoryColor])} />
            </div>

            {/* Name & Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className="font-medium text-sm truncate"
                  data-testid="expense-name"
                >
                  {expense.name}
                </h3>
                {expense.isRecurring && (
                  <RefreshCw
                    className="h-3 w-3 text-blue-500 shrink-0"
                    data-testid="expense-recurring-badge"
                  />
                )}
                {isOverBudget && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-destructive shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                    +{formatCurrency(variance)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn('text-xs', iconTextClasses[categoryColor])}
                  data-testid="expense-category-badge"
                >
                  {expenseCategoryLabels[expense.category]}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {onQuickUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs hidden sm:flex"
                  onClick={() => onQuickUpdate(expense)}
                  data-testid="expense-quick-update"
                >
                  Atualizar
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid="expense-actions-trigger"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {onQuickUpdate && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onQuickUpdate(expense)}
                        className="sm:hidden"
                        data-testid="expense-quick-update-mobile"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar Valor
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="sm:hidden" />
                    </>
                  )}
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

          {/* Bottom Row: Progress Bar with integrated amounts */}
          <div className="flex items-center gap-3">
            {/* Progress bar container */}
            <div className="flex-1 flex items-center gap-2">
              <div
                className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"
                data-testid="expense-progress"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                  className={cn('h-full rounded-full', progressBarColor)}
                />
              </div>
            </div>

            {/* Amount info - compact */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                {formatCurrency(actualAmount)}
                <span className="text-muted-foreground/50"> / </span>
                {formatCurrency(expectedAmount)}
              </span>
              <span
                className={cn(
                  'text-xs font-medium font-mono tabular-nums min-w-[3ch] text-right',
                  statusColor === 'destructive' && 'text-destructive',
                  statusColor === 'amber' && 'text-amber-600 dark:text-amber-500',
                  statusColor === 'emerald' && 'text-emerald-600 dark:text-emerald-500'
                )}
              >
                {progressPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </HoverCard>
  );
}
