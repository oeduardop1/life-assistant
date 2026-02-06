'use client';

import { useState, useMemo } from 'react';
import { Plus, History, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ManualTrackForm,
  MetricsPageFilters,
  MetricSelector,
  MetricDetailPanel,
  InsightsPlaceholder,
  GroupedTimeline,
  type PeriodFilter,
  type MetricSelection,
  parseMetricSelection,
} from '../components';
import { CustomMetricsManager } from '../components/custom-metrics';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { getTodayInTimezone, getDateDaysAgo } from '@life-assistant/shared';

/**
 * Metrics page for tracking module - Redesigned
 *
 * Layout structure:
 * 1. Header with period filters + add button
 * 2. MetricSelector (horizontal pills to choose metric)
 * 3. MetricDetailPanel (unified chart + stats + consistency)
 * 4. InsightsPlaceholder (teaser for M2.5)
 * 5. GroupedTimeline (entries grouped by day)
 *
 * @see docs/specs/domains/tracking.md §3.5 for Aba Métricas specification
 * @see docs/milestones/phase-2-tracker.md M2.1 for implementation tasks
 */
export default function MetricsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedMetric, setSelectedMetric] = useState<MetricSelection>('weight');
  const [showForm, setShowForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showCustomMetricsManager, setShowCustomMetricsManager] = useState(false);

  // Parse selection to get effective type for detail panel
  const { type: selectedType } = useMemo(
    () => parseMetricSelection(selectedMetric),
    [selectedMetric]
  );

  // Get user timezone for date calculations
  const timezone = useUserTimezone();

  // Calculate date range based on period (timezone-aware)
  const { startDate, endDate } = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return {
      startDate: getDateDaysAgo(days - 1, timezone),
      endDate: getTodayInTimezone(timezone),
    };
  }, [period, timezone]);

  return (
    <div className="space-y-6">
      {/* Header with filters and action buttons */}
      <div className="flex items-center justify-between gap-4">
        <MetricsPageFilters period={period} onPeriodChange={setPeriod} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCustomMetricsManager(!showCustomMetricsManager)}
            size="sm"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Gerenciar
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Registrar
          </Button>
        </div>
      </div>

      {/* Custom Metrics Manager (collapsible) */}
      {showCustomMetricsManager && (
        <CustomMetricsManager />
      )}

      {/* Metric Type Selector */}
      <MetricSelector
        selected={selectedMetric}
        onSelect={setSelectedMetric}
        includeCustomMetrics
      />

      {/* Main Detail Panel - Chart + Stats + Consistency unified */}
      <MetricDetailPanel
        type={selectedType}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Insights Teaser - Placeholder for M2.5 */}
      <InsightsPlaceholder type={selectedType} />

      {/* Timeline Toggle Section */}
      <div>
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <History className="h-4 w-4" />
          {showTimeline ? 'Ocultar registros' : 'Ver registros'}
        </button>

        {showTimeline && (
          <GroupedTimeline filterType={selectedType} />
        )}
      </div>

      {/* New metric form modal */}
      <ManualTrackForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
