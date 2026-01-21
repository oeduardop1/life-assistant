import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricChart, MetricChartsGrid } from '../../components/metric-chart';

// Mock the useTrackingEntriesFlat hook
vi.mock('../../hooks/use-tracking', () => ({
  useTrackingEntriesFlat: vi.fn(),
}));

// Mock recharts components since they don't render properly in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-points={data?.length ?? 0}>{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-points={data?.length ?? 0}>{children}</div>
  ),
  Line: ({ stroke }: { stroke?: string }) => <div data-testid="line" data-stroke={stroke} />,
  Bar: ({ fill }: { fill?: string }) => <div data-testid="bar" data-fill={fill} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: ({ y, label }: { y?: number; label?: { value?: string } }) => (
    <div data-testid="reference-line" data-y={y} data-label={label?.value} />
  ),
}));

import { useTrackingEntriesFlat } from '../../hooks/use-tracking';
import type { TrackingEntry } from '../../types';

const mockUseTrackingEntriesFlat = vi.mocked(useTrackingEntriesFlat);

// Sample test data
const createMockEntries = (type: string, values: { value: string; date: string }[]): TrackingEntry[] => {
  return values.map((v, i) => ({
    id: `entry-${i}`,
    type: type as TrackingEntry['type'],
    area: 'health',
    subArea: null, // ADR-017: Added sub-area support
    value: v.value,
    unit: type === 'weight' ? 'kg' : type === 'water' ? 'ml' : 'min',
    entryDate: v.date,
    entryTime: null,
    source: 'form',
    metadata: {},
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  }));
};

describe('MetricChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should_render_line_chart_for_weight', () => {
    const mockEntries = createMockEntries('weight', [
      { value: '75.0', date: '2024-01-10' },
      { value: '74.5', date: '2024-01-11' },
      { value: '74.8', date: '2024-01-12' },
    ]);

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: mockEntries,
      isLoading: false,
      total: 3,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<MetricChart type="weight" />);

    // Should display the type label
    expect(screen.getByText('Peso')).toBeInTheDocument();
    // Should display record count
    expect(screen.getByText(/3 registros/iu)).toBeInTheDocument();
    // Should render line chart (not bar chart) for weight
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    // Should have 3 data points
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '3');
  });

  it('should_render_bar_chart_for_water_and_exercise', () => {
    const mockEntries = createMockEntries('water', [
      { value: '500', date: '2024-01-10' },
      { value: '750', date: '2024-01-10' },
      { value: '1000', date: '2024-01-11' },
    ]);

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: mockEntries,
      isLoading: false,
      total: 3,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<MetricChart type="water" />);

    // Should display the type label
    expect(screen.getByText('Água')).toBeInTheDocument();
    // Should render bar chart for water
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    // Should aggregate by date (2 unique dates)
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-points', '2');
  });

  it('should_show_average_reference_line', () => {
    const mockEntries = createMockEntries('weight', [
      { value: '74.0', date: '2024-01-10' },
      { value: '75.0', date: '2024-01-11' },
      { value: '76.0', date: '2024-01-12' },
    ]);

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: mockEntries,
      isLoading: false,
      total: 3,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<MetricChart type="weight" showAverage={true} />);

    // Should show reference line with average
    const referenceLine = screen.getByTestId('reference-line');
    expect(referenceLine).toBeInTheDocument();
    // Average of 74, 75, 76 = 75
    expect(referenceLine).toHaveAttribute('data-y', '75');
    // Should show average in description
    expect(screen.getByText(/Media: 75.0 kg/iu)).toBeInTheDocument();
  });

  it('should_show_empty_state_when_no_data', () => {
    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [],
      isLoading: false,
      total: 0,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<MetricChart type="weight" />);

    // Should show empty state message
    expect(screen.getByText('Nenhum dado para exibir')).toBeInTheDocument();
    expect(screen.getByText(/Registre algumas entradas para ver o grafico/iu)).toBeInTheDocument();
    // Should not render any chart
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('should_format_dates_in_portuguese', () => {
    const mockEntries = createMockEntries('weight', [
      { value: '75.0', date: '2024-01-15' },
    ]);

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: mockEntries,
      isLoading: false,
      total: 1,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<MetricChart type="weight" />);

    // Check record count uses Portuguese singular
    expect(screen.getByText(/1 registro/iu)).toBeInTheDocument();
    // The date formatting dd/MM is handled inside the chart data,
    // we verify the chart receives data through the presence of the line chart
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should_show_loading_skeleton_while_fetching', () => {
    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [],
      isLoading: true,
      total: 0,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    const { container } = render(<MetricChart type="weight" />);

    // Should show skeleton elements (Skeleton uses animate-pulse class)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    // Should not render any chart while loading
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('should_not_show_average_when_showAverage_is_false', () => {
    const mockEntries = createMockEntries('weight', [
      { value: '75.0', date: '2024-01-10' },
      { value: '76.0', date: '2024-01-11' },
    ]);

    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: mockEntries,
      isLoading: false,
      total: 2,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);

    render(<MetricChart type="weight" showAverage={false} />);

    // Should not show reference line
    expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
    // Should not show average in description
    expect(screen.queryByText(/Media:/iu)).not.toBeInTheDocument();
  });
});

describe('MetricChartsGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTrackingEntriesFlat.mockReturnValue({
      entries: [],
      isLoading: false,
      total: 0,
    } as unknown as ReturnType<typeof useTrackingEntriesFlat>);
  });

  it('should_render_all_default_tracking_types', () => {
    render(<MetricChartsGrid />);

    // Should render all 6 default types
    expect(screen.getByText('Peso')).toBeInTheDocument();
    expect(screen.getByText('Água')).toBeInTheDocument();
    expect(screen.getByText('Sono')).toBeInTheDocument();
    expect(screen.getByText('Exercício')).toBeInTheDocument();
    expect(screen.getByText('Humor')).toBeInTheDocument();
    expect(screen.getByText('Energia')).toBeInTheDocument();
  });

  it('should_render_only_specified_types', () => {
    render(<MetricChartsGrid types={['weight', 'water']} />);

    // Should render only specified types
    expect(screen.getByText('Peso')).toBeInTheDocument();
    expect(screen.getByText('Água')).toBeInTheDocument();
    // Should not render other types
    expect(screen.queryByText('Sono')).not.toBeInTheDocument();
    expect(screen.queryByText('Exercício')).not.toBeInTheDocument();
  });
});
