'use client';

import { PiggyBank, Target, TrendingUp, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercentage, type InvestmentTotals } from '../../types';

interface InvestmentSummaryProps {
  totals: InvestmentTotals;
  loading?: boolean;
}

/**
 * Skeleton loader for summary cards
 */
function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="investment-summary-loading">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Summary KPI cards for investments
 * Shows: Total Invested, Total Goals, Monthly Contribution, Average Progress
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentSummary({ totals, loading }: InvestmentSummaryProps) {
  if (loading) {
    return <SummarySkeleton />;
  }

  const summaryItems = [
    {
      id: 'total',
      label: 'Total Investido',
      value: formatCurrency(totals.totalCurrentAmount),
      icon: PiggyBank,
      color: 'text-purple-500 bg-purple-500/10',
      testId: 'investment-summary-total',
    },
    {
      id: 'goal',
      label: 'Total das Metas',
      value: formatCurrency(totals.totalGoalAmount),
      icon: Target,
      color: 'text-blue-500 bg-blue-500/10',
      testId: 'investment-summary-goal',
    },
    {
      id: 'contribution',
      label: 'Aporte Mensal',
      value: formatCurrency(totals.totalMonthlyContribution),
      icon: TrendingUp,
      color: 'text-green-500 bg-green-500/10',
      testId: 'investment-summary-contribution',
    },
    {
      id: 'progress',
      label: 'Progresso Médio',
      value: formatPercentage(totals.averageProgress),
      icon: Percent,
      color: 'text-orange-500 bg-orange-500/10',
      testId: 'investment-summary-progress',
    },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
      data-testid="investment-summary"
    >
      {summaryItems.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`rounded-lg p-1.5 ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p
                className="text-lg font-semibold"
                data-testid={item.testId}
              >
                {item.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
