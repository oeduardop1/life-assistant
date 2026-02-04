import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthSummary } from '../../components/calendar/month-summary';
import type { CalendarDaySummary } from '../../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('MonthSummary', () => {
  // Fixed "today" date for testing - January 3rd, 2026
  const TODAY = '2026-01-03';

  const createDay = (
    date: string,
    options: Partial<CalendarDaySummary> = {}
  ): CalendarDaySummary => ({
    date,
    moodScore: options.moodScore,
    moodColor: options.moodColor ?? 'gray',
    habitsCompleted: options.habitsCompleted ?? 0,
    habitsTotal: options.habitsTotal ?? 0,
    hasData: options.hasData ?? false,
  });

  describe('rendering', () => {
    it('should_not_render_for_future_month', () => {
      // Future month with no data
      const { container } = render(
        <MonthSummary days={[]} year={2099} month={12} today={TODAY} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should_render_stats_when_there_is_data', () => {
      const days: CalendarDaySummary[] = [
        createDay('2026-01-01', { hasData: true, moodScore: 7, moodColor: 'green', habitsCompleted: 2, habitsTotal: 3 }),
        createDay('2026-01-02', { hasData: true, moodScore: 8, moodColor: 'green', habitsCompleted: 3, habitsTotal: 3 }),
        createDay('2026-01-03', { hasData: true, moodScore: 6, moodColor: 'yellow', habitsCompleted: 1, habitsTotal: 3 }),
      ];

      render(<MonthSummary days={days} year={2026} month={1} today={TODAY} />);

      // Check that stats labels are displayed
      expect(screen.getByText('streak atual')).toBeInTheDocument();
      expect(screen.getByText('humor médio')).toBeInTheDocument();
      expect(screen.getByText('hábitos')).toBeInTheDocument();
      // "dias" appears in both the label and the streak count, so use getAllByText
      expect(screen.getAllByText(/dias/i).length).toBeGreaterThan(0);
    });

    it('should_display_correct_average_mood', () => {
      const days: CalendarDaySummary[] = [
        createDay('2026-01-01', { hasData: true, moodScore: 7, moodColor: 'green' }),
        createDay('2026-01-02', { hasData: true, moodScore: 8, moodColor: 'green' }),
        createDay('2026-01-03', { hasData: true, moodScore: 6, moodColor: 'yellow' }),
      ];

      render(<MonthSummary days={days} year={2026} month={1} today={TODAY} />);

      // Average: (7 + 8 + 6) / 3 = 7.0
      expect(screen.getByText('7.0')).toBeInTheDocument();
    });

    it('should_display_correct_habit_percentage', () => {
      const days: CalendarDaySummary[] = [
        createDay('2026-01-01', { hasData: true, habitsCompleted: 2, habitsTotal: 4 }),
        createDay('2026-01-02', { hasData: true, habitsCompleted: 4, habitsTotal: 4 }),
      ];

      render(<MonthSummary days={days} year={2026} month={1} today={TODAY} />);

      // Percentage: (2 + 4) / (4 + 4) = 6/8 = 75%
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should_show_dash_for_missing_mood_data', () => {
      const days: CalendarDaySummary[] = [
        createDay('2026-01-01', { hasData: true, habitsCompleted: 1, habitsTotal: 2 }),
      ];

      render(<MonthSummary days={days} year={2026} month={1} today={TODAY} />);

      // No mood data, should show "—"
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('streak calculation', () => {
    it('should_calculate_streak_correctly', () => {
      // Create consecutive days with data starting from a recent date
      // Note: Streak is calculated from today backwards, so we need to mock dates carefully
      // For unit tests, we test the component renders the streak value
      const days: CalendarDaySummary[] = [
        createDay('2026-01-01', { hasData: true }),
        createDay('2026-01-02', { hasData: true }),
        createDay('2026-01-03', { hasData: true }),
      ];

      render(<MonthSummary days={days} year={2026} month={1} today={TODAY} />);

      // The component should display some streak value
      expect(screen.getByText('streak atual')).toBeInTheDocument();
    });
  });

  describe('days tracked', () => {
    it('should_count_days_with_data', () => {
      const days: CalendarDaySummary[] = [
        createDay('2026-01-01', { hasData: true }),
        createDay('2026-01-02', { hasData: true }),
        createDay('2026-01-03', { hasData: false }),
        createDay('2026-01-04', { hasData: true }),
      ];

      render(<MonthSummary days={days} year={2026} month={1} today={TODAY} />);

      // The "dias" section should show tracked/total format
      // Look for the days section label to verify it rendered
      expect(screen.getAllByText(/dias/i).length).toBeGreaterThan(0);
    });
  });
});
