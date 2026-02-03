'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { HabitsSection } from './habits-section';
import { MetricsSection } from './metrics-section';
import { ManualTrackForm } from '../manual-track-form';
import { useTracking } from '../../context/tracking-context';
import { useDayDetailData } from '../../hooks/use-calendar';
import { useCompleteHabit, useUncompleteHabit } from '../../hooks/use-habits';
import { formatDateDisplay, getTodayDate } from '../../types';

/**
 * DayDetailModal - Modal showing details for a selected day
 *
 * Features:
 * - Date header with close button
 * - Habits section with checkboxes
 * - Metrics section with values
 * - Optimistic updates for habit completion
 *
 * @see docs/specs/domains/tracking.md §3.3 for day detail view
 */
export function DayDetailModal() {
  const { selectedDate, clearSelectedDate } = useTracking();
  const [togglingHabitId, setTogglingHabitId] = useState<string | null>(null);
  const [showMetricForm, setShowMetricForm] = useState(false);

  const { habits, metrics, isLoading } = useDayDetailData(selectedDate);

  const completeHabit = useCompleteHabit();
  const uncompleteHabit = useUncompleteHabit();

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && clearSelectedDate()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {displayDate}
          </DialogTitle>
          {isToday && (
            <p className="text-xs text-muted-foreground">Hoje</p>
          )}
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
