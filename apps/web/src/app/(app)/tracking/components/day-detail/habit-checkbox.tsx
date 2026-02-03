'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { JournalCheckbox } from './journal-checkbox';
import { StreakBadge } from './streak-badge';
import { hoverLift } from './animations';
import type { HabitWithCompletion } from '../../types';
import { periodOfDayLabels } from '../../types';

interface HabitCheckboxProps {
  /** Habit with completion status */
  habitData: HabitWithCompletion;
  /** Whether checkbox is disabled (loading) */
  disabled?: boolean;
  /** Toggle completion handler */
  onToggle: (habitId: string, completed: boolean) => void;
}

/**
 * HabitCheckbox - Journal-style checkbox card for marking habits
 *
 * Features:
 * - Uses JournalCheckbox for animated checkmark
 * - Dashed border when unchecked, solid when completed
 * - Habit color as accent
 * - Hover lift effect
 * - Period of day indicator
 * - Streak badge with glow
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md for habit completion
 */
export function HabitCheckbox({
  habitData,
  disabled = false,
  onToggle,
}: HabitCheckboxProps) {
  const prefersReducedMotion = useReducedMotion();
  const { habit, completed } = habitData;
  const periodLabel = periodOfDayLabels[habit.periodOfDay];

  const handleChange = (checked: boolean) => {
    onToggle(habit.id, checked);
  };

  // Determine border style based on habit color and completion state
  const getBorderStyle = () => {
    if (completed) {
      return habit.color
        ? { borderColor: `${habit.color}40` }
        : {};
    }
    return habit.color
      ? { borderColor: `${habit.color}30` }
      : {};
  };

  return (
    <motion.div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl transition-colors',
        completed
          ? 'border-2 border-solid bg-journal-checkbox-bg/30'
          : 'border-2 border-dashed border-journal-border bg-transparent',
        disabled && 'opacity-50 pointer-events-none'
      )}
      style={getBorderStyle()}
      {...(prefersReducedMotion || disabled ? {} : hoverLift)}
    >
      <div className="flex items-center gap-3">
        {/* Journal Checkbox */}
        <JournalCheckbox
          id={`habit-${habit.id}`}
          checked={completed}
          onCheckedChange={handleChange}
          disabled={disabled}
          accentColor={habit.color}
        />

        {/* Habit info */}
        <div className="flex items-center gap-2.5">
          {/* Icon with color background */}
          <motion.span
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
            style={{
              backgroundColor: habit.color ? `${habit.color}20` : 'var(--muted)',
            }}
            animate={
              completed && !prefersReducedMotion
                ? { scale: [1, 1.1, 1] }
                : {}
            }
            transition={{ duration: 0.3 }}
          >
            {habit.icon}
          </motion.span>

          {/* Name and period */}
          <div className="flex flex-col">
            <label
              htmlFor={`habit-${habit.id}`}
              className={cn(
                'text-sm font-medium cursor-pointer transition-colors',
                completed
                  ? 'text-muted-foreground line-through decoration-journal-ink-soft/50'
                  : 'text-journal-ink'
              )}
            >
              {habit.name}
            </label>
            <span className="text-xs text-journal-ink-soft">{periodLabel}</span>
          </div>
        </div>
      </div>

      {/* Streak badge */}
      <StreakBadge streak={habit.currentStreak} />
    </motion.div>
  );
}
