'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  /** Progress value (0-100) */
  progress: number;
  /** Size in pixels (default: 64) */
  size?: number;
  /** Stroke width in pixels (default: 4) */
  strokeWidth?: number;
  /** Additional class names */
  className?: string;
  /** Show percentage text in center */
  showLabel?: boolean;
  /** Color variant */
  color?: 'default' | 'success' | 'warning';
}

const colorClasses = {
  default: 'stroke-primary',
  success: 'stroke-green-500',
  warning: 'stroke-yellow-500',
};

/**
 * ProgressRing - Circular progress indicator with animation
 *
 * Uses SVG circles with Framer Motion for smooth progress animation.
 * The ring fills clockwise from the top.
 *
 * @example
 * ```tsx
 * <ProgressRing progress={75} showLabel />
 * ```
 */
export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 4,
  className,
  showLabel = false,
  color = 'default',
}: ProgressRingProps) {
  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Determine color based on progress if not specified
  const effectiveColor =
    color === 'default'
      ? progress >= 100
        ? 'success'
        : progress >= 50
          ? 'default'
          : 'warning'
      : color;

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-label={`Progresso: ${Math.round(progress)}%`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted fill-none"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={cn('fill-none', colorClasses[effectiveColor])}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={progress}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-xs font-medium tabular-nums"
          >
            {Math.round(progress)}%
          </motion.span>
        </div>
      )}
    </div>
  );
}
