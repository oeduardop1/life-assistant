'use client';

import { CreditCard, TrendingUp, TrendingDown, Banknote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency, type DebtTotals } from '../../types';

// =============================================================================
// Props
// =============================================================================

interface DebtSummaryProps {
  totals: DebtTotals;
  loading?: boolean;
}

// =============================================================================
// KPI Card
// =============================================================================

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof CreditCard;
  color: string;
  bgColor: string;
  testId: string;
}

function KPICard({ title, value, subtitle, icon: Icon, color, bgColor, testId }: KPICardProps) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={cn('text-lg font-semibold mt-1', color)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className={cn('rounded-lg p-2', bgColor)}>
            <Icon className={cn('h-5 w-5', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * DebtSummary - Displays debt KPI cards
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function DebtSummary({ totals, loading }: DebtSummaryProps) {
  if (loading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        data-testid="debt-summary-loading"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total de Dívidas',
      value: formatCurrency(totals.totalAmount),
      subtitle: `${totals.totalDebts} ${totals.totalDebts === 1 ? 'dívida' : 'dívidas'} ativas`,
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      testId: 'debt-summary-total',
    },
    {
      title: 'Parcela Mensal',
      value: formatCurrency(totals.monthlyInstallmentSum),
      subtitle: `${totals.negotiatedCount} ${totals.negotiatedCount === 1 ? 'dívida negociada' : 'dívidas negociadas'}`,
      icon: Banknote,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      testId: 'debt-summary-monthly',
    },
    {
      title: 'Total Pago',
      value: formatCurrency(totals.totalPaid),
      subtitle: 'Parcelas e dívidas quitadas',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      testId: 'debt-summary-paid',
    },
    {
      title: 'Total Restante',
      value: formatCurrency(totals.totalRemaining),
      subtitle: totals.pendingNegotiationCount > 0
        ? `${totals.pendingNegotiationCount} pendente${totals.pendingNegotiationCount > 1 ? 's' : ''} de negociação`
        : 'A pagar',
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
      testId: 'debt-summary-remaining',
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      data-testid="debt-summary"
    >
      {kpis.map((kpi) => (
        <KPICard key={kpi.testId} {...kpi} />
      ))}
    </div>
  );
}
