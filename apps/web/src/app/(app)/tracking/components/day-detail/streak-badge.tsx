'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fireGlow, noAnimation, valueChangeTransition } from './animations';

interface StreakBadgeProps {
  /** Current streak count */
  streak: number;
  /** Optional className */
  className?: string;
}

/**
 * StreakBadge - Shows streak count with fire icon and glow animation
 *
 * Features:
 * - 0 days: gray, no animation
 * - 1-6 days: orange color
 * - 7+ days: orange with fire glow animation
 * - Number animates on value change
 * - Tabular-nums for stable width
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md for habit streaks
 */
export function StreakBadge({ streak, className }: StreakBadgeProps) {
  const prefersReducedMotion = useReducedMotion();

  const hasStreak = streak > 0;
  const isHotStreak = streak >= 7;

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        hasStreak ? 'text-orange-500' : 'text-muted-foreground',
        isHotStreak && 'bg-orange-500/10',
        className
      )}
      initial="idle"
      animate={isHotStreak && !prefersReducedMotion ? 'active' : 'idle'}
      variants={prefersReducedMotion ? noAnimation : fireGlow}
    >
      {/* Fire icon with subtle animation for hot streaks */}
      <motion.span
        className="relative"
        animate={
          isHotStreak && !prefersReducedMotion
            ? {
                scale: [1, 1.15, 1],
                rotate: [0, -5, 5, 0],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Flame
          className={cn(
            'h-3.5 w-3.5',
            hasStreak ? 'text-orange-500' : 'text-muted-foreground',
            isHotStreak && 'drop-shadow-[0_0_4px_var(--journal-fire-glow)]'
          )}
        />
      </motion.span>

      {/* Streak count with animated value change */}
      <motion.span
        key={streak}
        className="tabular-nums"
        initial={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={valueChangeTransition}
      >
        {streak}
      </motion.span>

      {/* Day label */}
      <span>{streak === 1 ? 'dia' : 'dias'}</span>
    </motion.span>
  );
}
