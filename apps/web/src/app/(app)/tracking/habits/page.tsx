'use client';

import { useState, useMemo, useCallback } from 'react';
import { ListChecks, LayoutGrid, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HabitSelector,
  HabitDetailPanel,
  HabitDetailPanelSkeleton,
  HabitPeriodGrouping,
  CreateHabitModal,
  EditHabitModal,
  DeleteHabitDialog,
} from '../components/habits';
import { useHabits } from '../hooks/use-habits';
import type { HabitWithStreak } from '../types';

type ViewMode = 'selector' | 'period';

/**
 * Habits management page
 *
 * Features:
 * - Horizontal habit selector for navigation
 * - Detail panel with heatmap, stats, and timeline
 * - CRUD operations via modals
 *
 * @see docs/specs/domains/tracking.md §5 for Habits spec
 */
export default function HabitsPage() {
  const { data: habits, isLoading, isError } = useHabits();
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStreak | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<HabitWithStreak | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('selector');

  // Derive the effective selected habit ID
  // - Use selectedHabitId if it exists and is valid
  // - Otherwise fall back to first habit
  const effectiveSelectedId = useMemo(() => {
    if (!habits || habits.length === 0) return null;
    if (selectedHabitId && habits.some((h) => h.id === selectedHabitId)) {
      return selectedHabitId;
    }
    return habits[0]?.id ?? null;
  }, [habits, selectedHabitId]);

  const selectedHabit = habits?.find((h) => h.id === effectiveSelectedId);

  const handleSelectHabit = useCallback((id: string) => {
    setSelectedHabitId(id);
  }, []);

  const handleEdit = () => {
    if (selectedHabit) {
      setEditingHabit(selectedHabit);
    }
  };

  const handleArchive = () => {
    if (selectedHabit) {
      setDeletingHabit(selectedHabit);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Hábitos</h1>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => setViewMode('selector')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'selector'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Vista por seletor"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('period')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'period'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Vista por período do dia"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Período</span>
          </button>
        </div>
      </div>

      {/* Navigation - Selector or Period Grouping */}
      {viewMode === 'selector' ? (
        <HabitSelector
          habits={habits ?? []}
          selectedId={effectiveSelectedId}
          onSelect={handleSelectHabit}
          onCreateNew={() => setIsCreateOpen(true)}
          isLoading={isLoading}
        />
      ) : (
        <HabitPeriodGrouping
          habits={habits ?? []}
          selectedId={effectiveSelectedId}
          onSelect={handleSelectHabit}
          onCreateNew={() => setIsCreateOpen(true)}
          isLoading={isLoading}
        />
      )}

      {/* Main Content */}
      {isError ? (
        <div className="rounded-2xl border p-12 text-center">
          <p className="text-muted-foreground">
            Erro ao carregar hábitos. Tente novamente.
          </p>
        </div>
      ) : isLoading ? (
        <HabitDetailPanelSkeleton />
      ) : selectedHabit ? (
        <HabitDetailPanel
          habit={selectedHabit}
          onEdit={handleEdit}
          onArchive={handleArchive}
        />
      ) : habits && habits.length === 0 ? (
        <EmptyState onCreateNew={() => setIsCreateOpen(true)} />
      ) : null}

      {/* Modals */}
      <CreateHabitModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <EditHabitModal
        habit={editingHabit}
        onClose={() => setEditingHabit(null)}
      />

      <DeleteHabitDialog
        habit={deletingHabit}
        onClose={() => setDeletingHabit(null)}
      />
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="rounded-2xl border p-12 text-center bg-gradient-to-br from-background to-muted/20">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-muted mb-4">
        <ListChecks className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nenhum hábito criado</h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">
        Crie hábitos para acompanhar sua rotina diária e construir consistência
        ao longo do tempo.
      </p>
      <button
        onClick={onCreateNew}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Criar primeiro hábito
      </button>
    </div>
  );
}
