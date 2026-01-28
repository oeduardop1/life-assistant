'use client';

import { PiggyBank, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type InvestmentTotals } from '../../types';
import { CircularProgress } from './investment-progress-bar';
import {
  AnimatedNumber,
  InvestmentSummarySkeleton,
  StaggerList,
  StaggerItem,
} from './investment-animations';

interface InvestmentSummaryProps {
  totals: InvestmentTotals;
  loading?: boolean;
}

/**
 * Summary section for investments with hero card and stats
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentSummary({ totals, loading }: InvestmentSummaryProps) {
  if (loading) {
    return <InvestmentSummarySkeleton />;
  }

  // Calculate average progress for circular progress
  const hasInvestmentsWithGoals = totals.totalGoalAmount > 0;

  return (
    <StaggerList className="space-y-4" data-testid="investment-summary">
      {/* Hero Card - Total Invested */}
      <StaggerItem>
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-lg p-2 bg-purple-500/10">
                <PiggyBank className="h-5 w-5 text-purple-500" />
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                Total Investido
              </span>
            </div>
            <p
              className="text-3xl font-bold font-mono tabular-nums tracking-tight"
              data-testid="investment-summary-total"
            >
              <AnimatedNumber value={totals.totalCurrentAmount} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {totals.totalInvestments} investimento{totals.totalInvestments !== 1 ? 's' : ''} ativo{totals.totalInvestments !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </StaggerItem>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Circular Progress */}
        <StaggerItem>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              {hasInvestmentsWithGoals ? (
                <CircularProgress
                  currentAmount={totals.totalCurrentAmount}
                  goalAmount={totals.totalGoalAmount}
                  size={80}
                  strokeWidth={6}
                  color="auto"
                  showCenter
                  centerLabel="progresso"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Sem metas</span>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">
                  Progresso Medio
                </p>
                <p
                  className="text-lg font-semibold font-mono tabular-nums"
                  data-testid="investment-summary-progress"
                >
                  {totals.averageProgress.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Total Goals */}
        <StaggerItem>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg p-1.5 bg-blue-500/10">
                  <Target className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Total das Metas
                </span>
              </div>
              <p
                className="text-lg font-semibold font-mono tabular-nums"
                data-testid="investment-summary-goal"
              >
                <AnimatedNumber value={totals.totalGoalAmount} />
              </p>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Monthly Contribution */}
        <StaggerItem>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-lg p-1.5 bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Aporte Mensal
                </span>
              </div>
              <p
                className="text-lg font-semibold font-mono tabular-nums"
                data-testid="investment-summary-contribution"
              >
                <AnimatedNumber value={totals.totalMonthlyContribution} />
                <span className="text-sm font-normal text-muted-foreground">/mes</span>
              </p>
            </CardContent>
          </Card>
        </StaggerItem>
      </div>
    </StaggerList>
  );
}
