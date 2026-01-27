'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercentage, type CategoryBreakdown } from '../types';

// =============================================================================
// Colors for pie slices
// =============================================================================

const COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#eab308', // yellow
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#06b6d4', // cyan
];

// =============================================================================
// Props
// =============================================================================

interface ExpenseDistributionChartProps {
  data: CategoryBreakdown[];
  loading?: boolean;
  height?: number;
}

// =============================================================================
// Custom Tooltip
// =============================================================================

interface TooltipEntry {
  name: string;
  value: number;
  payload: {
    category: string;
    actual: number;
    percentage: number;
    color: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-popover border rounded-md shadow-md px-3 py-2">
      <p className="text-sm font-medium mb-1">{data.category}</p>
      <p className="text-xs text-muted-foreground">
        {formatCurrency(data.actual)}
      </p>
      <p className="text-xs text-muted-foreground">
        {formatPercentage(data.percentage)}
      </p>
    </div>
  );
}

// =============================================================================
// Custom Legend
// =============================================================================

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
}

function CustomLegend({ payload }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <ul className="flex flex-wrap justify-center gap-2 mt-2">
      {payload.map((entry, index) => (
        <li key={index} className="flex items-center gap-1 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * ExpenseDistributionChart - Pie chart showing expense distribution by category
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function ExpenseDistributionChart({
  data,
  loading = false,
  height = 300,
}: ExpenseDistributionChartProps) {
  // Calculate percentages
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const total = data.reduce((sum, item) => sum + item.actual, 0);

    return data
      .filter((item) => item.actual > 0)
      .map((item, index) => ({
        ...item,
        percentage: total > 0 ? (item.actual / total) * 100 : 0,
        color: item.color || COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.actual - a.actual);
  }, [data]);

  if (loading) {
    return (
      <Card data-testid="expense-distribution-chart-loading">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card data-testid="expense-distribution-chart-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribuição de Gastos</CardTitle>
          <CardDescription>Nenhum dado para exibir</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            Marque contas como pagas ou registre valores reais para ver a distribuição
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="expense-distribution-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribuição de Gastos</CardTitle>
        <CardDescription>
          Por categoria de despesas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={50}
              fill="#8884d8"
              dataKey="actual"
              nameKey="category"
              label={({ payload }) => {
                const entry = payload as { percentage?: number };
                const pct = entry?.percentage ?? 0;
                return pct > 5 ? `${pct.toFixed(0)}%` : '';
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="stroke-background"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
