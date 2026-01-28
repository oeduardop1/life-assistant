'use client';

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Laptop,
  Gift,
  TrendingUp as TrendingUpIcon,
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
  passive: TrendingUpIcon,
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
// Status Indicator Component
// =============================================================================

interface StatusIndicatorProps {
  type: IncomeType;
  isReceived: boolean;
}

function StatusIndicator({ type, isReceived }: StatusIndicatorProps) {
  const color = incomeTypeColors[type] || 'gray';
  const colors = colorClasses[color] || colorClasses.gray;
  const Icon = typeIcons[type] || Package;

  return (
    <div
      className={cn(
        'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
        colors.bg,
        isReceived && 'ring-1 ring-emerald-500/30'
      )}
    >
      <Icon className={cn('h-5 w-5', colors.text)} />
    </div>
  );
}

// =============================================================================
// Variance Badge Component
// =============================================================================

interface VarianceBadgeProps {
  expected: number;
  actual: number;
}

function VarianceBadge({ expected, actual }: VarianceBadgeProps) {
  const variance = calculateVariance(expected, actual);

  if (variance.value === 0) return null;

  const isPositive = variance.value > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        isPositive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {isPositive ? '+' : ''}
        {variance.percentage.toFixed(1)}%
      </span>
    </motion.div>
  );
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
      <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-500">
        <CheckCircle2 className="h-4 w-4" />
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
        className="shrink-0"
      >
        Registrar Valor
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>Pendente</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * IncomeCard - Redesigned card with visual status, exposed CTA, and variance display
 *
 * Features:
 * - Visual status: received (green border) vs pending (default)
 * - Type-specific icons with color coding
 * - Exposed CTA for registering received value
 * - Variance badge when actual differs from expected
 * - Recurring indicator
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

  // Determine border color based on status
  const getBorderClass = () => {
    if (isReceived) return 'border-l-4 border-l-emerald-500';
    return `border-l-4 ${colors.border}`;
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
        'hover:bg-accent/30'
      )}
      data-testid="income-card"
    >
      {/* Main Content */}
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <StatusIndicator type={income.type} isReceived={isReceived} />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate" data-testid="income-name">
                  {income.name}
                </h3>
                {income.isRecurring && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <RefreshCw className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className={colors.text}>{incomeTypeLabels[income.type]}</span>
                <span>·</span>
                <span>{incomeFrequencyLabels[income.frequency]}</span>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="income-actions-trigger"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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

          {/* Values Row */}
          <div className="flex items-center justify-between gap-4 pt-1">
            {/* Values */}
            <div className="flex items-baseline gap-3">
              {/* Expected */}
              <div>
                <span className="text-xs text-muted-foreground mr-1">Previsto:</span>
                <span className="text-sm font-medium tabular-nums" data-testid="income-expected">
                  {formatCurrency(income.expectedAmount)}
                </span>
              </div>

              {/* Actual (if received) */}
              {isReceived && (
                <div>
                  <span className="text-xs text-muted-foreground mr-1">Real:</span>
                  <span
                    className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-500"
                    data-testid="income-actual"
                  >
                    {formatCurrency(actualAmount)}
                  </span>
                </div>
              )}

              {/* Variance Badge */}
              {hasVariance && (
                <VarianceBadge expected={income.expectedAmount} actual={actualAmount} />
              )}
            </div>

            {/* CTA */}
            <CTAButton income={income} onRegisterValue={onRegisterValue} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
