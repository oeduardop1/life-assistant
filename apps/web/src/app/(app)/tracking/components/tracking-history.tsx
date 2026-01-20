'use client';

import { useState } from 'react';
import { Scale, Droplet, Moon, Activity, Smile, Zap, PenLine, Trash2, MoreVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useTrackingEntriesFlat, useDeleteTrackingEntry } from '../hooks/use-tracking';
import {
  type TrackingType,
  type TrackingEntry,
  trackingTypeLabels,
  formatTrackingValue,
  sourceLabels,
} from '../types';

// Icons mapping
const typeIcons: Record<TrackingType, React.ReactNode> = {
  weight: <Scale className="h-4 w-4" />,
  water: <Droplet className="h-4 w-4" />,
  sleep: <Moon className="h-4 w-4" />,
  exercise: <Activity className="h-4 w-4" />,
  mood: <Smile className="h-4 w-4" />,
  energy: <Zap className="h-4 w-4" />,
  custom: <PenLine className="h-4 w-4" />,
};

// Color classes mapping
const typeColorClasses: Record<TrackingType, string> = {
  weight: 'bg-blue-500/10 text-blue-500',
  water: 'bg-cyan-500/10 text-cyan-500',
  sleep: 'bg-indigo-500/10 text-indigo-500',
  exercise: 'bg-green-500/10 text-green-500',
  mood: 'bg-yellow-500/10 text-yellow-500',
  energy: 'bg-orange-500/10 text-orange-500',
  custom: 'bg-gray-500/10 text-gray-500',
};

/**
 * Format relative time in Portuguese
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'agora mesmo';
  if (diffMin < 60) return `ha ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
  if (diffHours < 24) return `ha ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  if (diffDays < 7) return `ha ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `ha ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  const months = Math.floor(diffDays / 30);
  return `ha ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

interface TrackingHistoryProps {
  limit?: number;
}

/**
 * Tracking history list with filters
 *
 * @see docs/milestones/phase-2-tracker.md M2.1
 */
export function TrackingHistory({ limit = 20 }: TrackingHistoryProps) {
  const [typeFilter, setTypeFilter] = useState<TrackingType | 'all'>('all');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const {
    entries,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useTrackingEntriesFlat({
    type: typeFilter === 'all' ? undefined : typeFilter,
    limit,
  });

  const deleteEntry = useDeleteTrackingEntry();

  const handleDelete = async () => {
    if (!entryToDelete) return;

    try {
      await deleteEntry.mutateAsync(entryToDelete);
      toast.success('Registro removido com sucesso.');
    } catch {
      toast.error('Erro ao remover. Tente novamente em alguns instantes.');
    } finally {
      setEntryToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historico</CardTitle>
            <CardDescription>
              {total > 0 ? `${total} registros` : 'Nenhum registro ainda'}
            </CardDescription>
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TrackingType | 'all')}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(trackingTypeLabels) as TrackingType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    {typeIcons[type]}
                    {trackingTypeLabels[type]}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum registro encontrado
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <TrackingEntryRow
                key={entry.id}
                entry={entry}
                onDelete={() => setEntryToDelete(entry.id)}
              />
            ))}

            {hasNextPage && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar mais'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O registro sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEntry.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// =============================================================================
// TrackingEntryRow Component
// =============================================================================

interface TrackingEntryRowProps {
  entry: TrackingEntry;
  onDelete: () => void;
}

function TrackingEntryRow({ entry, onDelete }: TrackingEntryRowProps) {
  const type = entry.type as TrackingType;
  const formattedValue = formatTrackingValue(entry.value, entry.unit);
  const timeAgo = formatTimeAgo(entry.createdAt);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${typeColorClasses[type]}`}>
          {typeIcons[type]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{trackingTypeLabels[type]}</span>
            <span className="text-lg font-semibold">{formattedValue}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{entry.entryDate}</span>
            <span>-</span>
            <span>{sourceLabels[entry.source]}</span>
            <span>-</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
