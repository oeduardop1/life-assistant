'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, type CategoryBreakdown } from '../types';

// =============================================================================
// Props
// =============================================================================

interface BudgetVsRealChartProps {
  data: CategoryBreakdown[];
  loading?: boolean;
  height?: number;
}

// =============================================================================
// Custom Tooltip
// =============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border rounded-md shadow-md px-3 py-2">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs" style={{ color: entry.fill }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * BudgetVsRealChart - Bar chart comparing budgeted vs actual expenses by category
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function BudgetVsRealChart({
  data,
  loading = false,
  height = 300,
}: BudgetVsRealChartProps) {
  if (loading) {
    return (
      <Card data-testid="budget-vs-real-chart-loading">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="budget-vs-real-chart-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Orçado vs Real</CardTitle>
          <CardDescription>Nenhum dado para exibir</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            Configure categorias de despesas para ver o gráfico
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="budget-vs-real-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Orçado vs Real</CardTitle>
        <CardDescription>
          Comparação por categoria de despesas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={60}
              className="fill-muted-foreground"
              tickFormatter={(value) =>
                new Intl.NumberFormat('pt-BR', {
                  notation: 'compact',
                  compactDisplay: 'short',
                }).format(value)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => (
                <span className="text-muted-foreground">{value}</span>
              )}
            />
            <Bar
              dataKey="expected"
              name="Orçado"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="actual"
              name="Real"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
