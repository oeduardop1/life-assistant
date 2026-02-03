'use client';

import { useState, useMemo } from 'react';
import { Plus, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ManualTrackForm,
  MetricsPageFilters,
  MetricSelector,
  MetricDetailPanel,
  InsightsPlaceholder,
  GroupedTimeline,
  type PeriodFilter,
} from '../components';
import { type TrackingType } from '../types';

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
  const [selectedType, setSelectedType] = useState<TrackingType>('weight');
  const [showForm, setShowForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Calculate date range based on period
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    start.setDate(end.getDate() - days + 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Header with filters and action button */}
      <div className="flex items-center justify-between gap-4">
        <MetricsPageFilters period={period} onPeriodChange={setPeriod} />
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Métrica
        </Button>
      </div>

      {/* Metric Type Selector */}
      <MetricSelector
        selected={selectedType}
        onSelect={setSelectedType}
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
          {showTimeline ? 'Ocultar histórico' : 'Ver histórico completo'}
        </button>

        {showTimeline && (
          <GroupedTimeline
            startDate={startDate}
            endDate={endDate}
            filterType={selectedType}
          />
        )}
      </div>

      {/* New metric form modal */}
      <ManualTrackForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
