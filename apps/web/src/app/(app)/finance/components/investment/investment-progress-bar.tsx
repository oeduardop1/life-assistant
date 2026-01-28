'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';

interface InvestmentProgressBarProps {
  currentAmount: number;
  goalAmount: number | null;
  showLabel?: boolean;
  showMilestones?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Progress bar for investment goal tracking
 * Shows percentage of goal achieved with optional milestone markers
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentProgressBar({
  currentAmount,
  goalAmount,
  showLabel = false,
  showMilestones = true,
  size = 'md',
}: InvestmentProgressBarProps) {
  // No progress bar if no goal is set
  if (!goalAmount || goalAmount <= 0) {
    return null;
  }

  const progressPercent = Math.min((currentAmount / goalAmount) * 100, 100);
  const isComplete = progressPercent >= 100;

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const milestones = [25, 50, 75];

  return (
    <div className="space-y-1" data-testid="investment-progress-bar">
      <div className="relative">
        {/* Background track */}
        <div
          className={cn(
            'w-full rounded-full bg-muted overflow-hidden',
            heightClasses[size]
          )}
        >
          {/* Animated progress fill */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'h-full rounded-full transition-colors',
              isComplete
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                : 'bg-foreground/80'
            )}
            data-testid="investment-progress-value"
          />
        </div>

        {/* Milestone markers */}
        {showMilestones && size !== 'sm' && (
          <div className="absolute inset-0 flex items-center pointer-events-none">
            {milestones.map((milestone) => (
              <div
                key={milestone}
                className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `${milestone}%` }}
              >
                <div
                  className={cn(
                    'w-0.5 rounded-full transition-colors',
                    size === 'lg' ? 'h-4' : 'h-3',
                    progressPercent >= milestone
                      ? 'bg-background/60'
                      : 'bg-muted-foreground/20'
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span data-testid="investment-progress-percent" className="font-mono tabular-nums">
            {progressPercent.toFixed(1)}%
          </span>
          <span data-testid="investment-progress-label">
            {isComplete ? (
              <span className="text-emerald-500 font-medium">Meta atingida!</span>
            ) : (
              'da meta'
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Circular Progress Component
// =============================================================================

interface CircularProgressProps {
  currentAmount: number;
  goalAmount: number | null;
  /** Size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Color based on progress or explicit */
  color?: 'auto' | 'green' | 'blue' | 'purple' | 'orange';
  /** Whether to show the center content */
  showCenter?: boolean;
  /** Custom center label */
  centerLabel?: string;
}

/**
 * CircularProgress - SVG-based circular progress ring
 *
 * Features:
 * - Animated fill on scroll into view
 * - Center shows percentage and current value
 * - Configurable colors based on progress
 */
export function CircularProgress({
  currentAmount,
  goalAmount,
  size = 120,
  strokeWidth = 8,
  color = 'auto',
  showCenter = true,
  centerLabel = 'meta',
}: CircularProgressProps) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!goalAmount || goalAmount <= 0) {
    return null;
  }

  const progressPercent = Math.min((currentAmount / goalAmount) * 100, 100);
  const isComplete = progressPercent >= 100;

  // Calculate SVG dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Get color based on progress or explicit setting
  const getStrokeColor = () => {
    if (color !== 'auto') {
      const colors = {
        green: 'stroke-emerald-500',
        blue: 'stroke-blue-500',
        purple: 'stroke-purple-500',
        orange: 'stroke-orange-500',
      };
      return colors[color];
    }

    if (isComplete) return 'stroke-emerald-500';
    if (progressPercent >= 75) return 'stroke-emerald-500';
    if (progressPercent >= 50) return 'stroke-blue-500';
    if (progressPercent >= 25) return 'stroke-amber-500';
    return 'stroke-muted-foreground/30';
  };

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="circular-progress">
      <svg
        ref={ref}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(
            getStrokeColor(),
            isComplete && 'drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]'
          )}
          style={{
            strokeDasharray: circumference,
          }}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: isInView ? strokeDashoffset : circumference,
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Center content */}
      {showCenter && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono tabular-nums">
            {progressPercent.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {formatCurrency(currentAmount)}
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
}
