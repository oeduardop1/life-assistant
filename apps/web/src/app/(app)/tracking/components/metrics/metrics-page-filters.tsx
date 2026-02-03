'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { trackingTypeLabels, type TrackingType } from '../../types';

export type PeriodFilter = '7d' | '30d' | '90d';

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
];

interface MetricsPageFiltersProps {
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
  selectedType: TrackingType | 'all';
  onTypeChange: (type: TrackingType | 'all') => void;
}

/**
 * Filters for the metrics page
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function MetricsPageFilters({
  period,
  onPeriodChange,
  selectedType,
  onTypeChange,
}: MetricsPageFiltersProps) {
  const trackingTypes: TrackingType[] = [
    'weight',
    'water',
    'sleep',
    'exercise',
    'mood',
    'energy',
  ];

  return (
    <div className="flex items-center gap-3">
      {/* Period filter - button group */}
      <div className="flex rounded-lg border p-1">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            onClick={() => onPeriodChange(option.value)}
            className={cn(
              'h-7 px-3 text-xs',
              period === option.value &&
                'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Type filter - select dropdown */}
      <Select
        value={selectedType}
        onValueChange={(value) => onTypeChange(value as TrackingType | 'all')}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Todos os tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {trackingTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {trackingTypeLabels[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
