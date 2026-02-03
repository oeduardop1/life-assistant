'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  /** Current streak count */
  streak: number;
  /** Optional className */
  className?: string;
}

/**
 * StreakBadge - Shows streak count with fire icon
 *
 * Examples:
 * - 0 days: gray, no animation
 * - 1-6 days: orange
 * - 7+ days: orange with subtle glow
 */
export function StreakBadge({ streak, className }: StreakBadgeProps) {
  const hasStreak = streak > 0;
  const isHotStreak = streak >= 7;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        hasStreak ? 'text-orange-500' : 'text-muted-foreground',
        isHotStreak && 'animate-pulse',
        className
      )}
    >
      <Flame
        className={cn(
          'h-3 w-3',
          hasStreak ? 'text-orange-500' : 'text-muted-foreground'
        )}
      />
      {streak} {streak === 1 ? 'dia' : 'dias'}
    </span>
  );
}
