'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanceContext } from './context/finance-context';
import { useFinanceSummary, useHasFinanceData, useMonthlyEvolution } from './hooks/use-finance';
import { FinanceKPICard, FinanceKPICardsGrid } from './components/finance-kpi-card';
import { BudgetVsRealChart } from './components/budget-vs-real-chart';
import { ExpenseDistributionChart } from './components/expense-distribution-chart';
import { MonthlyEvolutionChart } from './components/monthly-evolution-chart';
import {
  formatCurrency,
  getBalanceColor,
  type CategoryBreakdown,
  type MonthlyDataPoint,
} from './types';

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhum dado financeiro</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Comece configurando suas rendas, contas e despesas para ver o resumo financeiro.
      </p>
      <Button asChild>
        <a href="/finance/incomes">Configurar Rendas</a>
      </Button>
    </div>
  );
}

// =============================================================================
// Error State
// =============================================================================

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
      <p className="text-muted-foreground mb-4">
        Não foi possível carregar o resumo financeiro.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar novamente
      </Button>
    </div>
  );
}

// =============================================================================
// KPI Cards Section
// =============================================================================

interface KPICardsSectionProps {
  loading: boolean;
  totalIncomeActual: number;
  totalBudgeted: number;
  totalSpent: number;
  balance: number;
  totalInvested: number;
  totalDebts: number;
  /** Previous month's balance for trend calculation */
  previousBalance?: number;
}

/**
 * Calculate trend based on balance comparison
 */
function getBalanceTrend(balance: number, previousBalance?: number): { value: number; direction: 'up' | 'down' | 'neutral' } | undefined {
  if (previousBalance === undefined || previousBalance === 0) {
    return undefined;
  }

  const diff = balance - previousBalance;
  const percentChange = (diff / Math.abs(previousBalance)) * 100;

  if (Math.abs(percentChange) < 0.5) {
    return { value: 0, direction: 'neutral' };
  }

  return {
    value: Math.abs(percentChange),
    direction: diff > 0 ? 'up' : 'down',
  };
}

function KPICardsSection({
  loading,
  totalIncomeActual,
  totalBudgeted,
  totalSpent,
  balance,
  totalInvested,
  totalDebts,
  previousBalance,
}: KPICardsSectionProps) {
  const balanceColor = getBalanceColor(balance);
  const balanceTrend = getBalanceTrend(balance, previousBalance);

  return (
    <FinanceKPICardsGrid>
      <FinanceKPICard
        title="Renda do Mês"
        value={totalIncomeActual}
        icon="TrendingUp"
        color="green"
        loading={loading}
      />
      <FinanceKPICard
        title="Total Orçado"
        value={totalBudgeted}
        icon="Target"
        color="blue"
        loading={loading}
      />
      <FinanceKPICard
        title="Total Gasto"
        value={totalSpent}
        icon="ShoppingCart"
        color="orange"
        loading={loading}
      />
      <FinanceKPICard
        title="Saldo"
        value={balance}
        icon="Wallet"
        color={balanceColor}
        trend={balanceTrend}
        loading={loading}
      />
      <FinanceKPICard
        title="Total Investido"
        value={totalInvested}
        icon="PiggyBank"
        color="purple"
        loading={loading}
      />
      <FinanceKPICard
        title="Total em Dívidas"
        value={totalDebts}
        icon="CreditCard"
        color="red"
        loading={loading}
      />
    </FinanceKPICardsGrid>
  );
}

// =============================================================================
// Charts Section
// =============================================================================

interface ChartsSectionProps {
  loading: boolean;
  categoryBreakdown: CategoryBreakdown[];
  monthlyEvolution: MonthlyDataPoint[];
}

function ChartsSection({
  loading,
  categoryBreakdown,
  monthlyEvolution,
}: ChartsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BudgetVsRealChart data={categoryBreakdown} loading={loading} />
      <ExpenseDistributionChart data={categoryBreakdown} loading={loading} />
      <div className="md:col-span-2">
        <MonthlyEvolutionChart data={monthlyEvolution} loading={loading} />
      </div>
    </div>
  );
}

// =============================================================================
// Summary Lists Section
// =============================================================================

interface SummaryListsSectionProps {
  billsCount: {
    pending: number;
    overdue: number;
  };
  totalBills: number;
  monthlyInstallment: number;
  debtsCount: number;
}

function SummaryListsSection({
  billsCount,
  totalBills,
  monthlyInstallment,
  debtsCount,
}: SummaryListsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contas Pendentes</CardTitle>
          <CardDescription>
            {billsCount.pending + billsCount.overdue} contas pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billsCount.pending + billsCount.overdue === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta pendente
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pendentes</span>
                <span>{billsCount.pending}</span>
              </div>
              {billsCount.overdue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">Atrasadas</span>
                  <span className="text-red-500">{billsCount.overdue}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-medium pt-2 border-t">
                <span>Total a Pagar</span>
                <span>{formatCurrency(totalBills)}</span>
              </div>
            </div>
          )}
          <Button variant="link" className="px-0 mt-2" asChild>
            <a href="/finance/bills">Ver todas as contas →</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Parcelas Próximas</CardTitle>
          <CardDescription>
            {debtsCount} dívidas com parcelas ativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {debtsCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma parcela próxima
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dívidas ativas</span>
                <span>{debtsCount}</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-2 border-t">
                <span>Total Mensal</span>
                <span>{formatCurrency(monthlyInstallment)}</span>
              </div>
            </div>
          )}
          <Button variant="link" className="px-0 mt-2" asChild>
            <a href="/finance/debts">Ver todas as dívidas →</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

/**
 * Finance Dashboard Page
 *
 * Displays financial KPIs, charts, and summary lists.
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export default function FinanceDashboardPage() {
  const { currentMonth } = useFinanceContext();
  const { data: summary, isLoading, isError, refetch } = useFinanceSummary(currentMonth);
  const { hasData } = useHasFinanceData(currentMonth);
  const { data: evolutionData, isLoading: isEvolutionLoading } = useMonthlyEvolution(currentMonth, 6);

  const categoryBreakdown: CategoryBreakdown[] = summary
    ? [
        { category: 'Contas Fixas', expected: summary.totalBills, actual: summary.paidBillsAmount, color: '#3b82f6' },
        { category: 'Despesas Variáveis', expected: summary.totalExpensesExpected, actual: summary.totalExpensesActual, color: '#22c55e' },
        { category: 'Dívidas', expected: summary.debts.monthlyInstallmentSum, actual: summary.debtPaymentsThisMonth, color: '#f97316' },
      ]
    : [];

  const monthlyEvolution: MonthlyDataPoint[] = evolutionData?.data ?? [];

  // Get previous month's balance from evolution data for trend calculation
  const previousMonthData = monthlyEvolution.length >= 2
    ? monthlyEvolution[monthlyEvolution.length - 2]
    : undefined;
  const previousBalance = previousMonthData?.balance;

  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (!isLoading && !hasData) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6" data-testid="finance-dashboard">
      {/* KPI Cards */}
      <KPICardsSection
        loading={isLoading}
        totalIncomeActual={summary?.totalIncomeActual ?? 0}
        totalBudgeted={summary?.totalBudgeted ?? 0}
        totalSpent={summary?.totalSpent ?? 0}
        balance={summary?.balance ?? 0}
        totalInvested={summary?.investments.totalCurrentAmount ?? 0}
        totalDebts={summary?.debts.totalRemaining ?? 0}
        previousBalance={previousBalance}
      />

      {/* Charts */}
      <ChartsSection
        loading={isLoading || isEvolutionLoading}
        categoryBreakdown={categoryBreakdown}
        monthlyEvolution={monthlyEvolution}
      />

      {/* Summary Lists */}
      {summary && (
        <SummaryListsSection
          billsCount={{
            pending: summary.billsCount.pending,
            overdue: summary.billsCount.overdue,
          }}
          totalBills={summary.totalBills - summary.paidBillsAmount}
          monthlyInstallment={summary.debts.monthlyInstallmentSum}
          debtsCount={summary.debts.negotiatedCount}
        />
      )}
    </div>
  );
}
