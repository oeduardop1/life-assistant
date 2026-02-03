'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTrackingEntriesFlat } from '../../hooks/use-tracking';
import {
  trackingTypeLabels,
  trackingTypeIcons,
  trackingTypeColors,
  type TrackingEntry,
  type TrackingType,
} from '../../types';
import { EditMetricModal } from './edit-metric-modal';
import { DeleteMetricDialog } from './delete-metric-dialog';

interface MetricsTimelineProps {
  startDate: string;
  endDate: string;
}

const TRACKING_TYPES: TrackingType[] = ['weight', 'water', 'sleep', 'exercise', 'mood', 'energy'];

/**
 * Timeline showing recent tracking entries with edit/delete actions
 * Includes internal type filter dropdown per tracking.md §3.5
 *
 * @see docs/specs/domains/tracking.md §3.5 for metrics page specification
 */
export function MetricsTimeline({
  startDate,
  endDate,
}: MetricsTimelineProps) {
  const [filterType, setFilterType] = useState<TrackingType | 'all'>('all');

  const { entries, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTrackingEntriesFlat({
      type: filterType === 'all' ? undefined : filterType,
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

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
        </p>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as TrackingType | 'all')}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TRACKING_TYPES.map((t) => {
              const Icon = trackingTypeIcons[t];
              return (
                <SelectItem key={t} value={t}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {trackingTypeLabels[t]}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nenhuma entrada no período selecionado.</p>
          <p className="text-sm mt-1">
            Adicione métricas para ver seu histórico.
          </p>
        </div>
      ) : (
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
      )}

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
  const Icon = trackingTypeIcons[entry.type];
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
