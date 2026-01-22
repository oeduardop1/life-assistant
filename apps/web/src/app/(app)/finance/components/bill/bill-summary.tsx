'use client';

import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency, type BillTotals } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface BillSummaryProps {
  totals: BillTotals;
  loading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * BillSummary - Displays bill totals with status breakdown
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BillSummary({ totals, loading }: BillSummaryProps) {
  if (loading) {
    return (
      <Card data-testid="bill-summary-loading">
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

  const pendingAmount = totals.pending + totals.overdue;
  const pendingCount = totals.pendingCount + totals.overdueCount;

  return (
    <Card data-testid="bill-summary">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Total */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total de Contas</p>
            <p
              className="text-lg font-semibold text-blue-600"
              data-testid="bill-summary-total"
            >
              {formatCurrency(totals.total)}
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.count} {totals.count === 1 ? 'conta' : 'contas'}
            </p>
          </div>

          {/* Paid */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <p className="text-xs text-muted-foreground">Pagas</p>
            </div>
            <p
              className="text-lg font-semibold text-green-600"
              data-testid="bill-summary-paid"
            >
              {formatCurrency(totals.paid)}
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.paidCount} {totals.paidCount === 1 ? 'conta' : 'contas'}
            </p>
          </div>

          {/* Pending + Overdue */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {totals.overdueCount > 0 ? (
                <AlertTriangle className="h-3 w-3 text-red-600" />
              ) : (
                <Clock className="h-3 w-3 text-orange-600" />
              )}
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <p
              className={cn(
                'text-lg font-semibold',
                totals.overdueCount > 0 ? 'text-red-600' : 'text-orange-600'
              )}
              data-testid="bill-summary-pending"
            >
              {formatCurrency(pendingAmount)}
            </p>
            <p
              className={cn(
                'text-xs',
                totals.overdueCount > 0 ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {pendingCount} {pendingCount === 1 ? 'conta' : 'contas'}
              {totals.overdueCount > 0 && (
                <span data-testid="bill-summary-overdue-count">
                  {' '}({totals.overdueCount} {totals.overdueCount === 1 ? 'vencida' : 'vencidas'})
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
