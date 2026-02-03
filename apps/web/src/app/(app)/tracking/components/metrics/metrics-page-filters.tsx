'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PeriodFilter = '7d' | '30d' | '90d';

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
];

interface MetricsPageFiltersProps {
  period: PeriodFilter;
  onPeriodChange: (period: PeriodFilter) => void;
}

/**
 * Global period filter for the metrics page
 * Type filters are now local to each component (chart, timeline)
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function MetricsPageFilters({
  period,
  onPeriodChange,
}: MetricsPageFiltersProps) {
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
    </div>
  );
}
