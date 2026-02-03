'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ListChecks } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { HabitCheckbox } from './habit-checkbox';
import { staggerContainer, staggerItem, noAnimation } from './animations';
import type { HabitWithCompletion } from '../../types';

interface HabitsSectionProps {
  /** Habits with completion status */
  habits: HabitWithCompletion[];
  /** Loading state */
  isLoading?: boolean;
  /** Habit ID currently being toggled */
  togglingHabitId?: string | null;
  /** Toggle completion handler */
  onToggle: (habitId: string, completed: boolean) => void;
}

/**
 * HabitsSection - List of habits for a specific day
 *
 * Features:
 * - Staggered entrance animation
 * - Dashed border container (journal aesthetic)
 * - Loading skeleton
 * - Empty state with illustration
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md for habit tracking
 */
export function HabitsSection({
  habits,
  isLoading = false,
  togglingHabitId,
  onToggle,
}: HabitsSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Hábitos" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Hábitos" />
        <EmptyState />
      </div>
    );
  }

  const completedCount = habits.filter((h) => h.completed).length;

  return (
    <div className="space-y-3">
      <SectionHeader
        title="Hábitos"
        subtitle={`${completedCount}/${habits.length} completos`}
      />

      {/* Habits list with stagger animation */}
      <motion.div
        className="space-y-2"
        initial="hidden"
        animate="visible"
        variants={prefersReducedMotion ? noAnimation : staggerContainer}
      >
        {habits.map((habitData) => (
          <motion.div
            key={habitData.habit.id}
            variants={prefersReducedMotion ? noAnimation : staggerItem}
          >
            <HabitCheckbox
              habitData={habitData}
              disabled={togglingHabitId === habitData.habit.id}
              onToggle={onToggle}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-journal-ink">{title}</h3>
      {subtitle && (
        <span className="text-xs tabular-nums text-journal-ink-soft">
          {subtitle}
        </span>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-journal-border py-8">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ListChecks className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-journal-ink">
        Nenhum hábito cadastrado
      </p>
      <p className="mt-1 text-xs text-journal-ink-soft">
        Crie hábitos na aba de gerenciamento
      </p>
    </div>
  );
}
