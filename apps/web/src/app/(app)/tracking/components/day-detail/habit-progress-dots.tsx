'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { dotEntrance, noAnimation } from './animations';

interface HabitProgressDotsProps {
  /** Number of completed habits */
  completed: number;
  /** Total number of habits */
  total: number;
  /** Show numeric label below dots */
  showLabel?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * HabitProgressDots - Horizontal dot progress indicator
 *
 * Features:
 * - Replaces circular ProgressRing with journal-style dots
 * - Completed dots are filled, pending are dashed outline
 * - Staggered entrance animation
 * - Shows max 10 dots with "+N" for overflow
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md for day detail view
 */
export function HabitProgressDots({
  completed,
  total,
  showLabel = true,
  className,
}: HabitProgressDotsProps) {
  const prefersReducedMotion = useReducedMotion();

  if (total === 0) {
    return null;
  }

  // Limit visible dots to 10
  const maxDots = 10;
  const visibleDots = Math.min(total, maxDots);
  const overflow = total > maxDots ? total - maxDots : 0;
  const completedVisible = Math.min(completed, visibleDots);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Dots row */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: visibleDots }).map((_, index) => {
          const isCompleted = index < completedVisible;
          const delay = prefersReducedMotion ? 0 : index * 0.04;

          return (
            <motion.span
              key={index}
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-colors',
                isCompleted
                  ? 'bg-journal-checkbox-checked'
                  : 'border-2 border-dashed border-journal-border bg-transparent'
              )}
              initial="hidden"
              animate="visible"
              variants={prefersReducedMotion ? noAnimation : dotEntrance(delay)}
              aria-hidden="true"
            />
          );
        })}

        {/* Overflow indicator */}
        {overflow > 0 && (
          <motion.span
            className="ml-0.5 text-xs tabular-nums text-journal-ink-soft"
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            +{overflow}
          </motion.span>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <motion.span
          className="text-xs tabular-nums text-journal-ink-soft"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          aria-label={`${completed} de ${total} hábitos completos`}
        >
          {completed}/{total}
        </motion.span>
      )}
    </div>
  );
}
