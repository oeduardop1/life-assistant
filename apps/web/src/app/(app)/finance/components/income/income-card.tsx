'use client';

import { MoreHorizontal, Pencil, Trash2, RefreshCw, Briefcase } from 'lucide-react';
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
  incomeTypeLabels,
  incomeFrequencyLabels,
  incomeTypeColors,
  type Income,
} from '../../types';
import { calculateVariance } from '../../hooks/use-incomes';

// =============================================================================
// Props
// =============================================================================

interface IncomeCardProps {
  income: Income;
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
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
  pink: 'bg-pink-500/10 text-pink-700 border-pink-200',
  gray: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

// =============================================================================
// Component
// =============================================================================

/**
 * IncomeCard - Displays a single income item
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeCard({ income, onEdit, onDelete }: IncomeCardProps) {
  const typeColor = incomeTypeColors[income.type] || 'gray';
  const actualAmount = income.actualAmount ?? 0;
  const variance = calculateVariance(income.expectedAmount, actualAmount);
  const hasActual = income.actualAmount !== null;

  return (
    <Card data-testid="income-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn('rounded-lg p-2 shrink-0', `bg-${typeColor}-500/10`)}>
              <Briefcase className={cn('h-5 w-5', `text-${typeColor}-500`)} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Name */}
              <h3 className="font-medium text-sm truncate" data-testid="income-name">
                {income.name}
              </h3>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-xs', badgeColorClasses[typeColor])}
                  data-testid="income-type-badge"
                >
                  {incomeTypeLabels[income.type]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {incomeFrequencyLabels[income.frequency]}
                </span>
                {income.isRecurring && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-700 border-blue-200"
                    data-testid="income-recurring-badge"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Recorrente
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Right: Values + Actions */}
          <div className="flex items-start gap-3 shrink-0">
            {/* Values */}
            <div className="text-right">
              {/* Expected */}
              <p className="text-xs text-muted-foreground">Previsto</p>
              <p className="text-sm font-medium" data-testid="income-expected">
                {formatCurrency(income.expectedAmount)}
              </p>

              {/* Actual (if exists) */}
              {hasActual && (
                <>
                  <p className="text-xs text-muted-foreground mt-1">Real</p>
                  <p className="text-sm font-medium" data-testid="income-actual">
                    {formatCurrency(actualAmount)}
                  </p>
                </>
              )}

              {/* Variance (if has actual) */}
              {hasActual && (
                <p
                  className={cn(
                    'text-xs mt-1',
                    variance.value >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                  data-testid="income-variance"
                >
                  {variance.value >= 0 ? '+' : ''}
                  {variance.percentage.toFixed(1)}%
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
        </div>
      </CardContent>
    </Card>
  );
}
