'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrackingAggregation } from '../hooks/use-tracking';
import {
  type TrackingType,
  trackingTypeLabels,
  trackingTypeIcons,
  trackingTypeColors,
  defaultUnits,
  formatTrackingValue,
  formatVariation,
  getVariationColor,
} from '../types';

interface MetricCardProps {
  type: TrackingType;
  startDate?: string;
  endDate?: string;
}

/**
 * Metric card showing aggregated data for a tracking type
 *
 * @see docs/milestones/phase-2-tracker.md M2.1
 */
export function MetricCard({ type, startDate, endDate }: MetricCardProps) {
  const { data: aggregation, isLoading } = useTrackingAggregation({ type, startDate, endDate });

  const unit = defaultUnits[type];
  const variationColor = getVariationColor(aggregation?.variation ?? null, type);
  const Icon = trackingTypeIcons[type];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const hasData = aggregation && aggregation.count > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {trackingTypeLabels[type]}
          </CardTitle>
          <div className={trackingTypeColors[type]}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {formatTrackingValue(aggregation.latestValue ?? 0, unit)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {aggregation.variation !== null && (
                <>
                  {aggregation.variation > 0 ? (
                    <TrendingUp className={`h-4 w-4 ${variationColor}`} />
                  ) : aggregation.variation < 0 ? (
                    <TrendingDown className={`h-4 w-4 ${variationColor}`} />
                  ) : (
                    <Minus className="h-4 w-4 text-gray-500" />
                  )}
                  <span className={`text-sm ${variationColor}`}>
                    {formatVariation(aggregation.variation)}
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">
                Media: {aggregation.average?.toFixed(1) ?? '-'} {unit}
              </span>
            </div>
            <CardDescription className="mt-2">
              {aggregation.count} {aggregation.count === 1 ? 'registro' : 'registros'} (7 dias)
            </CardDescription>
          </>
        ) : (
          <div className="py-2">
            <span className="text-2xl font-bold text-muted-foreground">--</span>
            <CardDescription className="mt-1">
              Nenhum registro
            </CardDescription>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Grid of metric cards for all tracking types
 */
export function MetricCardsGrid() {
  const types: TrackingType[] = ['weight', 'water', 'sleep', 'exercise', 'mood', 'energy'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {types.map((type) => (
        <MetricCard key={type} type={type} />
      ))}
    </div>
  );
}
