'use client';

import { useState, useEffect, useRef } from 'react';
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
import { HabitsSection } from './habits-section';
import { MetricsSection } from './metrics-section';
import { ProgressRing } from './progress-ring';
import { ManualTrackForm } from '../manual-track-form';
import { useTracking } from '../../context/tracking-context';
import { useDayDetailData } from '../../hooks/use-calendar';
import { useCompleteHabit, useUncompleteHabit } from '../../hooks/use-habits';
import { formatDateDisplay, getTodayDate } from '../../types';

/**
 * DayDetailModal - Modal showing details for a selected day
 *
 * Features:
 * - Date header with progress ring
 * - Habits section with checkboxes
 * - Metrics section with values
 * - Optimistic updates for habit completion
 * - Celebration confetti when all habits completed
 *
 * @see docs/specs/domains/tracking.md §3.3 for day detail view
 */
export function DayDetailModal() {
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
    completionPercent,
  } = useDayDetailData(selectedDate);

  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();

  // Celebrate when all habits are completed
  useEffect(() => {
    // Only celebrate if:
    // 1. There are habits
    // 2. All habits are now completed
    // 3. Previously not all were completed (prevents celebration on initial load)
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
  const displayDate = selectedDate ? formatDateDisplay(selectedDate) : '';
  const isToday = selectedDate === getTodayDate();
  const isAllComplete = habitsTotal > 0 && habitsCompleted === habitsTotal;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && clearSelectedDate()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        {/* Celebration confetti overlay */}
        {showCelebration && <CelebrationConfetti />}

        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {displayDate}
              </DialogTitle>
              {isToday && (
                <p className="text-xs text-muted-foreground">Hoje</p>
              )}
            </div>

            {/* Progress ring - only show if there are habits */}
            {habitsTotal > 0 && !isLoading && (
              <div className="flex items-center gap-2">
                <ProgressRing
                  progress={completionPercent}
                  size={48}
                  strokeWidth={4}
                  showLabel
                  color={isAllComplete ? 'success' : 'default'}
                />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Habits Section */}
          <HabitsSection
            habits={habits}
            isLoading={isLoading}
            togglingHabitId={togglingHabitId}
            onToggle={handleToggle}
          />

          <Separator />

          {/* Metrics Section with Add button */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Métricas
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetricForm(true)}
                className="h-8 text-xs"
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
