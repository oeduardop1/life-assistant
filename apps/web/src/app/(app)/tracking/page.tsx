'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TrackingEmptyState,
  ManualTrackForm,
  TrackingHistory,
  MetricCardsGrid,
} from './components';
import { useHasTrackingData } from './hooks/use-tracking';

/**
 * Tracking page - View and manage health metrics
 *
 * Features:
 * - Dashboard with metric cards showing latest values and trends
 * - Manual entry form for recording metrics
 * - History list with filters
 * - Empty state encouraging chat-based tracking
 *
 * @see docs/milestones/phase-2-tracker.md M2.1 for Tracking implementation
 * @see ADR-015 for Low Friction Tracking Philosophy
 */
export default function TrackingPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { hasData, isLoading } = useHasTrackingData();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tracking</h1>
            <p className="text-muted-foreground">
              Carregando...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - encourage user to track via chat
  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tracking</h1>
            <p className="text-muted-foreground">
              Acompanhe suas metricas de saude e bem-estar
            </p>
          </div>
        </div>

        <TrackingEmptyState onOpenForm={() => setIsFormOpen(true)} />

        <ManualTrackForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />
      </div>
    );
  }

  // Main view with data
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tracking</h1>
          <p className="text-muted-foreground">
            Acompanhe suas metricas de saude e bem-estar
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Registro
        </Button>
      </div>

      {/* Metric Cards Grid */}
      <MetricCardsGrid />

      {/* History */}
      <TrackingHistory />

      {/* Form Modal */}
      <ManualTrackForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
