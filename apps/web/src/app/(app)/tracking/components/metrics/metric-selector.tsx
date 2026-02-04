'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  trackingTypeLabels,
  trackingTypeIcons,
  type TrackingType,
} from '../../types';
import { useCustomMetrics } from '../../hooks';

const TRACKING_TYPES: TrackingType[] = [
  'weight',
  'water',
  'sleep',
  'exercise',
  'mood',
  'energy',
];

// Refined color palette for each metric type
const metricColors: Record<TrackingType, { bg: string; text: string; border: string }> = {
  weight: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  water: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  sleep: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
  exercise: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  mood: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  energy: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  custom: {
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-800',
  },
};

// Selection can be a built-in type OR a custom metric ID (prefixed with 'custom:')
export type MetricSelection = TrackingType | `custom:${string}`;

interface MetricSelectorProps {
  selected: MetricSelection;
  onSelect: (selection: MetricSelection) => void;
  className?: string;
  /** Whether to include custom metrics in the selector */
  includeCustomMetrics?: boolean;
}

/**
 * Parse a metric selection to determine if it's custom or built-in
 */
export function parseMetricSelection(selection: MetricSelection): {
  isCustom: boolean;
  type: TrackingType;
  customMetricId?: string;
} {
  if (selection.startsWith('custom:')) {
    return {
      isCustom: true,
      type: 'custom',
      customMetricId: selection.replace('custom:', ''),
    };
  }
  return {
    isCustom: false,
    type: selection as TrackingType,
  };
}


/**
 * MetricSelector - Horizontal pill-style selector for metric types
 *
 * Features:
 * - Smooth selection animation with layoutId
 * - Subtle color coding per metric
 * - Horizontally scrollable on mobile
 * - Keyboard accessible
 * - Supports custom metrics (when includeCustomMetrics=true)
 */
export function MetricSelector({
  selected,
  onSelect,
  className,
  includeCustomMetrics = false,
}: MetricSelectorProps) {
  // Fetch custom metrics if needed
  const { data: customMetrics } = useCustomMetrics();
  const hasCustomMetrics = includeCustomMetrics && customMetrics && customMetrics.length > 0;

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1',
        className
      )}
      role="tablist"
      aria-label="Selecionar tipo de métrica"
    >
      {/* Built-in metric types */}
      {TRACKING_TYPES.map((type) => {
        const Icon = trackingTypeIcons[type];
        const colors = metricColors[type];
        const isSelected = selected === type;

        return (
          <button
            key={type}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(type)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
              'border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
              isSelected
                ? cn(colors.bg, colors.text, colors.border)
                : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="metric-selector-bg"
                className={cn(
                  'absolute inset-0 rounded-full border',
                  colors.bg,
                  colors.border
                )}
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35,
                }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {trackingTypeLabels[type]}
            </span>
          </button>
        );
      })}

      {/* Custom metrics separator and items */}
      {hasCustomMetrics && (
        <>
          <div className="w-px bg-border self-stretch my-1" />
          {customMetrics.map((metric) => {
            const selectionId: MetricSelection = `custom:${metric.id}`;
            const isSelected = selected === selectionId;
            const colors = metricColors.custom;

            return (
              <button
                key={metric.id}
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelect(selectionId)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                  'border focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
                  isSelected
                    ? cn(colors.bg, colors.text, colors.border)
                    : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                style={
                  metric.color && isSelected
                    ? {
                        backgroundColor: `${metric.color}15`,
                        borderColor: `${metric.color}40`,
                        color: metric.color,
                      }
                    : undefined
                }
              >
                {isSelected && !metric.color && (
                  <motion.div
                    layoutId="metric-selector-bg"
                    className={cn(
                      'absolute inset-0 rounded-full border',
                      colors.bg,
                      colors.border
                    )}
                    initial={false}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 35,
                    }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <span className="text-base">{metric.icon}</span>
                  {metric.name}
                </span>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

export { metricColors, TRACKING_TYPES };
