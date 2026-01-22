import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthSelector } from '../../components/month-selector';

describe('MonthSelector', () => {
  const defaultProps = {
    currentMonth: '2026-01',
    formattedMonth: 'Janeiro 2026',
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onCurrentMonth: vi.fn(),
  };

  it('should_render_formatted_month', () => {
    render(<MonthSelector {...defaultProps} />);

    expect(screen.getByText('Janeiro 2026')).toBeInTheDocument();
  });

  it('should_call_onPrevMonth_when_prev_button_clicked', () => {
    const onPrevMonth = vi.fn();
    render(<MonthSelector {...defaultProps} onPrevMonth={onPrevMonth} />);

    const prevButton = screen.getByTestId('month-selector-prev');
    fireEvent.click(prevButton);

    expect(onPrevMonth).toHaveBeenCalledTimes(1);
  });

  it('should_call_onNextMonth_when_next_button_clicked', () => {
    const onNextMonth = vi.fn();
    render(<MonthSelector {...defaultProps} onNextMonth={onNextMonth} />);

    const nextButton = screen.getByTestId('month-selector-next');
    fireEvent.click(nextButton);

    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });

  it('should_call_onCurrentMonth_when_month_text_clicked', () => {
    const onCurrentMonth = vi.fn();
    render(<MonthSelector {...defaultProps} onCurrentMonth={onCurrentMonth} />);

    const monthButton = screen.getByTestId('month-selector-current');
    fireEvent.click(monthButton);

    expect(onCurrentMonth).toHaveBeenCalledTimes(1);
  });

  it('should_have_accessible_labels_for_buttons', () => {
    render(<MonthSelector {...defaultProps} />);

    expect(screen.getByLabelText('Mês anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Próximo mês')).toBeInTheDocument();
  });
});
