'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrackingAggregation, useTrackingEntriesFlat } from '../../hooks/use-tracking';
import {
  type TrackingType,
  trackingTypeLabels,
  trackingTypeIcons,
  defaultUnits,
  formatTrackingValue,
} from '../../types';
import { metricColors } from './metric-selector';

// Chart colors (hex values for Recharts)
const chartColorHex: Record<TrackingType, string> = {
  weight: '#3b82f6',
  water: '#06b6d4',
  sleep: '#6366f1',
  exercise: '#10b981',
  mood: '#f59e0b',
  energy: '#f97316',
  custom: '#6b7280',
};

// Types that use bar chart (cumulative) vs area chart (trending)
const barChartTypes: TrackingType[] = ['water', 'exercise'];

interface MetricDetailPanelProps {
  type: TrackingType;
  startDate: string;
  endDate: string;
}

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  value: number;
}

/**
 * MetricDetailPanel - Unified view of chart + stats + consistency for a single metric
 *
 * Features:
 * - Large, prominent chart with area fill
 * - Stats sidebar with current, avg, min, max, variation
 * - Consistency bar integrated
 * - Smooth transitions when metric changes
 */
export function MetricDetailPanel({
  type,
  startDate,
  endDate,
}: MetricDetailPanelProps) {
  const { data: aggregation, isLoading: isLoadingAgg } = useTrackingAggregation({
    type,
    startDate,
    endDate,
  });

  const { entries, isLoading: isLoadingEntries } = useTrackingEntriesFlat({
    type,
    startDate,
    endDate,
    limit: 100,
  });

  // Process entries into chart data
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!entries || entries.length === 0) return [];

    const isBarChart = barChartTypes.includes(type);

    if (isBarChart) {
      // Aggregate by date for bar charts
      const byDate = new Map<string, number>();
      for (const entry of entries) {
        const current = byDate.get(entry.entryDate) ?? 0;
        byDate.set(entry.entryDate, current + parseFloat(entry.value));
      }

      return Array.from(byDate.entries())
        .map(([date, value]) => ({
          date,
          dateFormatted: formatChartDate(date),
          value,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Area chart - use each entry
    return entries
      .map((entry) => ({
        date: entry.entryDate,
        dateFormatted: formatChartDate(entry.entryDate),
        value: parseFloat(entry.value),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, type]);

  // Calculate average for reference line
  const average = useMemo(() => {
    if (chartData.length === 0) return null;
    const sum = chartData.reduce((acc, d) => acc + d.value, 0);
    return sum / chartData.length;
  }, [chartData]);

  // Calculate total days and consistency
  const totalDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const consistencyPercent = useMemo(() => {
    if (!aggregation || totalDays === 0) return 0;
    const daysWithData = Math.min(aggregation.count, totalDays);
    return Math.round((daysWithData / totalDays) * 100);
  }, [aggregation, totalDays]);

  const isLoading = isLoadingAgg || isLoadingEntries;
  const hasData = aggregation && aggregation.count > 0;
  const unit = defaultUnits[type];
  const color = chartColorHex[type];
  const colors = metricColors[type];
  const Icon = trackingTypeIcons[type];
  const isBarChart = barChartTypes.includes(type);

  if (isLoading) {
    return <MetricDetailPanelSkeleton />;
  }

  return (
    <motion.div
      key={type}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-2xl border p-6',
        'bg-gradient-to-br from-background to-muted/20',
        colors.border
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn('p-2.5 rounded-xl', colors.bg)}>
          <Icon className={cn('h-5 w-5', colors.text)} />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{trackingTypeLabels[type]}</h3>
          <p className="text-sm text-muted-foreground">
            {aggregation?.count ?? 0} registros no período
          </p>
        </div>
      </div>

      {!hasData ? (
        <EmptyState type={type} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
          {/* Chart Section */}
          <div className="min-h-[280px]">
            <ResponsiveContainer width="100%" height={280}>
              {isBarChart ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
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
                    width={45}
                    className="fill-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip unit={unit} color={color} />} />
                  {average !== null && (
                    <ReferenceLine
                      y={average}
                      stroke={color}
                      strokeDasharray="5 5"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Bar
                    dataKey="value"
                    fill={color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    fillOpacity={0.8}
                  />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
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
                    width={45}
                    domain={getYAxisDomain(type, chartData)}
                    className="fill-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip unit={unit} color={color} />} />
                  {average !== null && (
                    <ReferenceLine
                      y={average}
                      stroke={color}
                      strokeDasharray="5 5"
                      strokeOpacity={0.5}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${type})`}
                    dot={{ fill: color, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            {/* Current Value - Hero stat */}
            <div className={cn('p-4 rounded-xl', colors.bg)}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Valor Atual
              </p>
              <div className="flex items-baseline gap-2">
                <span className={cn('text-3xl font-bold', colors.text)}>
                  {formatTrackingValue(aggregation?.latestValue ?? 0, unit)}
                </span>
                {aggregation?.variation !== null && (
                  <VariationBadge value={aggregation.variation} type={type} />
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Média"
                value={aggregation?.average !== null ? formatTrackingValue(aggregation.average, unit) : '-'}
                icon={<BarChart3 className="h-3.5 w-3.5" />}
              />
              <StatCard
                label="Mínimo"
                value={aggregation?.min !== null ? formatTrackingValue(aggregation.min, unit) : '-'}
                icon={<TrendingDown className="h-3.5 w-3.5" />}
              />
              <StatCard
                label="Máximo"
                value={aggregation?.max !== null ? formatTrackingValue(aggregation.max, unit) : '-'}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
              <StatCard
                label="Registros"
                value={String(aggregation?.count ?? 0)}
                icon={<Target className="h-3.5 w-3.5" />}
              />
            </div>

            {/* Consistency Bar */}
            <div className="p-4 rounded-xl bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Consistência
                </p>
                <span className="text-sm font-semibold">
                  {consistencyPercent}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${consistencyPercent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', getConsistencyColor(consistencyPercent))}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {Math.min(aggregation?.count ?? 0, totalDays)} de {totalDays} dias
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function VariationBadge({ value, type }: { value: number; type: TrackingType }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  // For weight, negative is usually good
  const isGood = type === 'weight' ? isNegative : isPositive;
  const isBad = type === 'weight' ? isPositive : isNegative;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
        isGood && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
        isBad && 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
        !isGood && !isBad && 'bg-muted text-muted-foreground'
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : isNegative ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

function EmptyState({ type }: { type: TrackingType }) {
  const Icon = trackingTypeIcons[type];
  const colors = metricColors[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className={cn('p-4 rounded-2xl mb-4', colors.bg)}>
        <Icon className={cn('h-8 w-8', colors.text)} />
      </div>
      <p className="text-muted-foreground mb-1">
        Nenhum registro de {trackingTypeLabels[type].toLowerCase()}
      </p>
      <p className="text-sm text-muted-foreground/70">
        Adicione registros para ver estatísticas
      </p>
    </div>
  );
}

function MetricDetailPanelSkeleton() {
  return (
    <div className="rounded-2xl border p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div>
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
        <Skeleton className="h-[280px] rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tooltip
// =============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: ChartDataPoint }[];
  unit: string;
  color: string;
}

function CustomTooltip({ active, payload, unit, color }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  if (!data) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border rounded-lg shadow-lg px-3 py-2">
      <p className="text-xs text-muted-foreground">{data.payload.date}</p>
      <p className="text-sm font-semibold" style={{ color }}>
        {formatTrackingValue(data.value, unit)}
      </p>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatChartDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'dd/MM', { locale: ptBR });
  } catch {
    return dateStr;
  }
}


function getYAxisDomain(
  type: TrackingType,
  data: ChartDataPoint[]
): [number | 'auto', number | 'auto'] {
  if (type === 'mood' || type === 'energy') {
    return [0, 10];
  }
  if (type === 'sleep') {
    const maxValue = Math.max(...data.map((d) => d.value));
    return [0, maxValue > 12 ? 24 : 12];
  }
  if (data.length === 0) return ['auto', 'auto'];

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1;

  return [Math.max(0, min - padding), max + padding];
}

function getConsistencyColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500';
  if (percent >= 50) return 'bg-amber-500';
  if (percent >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}
