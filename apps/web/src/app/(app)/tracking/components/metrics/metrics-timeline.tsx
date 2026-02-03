'use client';

import { useState } from 'react';
import {
  Scale,
  Droplet,
  Moon,
  Activity,
  Smile,
  Zap,
  PenLine,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTrackingEntriesFlat } from '../../hooks/use-tracking';
import {
  trackingTypeLabels,
  trackingTypeColors,
  type TrackingEntry,
  type TrackingType,
} from '../../types';
import { EditMetricModal } from './edit-metric-modal';
import { DeleteMetricDialog } from './delete-metric-dialog';

// Icon mapping for tracking types
const typeIcons: Record<TrackingType, LucideIcon> = {
  weight: Scale,
  water: Droplet,
  sleep: Moon,
  exercise: Activity,
  mood: Smile,
  energy: Zap,
  custom: PenLine,
};

interface MetricsTimelineProps {
  type?: TrackingType;
  startDate: string;
  endDate: string;
}

/**
 * Timeline showing recent tracking entries with edit/delete actions
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function MetricsTimeline({
  type,
  startDate,
  endDate,
}: MetricsTimelineProps) {
  const { entries, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTrackingEntriesFlat({
      type,
      startDate,
      endDate,
      limit: 20,
    });

  const [editingEntry, setEditingEntry] = useState<TrackingEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<TrackingEntry | null>(
    null
  );

  if (isLoading) {
    return <MetricsTimelineSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma entrada no período selecionado.</p>
        <p className="text-sm mt-1">
          Adicione métricas para ver seu histórico.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {entries.map((entry) => (
          <TimelineItem
            key={entry.id}
            entry={entry}
            onEdit={() => setEditingEntry(entry)}
            onDelete={() => setDeletingEntry(entry)}
          />
        ))}

        {hasNextPage && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
          </Button>
        )}
      </div>

      <EditMetricModal
        entry={editingEntry}
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      />

      <DeleteMetricDialog
        entry={deletingEntry}
        open={!!deletingEntry}
        onOpenChange={(open) => !open && setDeletingEntry(null)}
      />
    </>
  );
}

interface TimelineItemProps {
  entry: TrackingEntry;
  onEdit: () => void;
  onDelete: () => void;
}

function TimelineItem({ entry, onEdit, onDelete }: TimelineItemProps) {
  const Icon = typeIcons[entry.type];
  const date = new Date(entry.entryDate + 'T00:00:00');
  const time = entry.entryTime
    ? new Date(entry.entryTime).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full bg-muted',
            trackingTypeColors[entry.type]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium">
            {trackingTypeLabels[entry.type]}: {entry.value} {entry.unit}
          </p>
          <p className="text-sm text-muted-foreground">
            {date.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
            {time && ` às ${time}`}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          aria-label="Editar métrica"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="Excluir métrica"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for the timeline
 */
export function MetricsTimelineSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
