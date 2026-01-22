'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';
import { calculateVariance } from '../../hooks/use-incomes';

// =============================================================================
// Props
// =============================================================================

interface IncomeSummaryProps {
  totalExpected: number;
  totalActual: number;
  count: number;
  loading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * IncomeSummary - Displays income totals with variance
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function IncomeSummary({
  totalExpected,
  totalActual,
  count,
  loading,
}: IncomeSummaryProps) {
  if (loading) {
    return (
      <Card data-testid="income-summary-loading">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="text-center space-y-1">
                <Skeleton className="h-3 w-16 mx-auto" />
                <Skeleton className="h-6 w-24 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const variance = calculateVariance(totalExpected, totalActual);
  const hasVariance = totalExpected > 0 || totalActual > 0;

  return (
    <Card data-testid="income-summary">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Total Expected */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Previsto</p>
            <p
              className="text-lg font-semibold text-blue-600"
              data-testid="income-summary-expected"
            >
              {formatCurrency(totalExpected)}
            </p>
            <p className="text-xs text-muted-foreground">
              {count} {count === 1 ? 'renda' : 'rendas'}
            </p>
          </div>

          {/* Total Actual */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Real</p>
            <p
              className="text-lg font-semibold text-green-600"
              data-testid="income-summary-actual"
            >
              {formatCurrency(totalActual)}
            </p>
          </div>

          {/* Variance */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Variação</p>
            <div className="flex items-center justify-center gap-1">
              {hasVariance && variance.value > 0 && (
                <TrendingUp className="h-4 w-4 text-green-600" />
              )}
              {hasVariance && variance.value < 0 && (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              {hasVariance && variance.value === 0 && (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <p
                className={cn(
                  'text-lg font-semibold',
                  variance.value > 0 && 'text-green-600',
                  variance.value < 0 && 'text-red-600',
                  variance.value === 0 && 'text-muted-foreground'
                )}
                data-testid="income-summary-variance"
              >
                {variance.value >= 0 ? '+' : ''}
                {formatCurrency(variance.value)}
              </p>
            </div>
            {hasVariance && (
              <p
                className={cn(
                  'text-xs',
                  variance.percentage > 0 && 'text-green-600',
                  variance.percentage < 0 && 'text-red-600',
                  variance.percentage === 0 && 'text-muted-foreground'
                )}
                data-testid="income-summary-variance-percentage"
              >
                ({variance.percentage >= 0 ? '+' : ''}
                {variance.percentage.toFixed(1)}%)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
