'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../types';

interface InvestmentProgressBarProps {
  currentAmount: number;
  goalAmount: number | null;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Progress bar for investment goal tracking
 * Shows percentage of goal achieved and optional label
 *
 * @see docs/milestones/phase-2-tracker.md M2.2
 */
export function InvestmentProgressBar({
  currentAmount,
  goalAmount,
  showLabel = false,
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

  return (
    <div className="space-y-1" data-testid="investment-progress-bar">
      <Progress
        value={progressPercent}
        className={cn(heightClasses[size], isComplete && '[&>div]:bg-green-500')}
        data-testid="investment-progress-value"
      />
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span data-testid="investment-progress-percent" className="font-mono tabular-nums">
            {progressPercent.toFixed(1)}%
          </span>
          <span data-testid="investment-progress-label">
            {isComplete ? 'Meta atingida!' : 'da meta'}
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
          className={getStrokeColor()}
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
