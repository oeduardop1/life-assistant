'use client';

import { Card, CardContent } from '@/components/ui/card';
import { SwipeableCalendar } from './components/calendar';
import { DayDetailModal } from './components/day-detail';

/**
 * Tracking page - Calendar-first view for metrics and habits
 *
 * Features:
 * - Swipeable calendar with month navigation
 * - Day detail modal for viewing/editing habits and metrics
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 * @see docs/specs/domains/tracking.md for calendar UI structure
 */
export default function TrackingPage() {
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <SwipeableCalendar />
        </CardContent>
      </Card>

      {/* Day detail modal - opens when a day is selected */}
      <DayDetailModal />
    </>
  );
}
