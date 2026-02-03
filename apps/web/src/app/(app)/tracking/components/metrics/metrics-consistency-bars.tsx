'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTrackingConsistency } from '../../hooks/use-tracking-consistency';
import { trackingTypeLabels, type TrackingType } from '../../types';

interface MetricsConsistencyBarsProps {
  startDate: string;
  endDate: string;
}

/**
 * Progress bars showing tracking consistency (% of days with data) for each metric type
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function MetricsConsistencyBars({
  startDate,
  endDate,
}: MetricsConsistencyBarsProps) {
  const { data, isLoading } = useTrackingConsistency({ startDate, endDate });

  if (isLoading) {
    return <MetricsConsistencyBarsSkeleton />;
  }

  // Filter to only show types that have some data
  const typesWithData = data.filter((item) => item.daysWithData > 0);

  if (typesWithData.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>Nenhum registro no período selecionado.</p>
        <p className="text-sm mt-1">
          Adicione métricas para ver sua consistência.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map(({ type, percentage, daysWithData, totalDays }) => (
        <ConsistencyBar
          key={type}
          type={type}
          percentage={percentage}
          daysWithData={daysWithData}
          totalDays={totalDays}
        />
      ))}
    </div>
  );
}

interface ConsistencyBarProps {
  type: TrackingType;
  percentage: number;
  daysWithData: number;
  totalDays: number;
}

function ConsistencyBar({
  type,
  percentage,
  daysWithData,
  totalDays,
}: ConsistencyBarProps) {
  // Determine color based on percentage
  const getProgressColor = (pct: number): string => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    if (pct >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{trackingTypeLabels[type]}</span>
        <span className="text-muted-foreground">
          {percentage}% ({daysWithData}/{totalDays} dias)
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all ${getProgressColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for consistency bars
 */
export function MetricsConsistencyBarsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}
