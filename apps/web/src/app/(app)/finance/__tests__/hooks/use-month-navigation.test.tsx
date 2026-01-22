import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonthNavigation } from '../../hooks/use-month-navigation';

describe('useMonthNavigation', () => {
  beforeEach(() => {
    // Mock current date to 2026-01-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should_initialize_with_current_month', () => {
    const { result } = renderHook(() => useMonthNavigation());

    expect(result.current.currentMonth).toBe('2026-01');
    expect(result.current.formattedMonth).toBe('Janeiro 2026');
    expect(result.current.isCurrentMonth).toBe(true);
  });

  it('should_initialize_with_custom_month', () => {
    const { result } = renderHook(() => useMonthNavigation('2025-06'));

    expect(result.current.currentMonth).toBe('2025-06');
    expect(result.current.formattedMonth).toBe('Junho 2025');
    expect(result.current.isCurrentMonth).toBe(false);
  });

  it('should_navigate_to_previous_month', () => {
    const { result } = renderHook(() => useMonthNavigation('2026-01'));

    act(() => {
      result.current.goToPrevMonth();
    });

    expect(result.current.currentMonth).toBe('2025-12');
    expect(result.current.formattedMonth).toBe('Dezembro 2025');
  });

  it('should_navigate_to_next_month', () => {
    const { result } = renderHook(() => useMonthNavigation('2026-01'));

    act(() => {
      result.current.goToNextMonth();
    });

    expect(result.current.currentMonth).toBe('2026-02');
    expect(result.current.formattedMonth).toBe('Fevereiro 2026');
  });

  it('should_handle_year_boundary_forward', () => {
    const { result } = renderHook(() => useMonthNavigation('2025-12'));

    act(() => {
      result.current.goToNextMonth();
    });

    expect(result.current.currentMonth).toBe('2026-01');
  });

  it('should_handle_year_boundary_backward', () => {
    const { result } = renderHook(() => useMonthNavigation('2026-01'));

    act(() => {
      result.current.goToPrevMonth();
    });

    expect(result.current.currentMonth).toBe('2025-12');
  });

  it('should_go_to_specific_month', () => {
    const { result } = renderHook(() => useMonthNavigation());

    act(() => {
      result.current.goToMonth('2024-06');
    });

    expect(result.current.currentMonth).toBe('2024-06');
    expect(result.current.formattedMonth).toBe('Junho 2024');
    expect(result.current.isCurrentMonth).toBe(false);
  });

  it('should_go_to_current_month', () => {
    const { result } = renderHook(() => useMonthNavigation('2024-06'));

    expect(result.current.isCurrentMonth).toBe(false);

    act(() => {
      result.current.goToCurrentMonth();
    });

    expect(result.current.currentMonth).toBe('2026-01');
    expect(result.current.isCurrentMonth).toBe(true);
  });
});
