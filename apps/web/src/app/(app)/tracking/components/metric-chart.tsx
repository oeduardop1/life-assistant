'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrackingEntriesFlat } from '../hooks/use-tracking';
import {
  type TrackingType,
  trackingTypeLabels,
  defaultUnits,
  trackingTypeColors,
} from '../types';

// Chart colors by type (for stroke/fill)
const chartColors: Record<TrackingType, string> = {
  weight: '#3b82f6', // blue-500
  water: '#06b6d4', // cyan-500
  sleep: '#6366f1', // indigo-500
  exercise: '#22c55e', // green-500
  mood: '#eab308', // yellow-500
  energy: '#f97316', // orange-500
  custom: '#6b7280', // gray-500
};

// Types that should use bar chart (sums) vs line chart (trends)
const barChartTypes: TrackingType[] = ['water', 'exercise'];

interface MetricChartProps {
  type: TrackingType;
  startDate?: string;
  endDate?: string;
  height?: number;
  showAverage?: boolean;
}

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  value: number;
  unit: string;
}

/**
 * MetricChart - Displays tracking data as a line or bar chart
 *
 * - Line chart for trending metrics (weight, sleep, mood, energy)
 * - Bar chart for cumulative metrics (water, exercise)
 *
 * @see docs/milestones/phase-2-tracker.md M2.1
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export function MetricChart({
  type,
  startDate,
  endDate,
  height = 250,
  showAverage = true,
}: MetricChartProps) {
  const { entries, isLoading } = useTrackingEntriesFlat({
    type,
    startDate,
    endDate,
    limit: 100,
  });

  // Process entries into chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!entries || entries.length === 0) return [];

    // Group by date for bar charts (sum), or just map for line charts
    const isBarChart = barChartTypes.includes(type);

    if (isBarChart) {
      // Aggregate by date
      const byDate = new Map<string, number>();
      for (const entry of entries) {
        const currentValue = byDate.get(entry.entryDate) ?? 0;
        byDate.set(entry.entryDate, currentValue + parseFloat(entry.value));
      }

      return Array.from(byDate.entries())
        .map(([date, value]) => ({
          date,
          dateFormatted: formatChartDate(date),
          value,
          unit: defaultUnits[type],
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Line chart - use each entry
    return entries
      .map((entry) => ({
        date: entry.entryDate,
        dateFormatted: formatChartDate(entry.entryDate),
        value: parseFloat(entry.value),
        unit: entry.unit,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, type]);

  // Calculate average for reference line
  const average = useMemo(() => {
    if (chartData.length === 0) return null;
    const sum = chartData.reduce((acc, d) => acc + d.value, 0);
    return sum / chartData.length;
  }, [chartData]);

  const isBarChart = barChartTypes.includes(type);
  const color = chartColors[type];
  const unit = defaultUnits[type];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{trackingTypeLabels[type]}</CardTitle>
          <CardDescription>Nenhum dado para exibir</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            Registre algumas entradas para ver o grafico
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${trackingTypeColors[type]}`}>
          {trackingTypeLabels[type]}
        </CardTitle>
        <CardDescription>
          {chartData.length} {chartData.length === 1 ? 'registro' : 'registros'}
          {average !== null && showAverage && (
            <> | Media: {average.toFixed(1)} {unit}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {isBarChart ? (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip unit={unit} type={type} />} />
              {showAverage && average !== null && (
                <ReferenceLine
                  y={average}
                  stroke="#888"
                  strokeDasharray="5 5"
                  label={{
                    value: `Media: ${average.toFixed(0)}`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#888',
                  }}
                />
              )}
              <Bar
                dataKey="value"
                fill={color}
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateFormatted"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={getYAxisDomain(type, chartData)}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip unit={unit} type={type} />} />
              {showAverage && average !== null && (
                <ReferenceLine
                  y={average}
                  stroke="#888"
                  strokeDasharray="5 5"
                  label={{
                    value: `Media: ${average.toFixed(1)}`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#888',
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Custom tooltip component for charts
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: ChartDataPoint }[];
  unit: string;
  type: TrackingType;
}

function CustomTooltip({ active, payload, unit, type }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  if (!data) return null;

  const value = data.value;
  const entry = data.payload;

  return (
    <div className="bg-popover border rounded-md shadow-md px-3 py-2">
      <p className="text-xs text-muted-foreground">{entry.date}</p>
      <p className={`text-sm font-medium ${trackingTypeColors[type]}`}>
        {formatValue(value, unit)}
      </p>
    </div>
  );
}

/**
 * Format date for chart axis
 */
function formatChartDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'dd/MM', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

/**
 * Format value based on unit
 */
function formatValue(value: number, unit: string): string {
  if (unit === 'kg') return `${value.toFixed(1)} ${unit}`;
  if (unit === 'ml') return `${value.toLocaleString('pt-BR')} ${unit}`;
  if (unit === 'horas' || unit === 'hours') return `${value.toFixed(1)}h`;
  if (unit === 'min') return `${value} ${unit}`;
  if (unit === 'pontos' || unit === 'score') return `${value}/10`;
  return `${value} ${unit}`;
}

/**
 * Get Y-axis domain based on type for better visualization
 */
function getYAxisDomain(
  type: TrackingType,
  data: ChartDataPoint[]
): [number | 'auto', number | 'auto'] {
  // For score-based metrics (mood, energy), use 1-10 scale
  if (type === 'mood' || type === 'energy') {
    return [0, 10];
  }

  // For sleep, use 0-12 or 0-24 based on data
  if (type === 'sleep') {
    const maxValue = Math.max(...data.map((d) => d.value));
    return [0, maxValue > 12 ? 24 : 12];
  }

  // For other metrics, let recharts auto-calculate with some padding
  if (data.length === 0) return ['auto', 'auto'];

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1;

  return [Math.max(0, min - padding), max + padding];
}

/**
 * Grid of metric charts for multiple types
 */
interface MetricChartsGridProps {
  types?: TrackingType[];
  startDate?: string;
  endDate?: string;
}

export function MetricChartsGrid({
  types = ['weight', 'water', 'sleep', 'exercise', 'mood', 'energy'],
  startDate,
  endDate,
}: MetricChartsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {types.map((type) => (
        <MetricChart
          key={type}
          type={type}
          startDate={startDate}
          endDate={endDate}
        />
      ))}
    </div>
  );
}
