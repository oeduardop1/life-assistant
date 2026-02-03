'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CalendarMonth } from './components/calendar';
import { DayDetailModal } from './components/day-detail';

/**
 * Tracking page - Calendar-first view for metrics and habits
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 * @see docs/specs/domains/tracking.md for calendar UI structure
 */
export default function TrackingPage() {
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <CalendarMonth />
        </CardContent>
      </Card>

      {/* Day detail modal - opens when a day is selected */}
      <DayDetailModal />
    </>
  );
}
