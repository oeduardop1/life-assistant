'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Scale, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WaterBar, SleepBar } from './metric-bar';
import { staggerContainer, staggerItem, noAnimation } from './animations';
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

/**
 * MetricsSection - Display metrics for a specific day
 *
 * Features:
 * - Mood/Energy sliders with emoji endpoints
 * - Water/Sleep as visual bars
 * - Weight display
 * - Staggered entrance animation
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md for metrics tracking
 */
export function MetricsSection({
  metrics,
  isLoading = false,
  readOnly = true,
  hideHeader = false,
}: MetricsSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {!hideHeader && <SectionHeader title="Métricas" />}
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
        {!hideHeader && <SectionHeader title="Métricas" />}
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!hideHeader && <SectionHeader title="Métricas" />}

      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="visible"
        variants={prefersReducedMotion ? noAnimation : staggerContainer}
      >
        {/* Mood Slider with emojis */}
        {(moodValue !== null || !readOnly) && (
          <motion.div variants={prefersReducedMotion ? noAnimation : staggerItem}>
            <EmojiSlider
              label="Humor"
              value={moodValue}
              minEmoji="😔"
              maxEmoji="😊"
              readOnly={readOnly}
              colorClass="bg-yellow-500"
            />
          </motion.div>
        )}

        {/* Energy Slider with emojis */}
        {(energyValue !== null || !readOnly) && (
          <motion.div variants={prefersReducedMotion ? noAnimation : staggerItem}>
            <EmojiSlider
              label="Energia"
              value={energyValue}
              minEmoji="😴"
              maxEmoji="⚡"
              readOnly={readOnly}
              colorClass="bg-orange-500"
            />
          </motion.div>
        )}

        {/* Water Bar */}
        {(waterValue !== null || !readOnly) && (
          <motion.div variants={prefersReducedMotion ? noAnimation : staggerItem}>
            <WaterBar value={waterValue ?? 0} goal={2000} />
          </motion.div>
        )}

        {/* Sleep Bar */}
        {(sleepValue !== null || !readOnly) && (
          <motion.div variants={prefersReducedMotion ? noAnimation : staggerItem}>
            <SleepBar value={sleepValue ?? 0} goal={8} />
          </motion.div>
        )}

        {/* Weight Display */}
        {(weightValue !== null || !readOnly) && (
          <motion.div variants={prefersReducedMotion ? noAnimation : staggerItem}>
            <WeightDisplay value={weightValue} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h3 className="text-sm font-semibold text-journal-ink">{title}</h3>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-journal-border py-6">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-journal-ink-soft">
        Nenhuma métrica registrada
      </p>
    </div>
  );
}

interface EmojiSliderProps {
  label: string;
  value: number | null;
  minEmoji: string;
  maxEmoji: string;
  readOnly?: boolean;
  colorClass?: string;
}

function EmojiSlider({
  label,
  value,
  minEmoji,
  maxEmoji,
  readOnly = true,
  colorClass = 'bg-primary',
}: EmojiSliderProps) {
  const displayValue = value ?? 5;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-journal-ink">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-journal-ink">
          {displayValue}/10
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Min emoji */}
        <span className="text-lg" aria-hidden="true">
          {minEmoji}
        </span>

        {/* Slider */}
        <div className="relative flex-1">
          <Slider
            value={[displayValue]}
            min={1}
            max={10}
            step={1}
            disabled={readOnly}
            className={cn(readOnly && 'pointer-events-none')}
          />
          {/* Color overlay for filled portion */}
          <div
            className={cn(
              'absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full pointer-events-none',
              colorClass,
              'opacity-30'
            )}
            style={{ width: `${((displayValue - 1) / 9) * 100}%` }}
          />
        </div>

        {/* Max emoji */}
        <span className="text-lg" aria-hidden="true">
          {maxEmoji}
        </span>
      </div>
    </div>
  );
}

interface WeightDisplayProps {
  value: number | null;
}

function WeightDisplay({ value }: WeightDisplayProps) {
  if (value === null) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center text-muted-foreground">
        <Scale className="h-5 w-5 text-blue-500" />
      </div>
      <span className="text-sm font-medium text-journal-ink">Peso</span>
      <span className="ml-auto text-sm font-semibold tabular-nums">
        {value.toFixed(1)} kg
      </span>
    </div>
  );
}
