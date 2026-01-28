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
// Badge Color Map
// =============================================================================

const badgeColorClasses: Record<string, string> = {
  orange: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  yellow: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  green: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800',
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
 * ExpenseCard - Displays a single variable expense item with progress bar
 *
 * Features:
 * - Category icon in colored box
 * - Prominent recurring badge
 * - Inline progress bar
 * - Over-budget indicator with excess amount
 * - Quick update button for updating actual value
 * - Hover animation
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

  // Determine progress bar color
  const progressBarColor = isOverBudget
    ? 'bg-destructive'
    : progressPercent >= 80
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <HoverCard>
      <Card data-testid="expense-card" className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Icon + Info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Category Icon */}
              <div className={cn(
                'rounded-xl p-2.5 shrink-0',
                iconBgClasses[categoryColor]
              )}>
                <CategoryIcon className={cn('h-5 w-5', iconTextClasses[categoryColor])} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name + Over Budget Alert */}
                <div className="flex items-start gap-2">
                  <h3
                    className="font-medium text-sm truncate flex-1"
                    data-testid="expense-name"
                  >
                    {expense.name}
                  </h3>
                  {isOverBudget && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs font-medium text-destructive">
                        +{formatCurrency(variance)}
                      </span>
                    </motion.div>
                  )}
                </div>

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
                      className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
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
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                      className={cn('h-full rounded-full', progressBarColor)}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatCurrency(actualAmount)} de {formatCurrency(expectedAmount)}
                    </span>
                    <span className={cn(
                      'tabular-nums',
                      isOverBudget && 'text-destructive font-medium',
                      !isOverBudget && progressPercent >= 80 && 'text-amber-600 dark:text-amber-500',
                      !isOverBudget && progressPercent < 80 && 'text-emerald-600 dark:text-emerald-500'
                    )}>
                      {progressPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-start gap-2 shrink-0">
              {/* Quick Update Button (visible when onQuickUpdate is provided) */}
              {onQuickUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs hidden sm:flex"
                  onClick={() => onQuickUpdate(expense)}
                  data-testid="expense-quick-update"
                >
                  Atualizar
                </Button>
              )}

              {/* Actions Dropdown */}
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
        </CardContent>
      </Card>
    </HoverCard>
  );
}
