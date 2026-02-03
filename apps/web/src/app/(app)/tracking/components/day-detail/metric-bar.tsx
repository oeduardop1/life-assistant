'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { segmentFill, noAnimation } from './animations';

interface MetricBarProps {
  /** Current value */
  value: number;
  /** Maximum value (for percentage calculation) */
  max: number;
  /** Number of segments to display */
  segments: number;
  /** Unit label (e.g., "ml", "h") */
  unit: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Color class for filled segments */
  colorClass?: string;
  /** Label to show (optional, replaces value display) */
  label?: string;
  /** Optional className */
  className?: string;
}

/**
 * MetricBar - Segmented bar visualization for metrics
 *
 * Features:
 * - Segmented bar (like hydration tracker)
 * - Filled segments animate in sequence
 * - Uses Year in Pixels colors
 * - Shows value and unit
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md for metrics display
 */
export function MetricBar({
  value,
  max,
  segments,
  unit,
  icon,
  colorClass = 'bg-primary/60',
  label,
  className,
}: MetricBarProps) {
  const prefersReducedMotion = useReducedMotion();

  // Calculate how many segments should be filled
  const percent = Math.min(100, (value / max) * 100);
  const filledSegments = Math.round((percent / 100) * segments);

  // Format display value
  const displayValue = label ?? `${value}${unit}`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Icon */}
      <div className="flex h-8 w-8 items-center justify-center text-muted-foreground">
        {icon}
      </div>

      {/* Segmented bar */}
      <div className="flex flex-1 items-center gap-1">
        {Array.from({ length: segments }).map((_, index) => {
          const isFilled = index < filledSegments;
          const delay = prefersReducedMotion ? 0 : index * 0.05;

          return (
            <motion.div
              key={index}
              className={cn(
                'h-4 flex-1 rounded-sm origin-bottom',
                isFilled ? colorClass : 'bg-muted'
              )}
              initial="hidden"
              animate="visible"
              variants={
                prefersReducedMotion || !isFilled
                  ? noAnimation
                  : segmentFill(delay)
              }
            />
          );
        })}
      </div>

      {/* Value display */}
      <motion.span
        className="min-w-[60px] text-right text-sm font-medium tabular-nums"
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {displayValue}
      </motion.span>
    </div>
  );
}

// =============================================================================
// Icon Components (defined outside render functions)
// =============================================================================

function DropletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-cyan-500"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-indigo-500"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// =============================================================================
// Pre-configured variants for common metrics
// =============================================================================

interface WaterBarProps {
  /** Water intake in ml */
  value: number;
  /** Daily goal in ml (default: 2000) */
  goal?: number;
  /** Optional className */
  className?: string;
}

/**
 * WaterBar - Pre-configured MetricBar for water intake
 *
 * Shows 8 segments (glasses of water concept)
 */
export function WaterBar({ value, goal = 2000, className }: WaterBarProps) {
  // Format as liters if >= 1000ml
  const displayLabel = value >= 1000 ? `${(value / 1000).toFixed(1)}L` : `${value}ml`;

  return (
    <MetricBar
      value={value}
      max={goal}
      segments={8}
      unit="ml"
      icon={<DropletIcon />}
      colorClass="bg-cyan-500/60"
      label={displayLabel}
      className={className}
    />
  );
}

interface SleepBarProps {
  /** Sleep duration in hours */
  value: number;
  /** Sleep goal in hours (default: 8) */
  goal?: number;
  /** Optional className */
  className?: string;
}

/**
 * SleepBar - Pre-configured MetricBar for sleep duration
 *
 * Shows 8 segments (hours of sleep)
 */
export function SleepBar({ value, goal = 8, className }: SleepBarProps) {
  return (
    <MetricBar
      value={value}
      max={goal}
      segments={8}
      unit="h"
      icon={<MoonIcon />}
      colorClass="bg-indigo-500/60"
      label={`${value}h`}
      className={className}
    />
  );
}
