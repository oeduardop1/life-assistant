'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ManualTrackForm,
  MetricCard,
  MetricChart,
  MetricsPageFilters,
  MetricsStatsTable,
  MetricsConsistencyBars,
  MetricsTimeline,
  type PeriodFilter,
} from '../components';
import type { TrackingType } from '../types';

/**
 * Metrics page for tracking module
 *
 * @see docs/specs/domains/tracking.md §3.5 for Aba Métricas specification
 * @see docs/milestones/phase-2-tracker.md M2.1 for implementation tasks
 */
export default function MetricsPage() {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedType, setSelectedType] = useState<TrackingType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

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

  const trackingTypes: TrackingType[] = [
    'weight',
    'water',
    'sleep',
    'exercise',
    'mood',
    'energy',
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters and action button */}
      <div className="flex items-center justify-between">
        <MetricsPageFilters
          period={period}
          onPeriodChange={setPeriod}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
        />
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Métrica
        </Button>
      </div>

      {/* Section 1: Summary Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Resumo</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {trackingTypes.map((type) => (
            <MetricCard
              key={type}
              type={type}
              startDate={startDate}
              endDate={endDate}
            />
          ))}
        </div>
      </section>

      {/* Section 2: Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricChart
            type={selectedType === 'all' ? 'weight' : selectedType}
            startDate={startDate}
            endDate={endDate}
            height={300}
            showAverage
          />
        </CardContent>
      </Card>

      {/* Section 3: Statistics Table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Estatísticas</h2>
        <MetricsStatsTable startDate={startDate} endDate={endDate} />
      </section>

      {/* Section 4: Consistency Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Consistência</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricsConsistencyBars startDate={startDate} endDate={endDate} />
        </CardContent>
      </Card>

      {/* Section 5: Timeline */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Últimas Entradas</h2>
        <MetricsTimeline
          type={selectedType === 'all' ? undefined : selectedType}
          startDate={startDate}
          endDate={endDate}
        />
      </section>

      {/* New metric form modal */}
      <ManualTrackForm open={showForm} onOpenChange={setShowForm} />
    </div>
  );
}
