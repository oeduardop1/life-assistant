'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTrackingAggregation } from '../../hooks/use-tracking';
import {
  trackingTypeLabels,
  defaultUnits,
  type TrackingType,
} from '../../types';

interface MetricsStatsTableProps {
  startDate: string;
  endDate: string;
}

/**
 * Statistics table showing min/max/average/variation for each metric type
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function MetricsStatsTable({
  startDate,
  endDate,
}: MetricsStatsTableProps) {
  const types: TrackingType[] = [
    'weight',
    'water',
    'sleep',
    'exercise',
    'mood',
    'energy',
  ];

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Métrica</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="text-right">Máximo</TableHead>
            <TableHead className="text-right">Média</TableHead>
            <TableHead className="text-right">Variação</TableHead>
            <TableHead className="text-right">Registros</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => (
            <MetricsStatsRow
              key={type}
              type={type}
              startDate={startDate}
              endDate={endDate}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface MetricsStatsRowProps {
  type: TrackingType;
  startDate: string;
  endDate: string;
}

function MetricsStatsRow({ type, startDate, endDate }: MetricsStatsRowProps) {
  const { data, isLoading } = useTrackingAggregation({
    type,
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <TableRow>
        <TableCell>
          <Skeleton className="h-4 w-20" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16 ml-auto" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16 ml-auto" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16 ml-auto" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16 ml-auto" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-12 ml-auto" />
        </TableCell>
      </TableRow>
    );
  }

  // Don't show rows for metrics with no data
  if (!data || data.count === 0) {
    return null;
  }

  const unit = defaultUnits[type];

  return (
    <TableRow>
      <TableCell className="font-medium">{trackingTypeLabels[type]}</TableCell>
      <TableCell className="text-right">
        {data.min !== null ? `${data.min} ${unit}` : '-'}
      </TableCell>
      <TableCell className="text-right">
        {data.max !== null ? `${data.max} ${unit}` : '-'}
      </TableCell>
      <TableCell className="text-right">
        {data.average !== null ? `${data.average.toFixed(1)} ${unit}` : '-'}
      </TableCell>
      <TableCell className="text-right">
        <VariationBadge value={data.variation} type={type} />
      </TableCell>
      <TableCell className="text-right">{data.count}</TableCell>
    </TableRow>
  );
}

interface VariationBadgeProps {
  value: number | null;
  type: TrackingType;
}

function VariationBadge({ value, type }: VariationBadgeProps) {
  if (value === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  // For weight, negative is usually good (losing weight)
  // For other metrics, positive is usually good
  const isPositive = value > 0;
  const isNegative = value < 0;

  let colorClass = 'text-muted-foreground';
  let Icon = Minus;

  if (type === 'weight') {
    // Weight: down is green, up is red
    if (isNegative) {
      colorClass = 'text-green-600';
      Icon = TrendingDown;
    } else if (isPositive) {
      colorClass = 'text-red-600';
      Icon = TrendingUp;
    }
  } else {
    // Other metrics: up is green, down is red
    if (isPositive) {
      colorClass = 'text-green-600';
      Icon = TrendingUp;
    } else if (isNegative) {
      colorClass = 'text-red-600';
      Icon = TrendingDown;
    }
  }

  const sign = isPositive ? '+' : '';

  return (
    <span className={cn('inline-flex items-center gap-1', colorClass)}>
      <Icon className="h-3.5 w-3.5" />
      {sign}
      {value.toFixed(1)}%
    </span>
  );
}

/**
 * Skeleton loader for the stats table
 */
export function MetricsStatsTableSkeleton() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Métrica</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="text-right">Máximo</TableHead>
            <TableHead className="text-right">Média</TableHead>
            <TableHead className="text-right">Variação</TableHead>
            <TableHead className="text-right">Registros</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16 ml-auto" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
