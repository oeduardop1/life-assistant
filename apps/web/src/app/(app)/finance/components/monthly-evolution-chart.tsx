'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, type MonthlyDataPoint } from '../types';

// =============================================================================
// Props
// =============================================================================

interface MonthlyEvolutionChartProps {
  data: MonthlyDataPoint[];
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
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border rounded-md shadow-md px-3 py-2">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs" style={{ color: entry.color }}>
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
 * MonthlyEvolutionChart - Line chart showing income, expenses, and balance over time
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function MonthlyEvolutionChart({
  data,
  loading = false,
  height = 300,
}: MonthlyEvolutionChartProps) {
  if (loading) {
    return (
      <Card data-testid="monthly-evolution-chart-loading">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="monthly-evolution-chart-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução Mensal</CardTitle>
          <CardDescription>Nenhum dado para exibir</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            Dados insuficientes para exibir evolução
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="monthly-evolution-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução Mensal</CardTitle>
        <CardDescription>
          Renda, gastos e saldo dos últimos meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="monthLabel"
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
            <Line
              type="monotone"
              dataKey="income"
              name="Renda"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="Gastos"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
