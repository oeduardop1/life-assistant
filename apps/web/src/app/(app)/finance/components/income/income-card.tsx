'use client';

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Briefcase,
  Laptop,
  Gift,
  TrendingUp,
  PiggyBank,
  Heart,
  Package,
} from 'lucide-react';
import { motion } from 'framer-motion';
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
  incomeTypeLabels,
  incomeFrequencyLabels,
  incomeTypeColors,
  type Income,
  type IncomeType,
} from '../../types';
import { calculateVariance } from '../../hooks/use-incomes';

// =============================================================================
// Types
// =============================================================================

interface IncomeCardProps {
  income: Income;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
  onRegisterValue?: (income: Income) => void;
}

// =============================================================================
// Icon Mapping
// =============================================================================

const typeIcons: Record<IncomeType, typeof Briefcase> = {
  salary: Briefcase,
  freelance: Laptop,
  bonus: Gift,
  passive: TrendingUp,
  investment: PiggyBank,
  gift: Heart,
  other: Package,
};

// =============================================================================
// Color Classes
// =============================================================================

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-l-green-500',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-l-blue-500',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-l-purple-500',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-l-orange-500',
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-l-yellow-500',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-700 dark:text-pink-400',
    border: 'border-l-pink-500',
  },
  gray: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-700 dark:text-gray-400',
    border: 'border-l-gray-500',
  },
};

// =============================================================================
// Status Config Helper
// =============================================================================

function getStatusConfig(type: IncomeType, isReceived: boolean) {
  const color = incomeTypeColors[type] || 'gray';
  const colors = colorClasses[color] || colorClasses.gray;

  return {
    indicatorColor: isReceived ? 'bg-emerald-500' : colors.border.replace('border-l-', 'bg-'),
    iconBg: colors.bg,
    iconText: colors.text,
  };
}

// =============================================================================
// CTA Button Component
// =============================================================================

interface CTAButtonProps {
  income: Income;
  onRegisterValue?: (income: Income) => void;
}

function CTAButton({ income, onRegisterValue }: CTAButtonProps) {
  const isReceived = income.actualAmount !== null && income.actualAmount > 0;

  if (isReceived) {
    return (
      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 className="h-3 w-3" />
        <span className="font-medium">Recebido</span>
      </div>
    );
  }

  if (onRegisterValue) {
    return (
      <Button
        size="sm"
        variant="default"
        onClick={(e) => {
          e.stopPropagation();
          onRegisterValue(income);
        }}
        className="h-7 px-2.5 text-xs shrink-0"
      >
        Registrar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>Pendente</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * IncomeCard - Compact, elegant income card matching bill/expense/debt cards
 *
 * Design: Refined financial aesthetic with single-row layout
 * Layout: icon | name+meta | amount | status/actions
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeCard({
  income,
  onEdit,
  onDelete,
  onRegisterValue,
}: IncomeCardProps) {
  const typeColor = incomeTypeColors[income.type] || 'gray';
  const colors = colorClasses[typeColor] || colorClasses.gray;
  const actualAmount = income.actualAmount ?? 0;
  const isReceived = income.actualAmount !== null && income.actualAmount > 0;
  const hasVariance = isReceived && actualAmount !== income.expectedAmount;
  const variance = calculateVariance(income.expectedAmount, actualAmount);

  const Icon = typeIcons[income.type] || Package;
  const statusConfig = getStatusConfig(income.type, isReceived);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'group relative px-3 py-2.5 rounded-lg border bg-card/80 backdrop-blur-sm',
        'transition-all duration-200',
        'hover:bg-card hover:shadow-sm'
      )}
      data-testid="income-card"
    >
      {/* Status indicator line */}
      <div
        className={cn(
          'absolute left-0 top-2 bottom-2 w-0.5 rounded-full',
          statusConfig.indicatorColor
        )}
      />

      <div className="flex items-center gap-3 pl-2">
        {/* Compact Type Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            colors.bg
          )}
        >
          <Icon className={cn('h-4 w-4', colors.text)} />
        </div>

        {/* Name & Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-medium text-sm truncate"
              data-testid="income-name"
            >
              {income.name}
            </h3>
            {income.isRecurring && (
              <RefreshCw className="h-3 w-3 text-blue-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-xs', colors.text)}>
              {incomeTypeLabels[income.type]}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground">
              {incomeFrequencyLabels[income.frequency]}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          {isReceived ? (
            <div className="flex items-center gap-2">
              <p
                className="text-sm font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-500"
                data-testid="income-actual"
              >
                {formatCurrency(actualAmount)}
              </p>
              {hasVariance && variance.value !== 0 && (
                <span
                  className={cn(
                    'text-xs font-medium',
                    variance.value > 0
                      ? 'text-emerald-600 dark:text-emerald-500'
                      : 'text-red-600 dark:text-red-500'
                  )}
                >
                  {variance.value > 0 ? '+' : ''}
                  {variance.percentage.toFixed(0)}%
                </span>
              )}
            </div>
          ) : (
            <p
              className="text-sm font-medium font-mono tabular-nums text-muted-foreground"
              data-testid="income-expected"
            >
              {formatCurrency(income.expectedAmount)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <CTAButton income={income} onRegisterValue={onRegisterValue} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
                data-testid="income-actions-trigger"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => onEdit(income)}
                data-testid="income-edit-action"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(income)}
                className="text-destructive focus:text-destructive"
                data-testid="income-delete-action"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
