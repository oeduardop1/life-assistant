'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smile, Zap, Droplet, Moon, Scale } from 'lucide-react';
import type { TrackingEntry } from '../../types';

interface MetricsSectionProps {
  /** Tracking entries for the day */
  metrics: TrackingEntry[];
  /** Loading state */
  isLoading?: boolean;
  /** Whether to show read-only view */
  readOnly?: boolean;
  /** Hide the section header (when rendered externally) */
  hideHeader?: boolean;
}

const metricIcons = {
  mood: Smile,
  energy: Zap,
  water: Droplet,
  sleep: Moon,
  weight: Scale,
};

const metricLabels: Record<string, string> = {
  mood: 'Humor',
  energy: 'Energia',
  water: 'Água',
  sleep: 'Sono',
  weight: 'Peso',
};

/**
 * MetricsSection - Display/edit metrics for a specific day
 *
 * Shows sliders for mood/energy (1-10) and inputs for other metrics
 */
export function MetricsSection({
  metrics,
  isLoading = false,
  readOnly = true,
  hideHeader = false,
}: MetricsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {!hideHeader && (
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Métricas
          </h3>
        )}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Get metric values by type
  const getMetricValue = (type: string): number | null => {
    const entry = metrics.find((m) => m.type === type);
    return entry ? parseFloat(entry.value) : null;
  };

  const moodValue = getMetricValue('mood');
  const energyValue = getMetricValue('energy');
  const waterValue = getMetricValue('water');
  const sleepValue = getMetricValue('sleep');
  const weightValue = getMetricValue('weight');

  const hasAnyMetric =
    moodValue !== null ||
    energyValue !== null ||
    waterValue !== null ||
    sleepValue !== null ||
    weightValue !== null;

  if (!hasAnyMetric && readOnly) {
    return (
      <div className="space-y-3">
        {!hideHeader && (
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Métricas
          </h3>
        )}
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhuma métrica registrada para este dia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Métricas
        </h3>
      )}
      <div className="space-y-4">
        {/* Mood Slider */}
        {(moodValue !== null || !readOnly) && (
          <MetricSlider
            icon={metricIcons.mood}
            label={metricLabels.mood}
            value={moodValue}
            readOnly={readOnly}
          />
        )}

        {/* Energy Slider */}
        {(energyValue !== null || !readOnly) && (
          <MetricSlider
            icon={metricIcons.energy}
            label={metricLabels.energy}
            value={energyValue}
            readOnly={readOnly}
          />
        )}

        {/* Water Input */}
        {(waterValue !== null || !readOnly) && (
          <MetricInput
            icon={metricIcons.water}
            label={metricLabels.water}
            value={waterValue}
            unit="ml"
            readOnly={readOnly}
          />
        )}

        {/* Sleep Input */}
        {(sleepValue !== null || !readOnly) && (
          <MetricInput
            icon={metricIcons.sleep}
            label={metricLabels.sleep}
            value={sleepValue}
            unit="h"
            readOnly={readOnly}
          />
        )}

        {/* Weight Input */}
        {(weightValue !== null || !readOnly) && (
          <MetricInput
            icon={metricIcons.weight}
            label={metricLabels.weight}
            value={weightValue}
            unit="kg"
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}

interface MetricSliderProps {
  icon: typeof Smile;
  label: string;
  value: number | null;
  readOnly?: boolean;
}

function MetricSlider({ icon: Icon, label, value, readOnly }: MetricSliderProps) {
  const displayValue = value ?? 5;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </Label>
        <span className="text-sm font-medium">{displayValue}/10</span>
      </div>
      <Slider
        value={[displayValue]}
        min={1}
        max={10}
        step={1}
        disabled={readOnly}
        className={readOnly ? 'pointer-events-none' : ''}
      />
    </div>
  );
}

interface MetricInputProps {
  icon: typeof Smile;
  label: string;
  value: number | null;
  unit: string;
  readOnly?: boolean;
}

function MetricInput({
  icon: Icon,
  label,
  value,
  unit,
  readOnly,
}: MetricInputProps) {
  return (
    <div className="flex items-center gap-3">
      <Label className="flex items-center gap-2 text-sm min-w-[80px]">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value ?? ''}
          readOnly={readOnly}
          disabled={readOnly}
          className="w-24"
          placeholder="-"
        />
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
