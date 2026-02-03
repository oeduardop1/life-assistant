'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CelebrationConfetti } from '@/app/(app)/finance/components/bill/bill-animations';
import { DateHeader } from './date-header';
import { HabitProgressDots } from './habit-progress-dots';
import { HabitsSection } from './habits-section';
import { MetricsSection } from './metrics-section';
import { ManualTrackForm } from '../manual-track-form';
import { useTracking } from '../../context/tracking-context';
import { useDayDetailData } from '../../hooks/use-calendar';
import { useCompleteHabit, useUncompleteHabit } from '../../hooks/use-habits';
import { getTodayDate, getMoodColor } from '../../types';
import { journalEntrance, noAnimation } from './animations';

/**
 * DayDetailModal - Journal-style modal showing details for a selected day
 *
 * Features:
 * - DateHeader with large day number and "Hoje" badge
 * - HabitProgressDots replacing circular ring
 * - Habits section with journal-style checkboxes
 * - Metrics section with emoji sliders and visual bars
 * - Mood-based background tint
 * - Celebration confetti on 100% completion
 * - Respects reduced motion preference
 *
 * @see docs/specs/domains/tracking.md §3.3 for day detail view
 */
export function DayDetailModal() {
  const prefersReducedMotion = useReducedMotion();
  const { selectedDate, clearSelectedDate } = useTracking();
  const [togglingHabitId, setTogglingHabitId] = useState<string | null>(null);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevCompletedRef = useRef<number>(0);

  const {
    habits,
    metrics,
    isLoading,
    habitsTotal,
    habitsCompleted,
  } = useDayDetailData(selectedDate);

  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();

  // Celebrate when all habits are completed
  useEffect(() => {
    if (
      habitsTotal > 0 &&
      habitsCompleted === habitsTotal &&
      prevCompletedRef.current < habitsTotal &&
      prevCompletedRef.current > 0
    ) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }

    prevCompletedRef.current = habitsCompleted;
  }, [habitsCompleted, habitsTotal]);

  // Reset celebration when modal closes
  useEffect(() => {
    if (!selectedDate) {
      setShowCelebration(false);
      prevCompletedRef.current = 0;
    }
  }, [selectedDate]);

  // Handle habit toggle
  const handleToggle = async (habitId: string, completed: boolean) => {
    if (!selectedDate) return;

    setTogglingHabitId(habitId);

    try {
      if (completed) {
        await completeHabit.mutateAsync({ habitId, date: selectedDate });
      } else {
        await uncompleteHabit.mutateAsync({ habitId, date: selectedDate });
      }
    } finally {
      setTogglingHabitId(null);
    }
  };

  const isOpen = selectedDate !== null;
  const isToday = selectedDate === getTodayDate();

  // Get mood-based background tint
  const getMoodTint = () => {
    const moodEntry = metrics.find((m) => m.type === 'mood');
    if (!moodEntry) return undefined;

    const moodScore = parseFloat(moodEntry.value);
    const moodColor = getMoodColor(moodScore);

    const tintColors: Record<string, string> = {
      green: 'var(--tracking-fill-good)',
      yellow: 'var(--tracking-fill-neutral)',
      red: 'var(--tracking-fill-poor)',
      gray: 'transparent',
    };

    return tintColors[moodColor];
  };

  const moodTint = getMoodTint();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && clearSelectedDate()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-journal-paper">
        {/* Celebration confetti overlay */}
        {showCelebration && <CelebrationConfetti />}

        <DialogHeader className="relative pb-2">
          {/* Accessible title (visually hidden) */}
          <DialogTitle className="sr-only">
            Detalhes do dia {selectedDate}
          </DialogTitle>

          {/* Mood tint background */}
          {moodTint && (
            <div
              className="absolute inset-0 -mx-6 -mt-6 rounded-t-lg opacity-50"
              style={{ backgroundColor: moodTint }}
            />
          )}

          {/* Date header */}
          <motion.div
            className="relative"
            initial="hidden"
            animate="visible"
            variants={prefersReducedMotion ? noAnimation : journalEntrance}
          >
            {selectedDate && (
              <DateHeader date={selectedDate} isToday={isToday} />
            )}

            {/* Progress dots */}
            {habitsTotal > 0 && !isLoading && (
              <HabitProgressDots
                completed={habitsCompleted}
                total={habitsTotal}
                className="mt-2"
              />
            )}
          </motion.div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Habits Section */}
          <HabitsSection
            habits={habits}
            isLoading={isLoading}
            togglingHabitId={togglingHabitId}
            onToggle={handleToggle}
          />

          {/* Dashed separator */}
          <Separator className="border-dashed border-journal-border" />

          {/* Metrics Section with Add button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-journal-ink">
                Métricas
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetricForm(true)}
                className="h-8 text-xs text-journal-ink-soft hover:text-journal-ink"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            <MetricsSection
              metrics={metrics}
              isLoading={isLoading}
              readOnly
              hideHeader
            />
          </div>

          {/* ManualTrackForm modal for adding metrics */}
          <ManualTrackForm
            open={showMetricForm}
            onOpenChange={setShowMetricForm}
            defaultDate={selectedDate || undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
