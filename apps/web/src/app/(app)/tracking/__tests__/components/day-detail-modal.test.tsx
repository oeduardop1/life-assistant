import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayDetailModal } from '../../components/day-detail/day-detail-modal';

// Mock the tracking context
vi.mock('../../context/tracking-context', () => ({
  useTracking: vi.fn(),
}));

// Mock the calendar hooks
vi.mock('../../hooks/use-calendar', () => ({
  useDayDetailData: vi.fn(),
  calendarKeys: {
    all: ['calendar'],
    month: (year: number, month: number) => ['calendar', 'month', year, month],
    day: (date: string) => ['calendar', 'day', date],
    metricsByDate: (date: string) => ['calendar', 'metrics', date],
  },
}));

// Mock the habits hooks
vi.mock('../../hooks/use-habits', () => ({
  useCompleteHabit: vi.fn(),
  useUncompleteHabit: vi.fn(),
}));

// Mock ManualTrackForm to simplify tests
vi.mock('../../components/manual-track-form', () => ({
  ManualTrackForm: vi.fn(({ open, defaultDate }) =>
    open ? (
      <div data-testid="manual-track-form" data-default-date={defaultDate}>
        Registrar Metrica
      </div>
    ) : null
  ),
}));

import { useTracking } from '../../context/tracking-context';
import { useDayDetailData } from '../../hooks/use-calendar';
import { useCompleteHabit, useUncompleteHabit } from '../../hooks/use-habits';

const mockUseTracking = vi.mocked(useTracking);
const mockUseDayDetailData = vi.mocked(useDayDetailData);
const mockUseCompleteHabit = vi.mocked(useCompleteHabit);
const mockUseUncompleteHabit = vi.mocked(useUncompleteHabit);

describe('DayDetailModal', () => {
  const mockClearSelectedDate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTracking.mockReturnValue({
      selectedDate: '2026-01-15',
      clearSelectedDate: mockClearSelectedDate,
      currentMonth: '2026-01',
      year: 2026,
      month: 1,
      setMonth: vi.fn(),
      goToPreviousMonth: vi.fn(),
      goToNextMonth: vi.fn(),
      goToToday: vi.fn(),
      setSelectedDate: vi.fn(),
    });

    mockUseDayDetailData.mockReturnValue({
      habits: [],
      metrics: [],
      isLoading: false,
      date: '2026-01-15',
      habitsTotal: 0,
      habitsCompleted: 0,
      completionPercent: 0,
      moodScore: undefined,
      energyScore: undefined,
    } as unknown as ReturnType<typeof useDayDetailData>);

    mockUseCompleteHabit.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCompleteHabit>);

    mockUseUncompleteHabit.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUncompleteHabit>);
  });

  it('should_render_when_selectedDate_is_set', () => {
    render(<DayDetailModal />);

    // Check that the modal is open with the formatted date
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should_not_render_when_selectedDate_is_null', () => {
    mockUseTracking.mockReturnValue({
      selectedDate: null,
      clearSelectedDate: mockClearSelectedDate,
      currentMonth: '2026-01',
      year: 2026,
      month: 1,
      setMonth: vi.fn(),
      goToPreviousMonth: vi.fn(),
      goToNextMonth: vi.fn(),
      goToToday: vi.fn(),
      setSelectedDate: vi.fn(),
    });

    render(<DayDetailModal />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_show_add_metric_button_in_metrics_section', () => {
    render(<DayDetailModal />);

    const addButton = screen.getByRole('button', { name: /Adicionar/iu });
    expect(addButton).toBeInTheDocument();
  });

  it('should_open_ManualTrackForm_when_add_button_is_clicked', async () => {
    const user = userEvent.setup();
    render(<DayDetailModal />);

    // Click the "Adicionar" button
    const addButton = screen.getByRole('button', { name: /Adicionar/iu });
    await user.click(addButton);

    // ManualTrackForm should be rendered with open=true
    await waitFor(() => {
      expect(screen.getByTestId('manual-track-form')).toBeInTheDocument();
    });
  });

  it('should_pass_selectedDate_as_defaultDate_to_ManualTrackForm', async () => {
    const user = userEvent.setup();
    render(<DayDetailModal />);

    // Click the "Adicionar" button
    const addButton = screen.getByRole('button', { name: /Adicionar/iu });
    await user.click(addButton);

    // Check that ManualTrackForm receives the correct defaultDate
    await waitFor(() => {
      const form = screen.getByTestId('manual-track-form');
      expect(form).toHaveAttribute('data-default-date', '2026-01-15');
    });
  });

  it('should_show_metrics_header', () => {
    render(<DayDetailModal />);

    expect(screen.getByText('Métricas')).toBeInTheDocument();
  });

  it('should_show_empty_state_when_no_metrics', () => {
    render(<DayDetailModal />);

    expect(
      screen.getByText(/Nenhuma métrica registrada para este dia/iu)
    ).toBeInTheDocument();
  });

  it('should_show_metrics_when_available', () => {
    mockUseDayDetailData.mockReturnValue({
      habits: [],
      metrics: [
        {
          id: '1',
          type: 'mood',
          value: '8',
          unit: 'pontos',
          area: 'health',
          subArea: null,
          metadata: {},
          entryDate: '2026-01-15',
          entryTime: null,
          source: 'form',
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T10:00:00Z',
        },
      ],
      isLoading: false,
      date: '2026-01-15',
      habitsTotal: 0,
      habitsCompleted: 0,
      completionPercent: 0,
      moodScore: 8,
      energyScore: undefined,
    } as unknown as ReturnType<typeof useDayDetailData>);

    render(<DayDetailModal />);

    // Should show mood value (8/10)
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('should_close_modal_when_close_button_is_clicked', async () => {
    const user = userEvent.setup();
    render(<DayDetailModal />);

    const closeButton = screen.getByRole('button', { name: /Close/iu });
    await user.click(closeButton);

    expect(mockClearSelectedDate).toHaveBeenCalled();
  });
});
