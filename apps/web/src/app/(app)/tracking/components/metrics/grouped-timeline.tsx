'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTrackingEntriesFlat } from '../../hooks/use-tracking';
import {
  trackingTypeLabels,
  trackingTypeIcons,
  defaultUnits,
  type TrackingEntry,
  type TrackingType,
} from '../../types';
import { metricColors } from './metric-selector';
import { EditMetricModal } from './edit-metric-modal';
import { DeleteMetricDialog } from './delete-metric-dialog';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { getTodayInTimezone } from '@life-assistant/shared';

interface GroupedTimelineProps {
  startDate?: string;
  endDate?: string;
  filterType?: TrackingType | 'all';
}

interface DayGroup {
  date: string;
  label: string;
  entries: TrackingEntry[];
}

/**
 * GroupedTimeline - Timeline with entries grouped by day
 *
 * Features:
 * - Groups entries by day with collapsible sections
 * - "Hoje", "Ontem", or formatted date labels
 * - Entry count per day
 * - Edit/delete actions in kebab menu
 * - Smooth expand/collapse animations
 */
export function GroupedTimeline({
  startDate,
  endDate,
  filterType = 'all',
}: GroupedTimelineProps) {
  const { entries, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTrackingEntriesFlat({
      type: filterType === 'all' ? undefined : filterType,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      limit: 50,
    });

  const timezone = useUserTimezone();
  const today = getTodayInTimezone(timezone);

  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<TrackingEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<TrackingEntry | null>(null);

  // Group entries by day
  const groupedEntries = useMemo<DayGroup[]>(() => {
    if (!entries || entries.length === 0) return [];

    const groups = new Map<string, TrackingEntry[]>();

    for (const entry of entries) {
      const date = entry.entryDate;
      const existing = groups.get(date) ?? [];
      groups.set(date, [...existing, entry]);
    }

    // Sort by date descending and format labels
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, dayEntries]) => ({
        date,
        label: formatDayLabel(date, today),
        entries: dayEntries.sort((a, b) => {
          // Sort by time descending within each day
          const timeA = a.entryTime ?? '';
          const timeB = b.entryTime ?? '';
          return timeB.localeCompare(timeA);
        }),
      }));
  }, [entries, today]);

  // Auto-expand first 2 days on initial load
  const initialExpandedDays = useMemo(() => {
    if (groupedEntries.length > 0) {
      return new Set(groupedEntries.slice(0, 2).map((g) => g.date));
    }
    return new Set<string>();
  }, [groupedEntries]);

  // Initialize expandedDays from computed value (only on first render with data)
  const [hasInitialized, setHasInitialized] = useState(false);
  if (!hasInitialized && initialExpandedDays.size > 0 && expandedDays.size === 0) {
    setExpandedDays(initialExpandedDays);
    setHasInitialized(true);
  }

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (isLoading) {
    return <GroupedTimelineSkeleton />;
  }

  if (groupedEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum registro encontrado.</p>
        <p className="text-sm mt-1">
          Adicione métricas para ver seus registros.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {groupedEntries.map((group) => {
          const isExpanded = expandedDays.has(group.date);

          return (
            <div
              key={group.date}
              className="rounded-xl border bg-card overflow-hidden"
            >
              {/* Day Header - Always visible */}
              <button
                onClick={() => toggleDay(group.date)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                  <span className="font-medium">{group.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {group.entries.length} {group.entries.length === 1 ? 'registro' : 'registros'}
                </span>
              </button>

              {/* Entries - Collapsible */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t divide-y">
                      {group.entries.map((entry, index) => (
                        <TimelineEntry
                          key={entry.id}
                          entry={entry}
                          onEdit={() => setEditingEntry(entry)}
                          onDelete={() => setDeletingEntry(entry)}
                          isLast={index === group.entries.length - 1}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Load more */}
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

      {/* Modals */}
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

// =============================================================================
// Sub-components
// =============================================================================

interface TimelineEntryProps {
  entry: TrackingEntry;
  onEdit: () => void;
  onDelete: () => void;
  isLast: boolean;
}

function TimelineEntry({ entry, onEdit, onDelete }: TimelineEntryProps) {
  const Icon = trackingTypeIcons[entry.type];
  const colors = metricColors[entry.type];
  const unit = entry.unit || defaultUnits[entry.type];

  const time = entry.entryTime
    ? format(parseISO(entry.entryTime), 'HH:mm', { locale: ptBR })
    : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-3">
        {/* Time */}
        <span className="text-xs text-muted-foreground w-12 shrink-0">
          {time ?? '--:--'}
        </span>

        {/* Icon */}
        <div className={cn('p-1.5 rounded-lg', colors.bg)}>
          <Icon className={cn('h-3.5 w-3.5', colors.text)} />
        </div>

        {/* Content */}
        <div>
          <span className="text-sm font-medium">
            {trackingTypeLabels[entry.type]}
          </span>
          <span className="text-sm text-muted-foreground ml-2">
            {formatEntryValue(parseFloat(entry.value), unit)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GroupedTimelineSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatDayLabel(dateStr: string, today: string): string {
  try {
    // Check if dateStr is today or yesterday using string comparison (timezone-aware)
    if (dateStr === today) return 'Hoje';

    // Calculate yesterday's date string
    const todayDate = parseISO(today);
    const yesterdayDate = subDays(todayDate, 1);
    const yesterdayStr = format(yesterdayDate, 'yyyy-MM-dd');

    if (dateStr === yesterdayStr) return 'Ontem';

    const date = parseISO(dateStr);
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function formatEntryValue(value: number, unit: string): string {
  if (unit === 'kg') return `${value.toFixed(1)} ${unit}`;
  if (unit === 'ml') return `${value.toLocaleString('pt-BR')} ${unit}`;
  if (unit === 'horas' || unit === 'hours') return `${value.toFixed(1)}h`;
  if (unit === 'min') return `${value} ${unit}`;
  if (unit === 'pontos' || unit === 'score') return `${value}/10`;
  return `${value} ${unit}`;
}
