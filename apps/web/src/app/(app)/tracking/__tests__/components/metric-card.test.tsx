import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard, MetricCardsGrid } from '../../components/metric-card';

// Mock the useTrackingAggregation hook
vi.mock('../../hooks/use-tracking', () => ({
  useTrackingAggregation: vi.fn(),
}));

import { useTrackingAggregation } from '../../hooks/use-tracking';

const mockUseTrackingAggregation = vi.mocked(useTrackingAggregation);

describe('MetricCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_value_with_correct_unit', () => {
    mockUseTrackingAggregation.mockReturnValue({
      data: {
        type: 'weight',
        average: 75.5,
        sum: 226.5,
        min: 74.0,
        max: 77.0,
        count: 3,
        latestValue: 75.5,
        previousValue: 75.0,
        variation: 0.67,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTrackingAggregation>);

    render(<MetricCard type="weight" />);

    // Should display latest value with unit
    expect(screen.getByText('75.5 kg')).toBeInTheDocument();
    // Should display type label
    expect(screen.getByText('Peso')).toBeInTheDocument();
  });

  it('should_apply_correct_color_for_each_type', () => {
    mockUseTrackingAggregation.mockReturnValue({
      data: {
        type: 'water',
        average: 2000,
        sum: 6000,
        min: 1500,
        max: 2500,
        count: 3,
        latestValue: 2000,
        previousValue: 1800,
        variation: 11.1,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTrackingAggregation>);

    const { container } = render(<MetricCard type="water" />);

    // Should have cyan color class for water type
    const iconContainer = container.querySelector('.text-cyan-500');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should_show_trend_indicator_when_variation_exists', () => {
    mockUseTrackingAggregation.mockReturnValue({
      data: {
        type: 'weight',
        average: 75.5,
        sum: 226.5,
        min: 74.0,
        max: 77.0,
        count: 3,
        latestValue: 75.5,
        previousValue: 74.0,
        variation: 2.0,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTrackingAggregation>);

    render(<MetricCard type="weight" />);

    // Should display variation percentage
    expect(screen.getByText('+2.0%')).toBeInTheDocument();
  });

  it('should_handle_missing_data_gracefully', () => {
    mockUseTrackingAggregation.mockReturnValue({
      data: {
        type: 'weight',
        average: null,
        sum: null,
        min: null,
        max: null,
        count: 0,
        latestValue: null,
        previousValue: null,
        variation: null,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTrackingAggregation>);

    render(<MetricCard type="weight" />);

    // Should display empty state
    expect(screen.getByText('--')).toBeInTheDocument();
    expect(screen.getByText('Nenhum registro')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton_while_fetching', () => {
    mockUseTrackingAggregation.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useTrackingAggregation>);

    const { container } = render(<MetricCard type="weight" />);

    // Should show skeleton elements
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe('MetricCardsGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTrackingAggregation.mockReturnValue({
      data: {
        type: 'weight',
        average: 75,
        sum: 75,
        min: 75,
        max: 75,
        count: 1,
        latestValue: 75,
        previousValue: null,
        variation: null,
      },
      isLoading: false,
      error: null,
    } as ReturnType<typeof useTrackingAggregation>);
  });

  it('should_render_all_tracking_types', () => {
    render(<MetricCardsGrid />);

    // Should display all 6 main tracking types
    expect(screen.getByText('Peso')).toBeInTheDocument();
    expect(screen.getByText('Água')).toBeInTheDocument();
    expect(screen.getByText('Sono')).toBeInTheDocument();
    expect(screen.getByText('Exercício')).toBeInTheDocument();
    expect(screen.getByText('Humor')).toBeInTheDocument();
    expect(screen.getByText('Energia')).toBeInTheDocument();
  });
});
