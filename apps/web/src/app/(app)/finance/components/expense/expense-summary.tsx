'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency, type ExpenseTotals } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface ExpenseSummaryProps {
  totals: ExpenseTotals;
  loading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseSummary - Displays expense totals with variance
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseSummary({ totals, loading }: ExpenseSummaryProps) {
  if (loading) {
    return (
      <Card data-testid="expense-summary-loading">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="text-center space-y-1">
                <Skeleton className="h-3 w-16 mx-auto" />
                <Skeleton className="h-6 w-24 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine variance direction and color
  const isOverBudget = totals.variance > 0;
  const isUnderBudget = totals.variance < 0;
  const isOnBudget = totals.variance === 0;

  const varianceColor = isOverBudget
    ? 'text-red-600'
    : isUnderBudget
    ? 'text-green-600'
    : 'text-gray-600';

  const VarianceIcon = isOverBudget
    ? TrendingUp
    : isUnderBudget
    ? TrendingDown
    : Minus;

  return (
    <Card data-testid="expense-summary">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Total Expected */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Previsto</p>
            <p
              className="text-lg font-semibold text-blue-600"
              data-testid="expense-summary-expected"
            >
              {formatCurrency(totals.totalExpected)}
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.count} {totals.count === 1 ? 'despesa' : 'despesas'}
            </p>
          </div>

          {/* Total Actual */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Real</p>
            <p
              className="text-lg font-semibold text-orange-600"
              data-testid="expense-summary-actual"
            >
              {formatCurrency(totals.totalActual)}
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.recurringCount} recorrentes, {totals.oneTimeCount} pontuais
            </p>
          </div>

          {/* Variance */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <VarianceIcon className={cn('h-3 w-3', varianceColor)} />
              <p className="text-xs text-muted-foreground">Variação</p>
            </div>
            <p
              className={cn('text-lg font-semibold', varianceColor)}
              data-testid="expense-summary-variance"
            >
              {isOverBudget && '+'}
              {formatCurrency(Math.abs(totals.variance))}
            </p>
            <p className={cn('text-xs', varianceColor)}>
              {isOnBudget
                ? 'No orçamento'
                : isOverBudget
                ? `${Math.abs(totals.variancePercent).toFixed(1)}% acima`
                : `${Math.abs(totals.variancePercent).toFixed(1)}% abaixo`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
