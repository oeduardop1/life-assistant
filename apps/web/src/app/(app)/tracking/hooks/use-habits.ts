'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/hooks/use-authenticated-api';
import type {
  HabitsListResponse,
  HabitResponse,
  HabitStreaksResponse,
  HabitCompleteResponse,
  HabitCompletionsWithStats,
  HabitWithStreak,
  HabitStreakInfo,
  CreateHabitInput,
  UpdateHabitInput,
} from '../types';
import { calendarKeys } from './use-calendar';

// =============================================================================
// Query Keys
// =============================================================================

export const habitsKeys = {
  all: ['habits'] as const,
  list: () => [...habitsKeys.all, 'list'] as const,
  listWithInactive: () => [...habitsKeys.all, 'list', 'includeInactive'] as const,
  habit: (id: string) => [...habitsKeys.all, 'detail', id] as const,
  streaks: () => [...habitsKeys.all, 'streaks'] as const,
  completions: (id: string, startDate?: string, endDate?: string) =>
    [...habitsKeys.all, 'completions', id, startDate, endDate] as const,
};

// =============================================================================
// List Habits
// =============================================================================

/**
 * Hook to fetch all habits for the current user
 */
export function useHabits(includeInactive = false) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: includeInactive ? habitsKeys.listWithInactive() : habitsKeys.list(),
    queryFn: async () => {
      const params = includeInactive ? '?includeInactive=true' : '';
      const response = await api.get<HabitsListResponse>(`/habits${params}`);
      return response.habits;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =============================================================================
// Single Habit
// =============================================================================

/**
 * Hook to fetch a single habit by ID
 */
export function useHabit(habitId: string | null) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: habitsKeys.habit(habitId ?? ''),
    queryFn: async () => {
      const response = await api.get<HabitResponse>(`/habits/${habitId}`);
      return response.habit;
    },
    enabled: api.isAuthenticated && !!habitId,
  });
}

// =============================================================================
// Habit Streaks
// =============================================================================

/**
 * Hook to fetch streaks for all habits
 */
export function useHabitStreaks() {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: habitsKeys.streaks(),
    queryFn: async () => {
      const response = await api.get<HabitStreaksResponse>('/habits/streaks');
      return response.streaks;
    },
    enabled: api.isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =============================================================================
// Habit Completions with Stats
// =============================================================================

/**
 * Hook to fetch habit completions with calculated statistics
 *
 * Returns completions for the specified date range (default 12 weeks)
 * along with stats: totalCompletions, completionRate, currentStreak, longestStreak
 *
 * @param habitId - The habit ID to fetch completions for
 * @param startDate - Optional start date (YYYY-MM-DD). Defaults to 84 days ago.
 * @param endDate - Optional end date (YYYY-MM-DD). Defaults to today.
 */
export function useHabitCompletions(
  habitId: string | null,
  startDate?: string,
  endDate?: string
) {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: habitsKeys.completions(habitId ?? '', startDate, endDate),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const queryString = params.toString();
      const url = `/habits/${habitId}/completions${queryString ? `?${queryString}` : ''}`;
      return api.get<HabitCompletionsWithStats>(url);
    },
    enabled: api.isAuthenticated && !!habitId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// =============================================================================
// Create Habit
// =============================================================================

/**
 * Hook to create a new habit
 */
export function useCreateHabit() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHabitInput) => {
      const response = await api.post<HabitResponse>('/habits', data);
      return response.habit;
    },
    onSuccess: () => {
      // Invalidate habits list and streaks
      queryClient.invalidateQueries({ queryKey: habitsKeys.list() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.listWithInactive() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.streaks() });
      // Invalidate all calendar queries (new habit affects all days)
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

// =============================================================================
// Update Habit
// =============================================================================

/**
 * Hook to update a habit
 */
export function useUpdateHabit() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habitId,
      data,
    }: {
      habitId: string;
      data: UpdateHabitInput;
    }) => {
      const response = await api.patch<HabitResponse>(`/habits/${habitId}`, data);
      return response.habit;
    },
    onSuccess: (updatedHabit) => {
      // Update cache for the specific habit
      queryClient.setQueryData(habitsKeys.habit(updatedHabit.id), updatedHabit);
      // Invalidate habits list and streaks
      queryClient.invalidateQueries({ queryKey: habitsKeys.list() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.listWithInactive() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.streaks() });
      // Invalidate all calendar queries (habit changes affect all days)
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

// =============================================================================
// Delete Habit
// =============================================================================

/**
 * Hook to delete a habit (soft delete)
 */
export function useDeleteHabit() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (habitId: string) => api.delete<void>(`/habits/${habitId}`),
    onSuccess: (_data, habitId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: habitsKeys.habit(habitId) });
      // Invalidate habits list and streaks
      queryClient.invalidateQueries({ queryKey: habitsKeys.list() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.listWithInactive() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.streaks() });
      // Invalidate all calendar queries (deleted habit affects all days)
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

// =============================================================================
// Complete Habit
// =============================================================================

/**
 * Hook to mark a habit as completed
 *
 * Supports optimistic updates for instant UI feedback
 */
export function useCompleteHabit() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habitId,
      date,
      notes,
    }: {
      habitId: string;
      date?: string;
      notes?: string;
    }) => {
      const body = { date, notes };
      const response = await api.post<HabitCompleteResponse>(
        `/habits/${habitId}/complete`,
        body
      );
      return response;
    },
    onMutate: async ({ habitId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: habitsKeys.list() });

      // Snapshot the previous value
      const previousHabits = queryClient.getQueryData<HabitWithStreak[]>(
        habitsKeys.list()
      );

      // Optimistically update the streak
      if (previousHabits) {
        queryClient.setQueryData<HabitWithStreak[]>(
          habitsKeys.list(),
          previousHabits.map((habit) =>
            habit.id === habitId
              ? { ...habit, currentStreak: habit.currentStreak + 1 }
              : habit
          )
        );
      }

      return { previousHabits };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousHabits) {
        queryClient.setQueryData(habitsKeys.list(), context.previousHabits);
      }
    },
    onSettled: (_data, _error, { date }) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: habitsKeys.list() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.streaks() });
      // Also invalidate calendar queries to update the modal and calendar UI
      if (date) {
        queryClient.invalidateQueries({ queryKey: calendarKeys.day(date) });
        // Parse date (YYYY-MM-DD) to invalidate month view
        const [year, month] = date.split('-').map(Number);
        queryClient.invalidateQueries({ queryKey: calendarKeys.month(year, month) });
      }
    },
  });
}

// =============================================================================
// Uncomplete Habit
// =============================================================================

/**
 * Hook to remove a habit completion (uncomplete)
 *
 * Supports optimistic updates for instant UI feedback
 */
export function useUncompleteHabit() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      habitId,
      date,
    }: {
      habitId: string;
      date: string;
    }) => {
      // Using request directly since delete doesn't support body
      const response = await api.request<{ success: boolean; habit: HabitWithStreak }>(
        `/habits/${habitId}/uncomplete`,
        { method: 'DELETE', data: { date } }
      );
      return response;
    },
    onMutate: async ({ habitId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: habitsKeys.list() });

      // Snapshot the previous value
      const previousHabits = queryClient.getQueryData<HabitWithStreak[]>(
        habitsKeys.list()
      );

      // Optimistically update the streak
      if (previousHabits) {
        queryClient.setQueryData<HabitWithStreak[]>(
          habitsKeys.list(),
          previousHabits.map((habit) =>
            habit.id === habitId
              ? { ...habit, currentStreak: Math.max(0, habit.currentStreak - 1) }
              : habit
          )
        );
      }

      return { previousHabits };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousHabits) {
        queryClient.setQueryData(habitsKeys.list(), context.previousHabits);
      }
    },
    onSettled: (_data, _error, { date }) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: habitsKeys.list() });
      queryClient.invalidateQueries({ queryKey: habitsKeys.streaks() });
      // Also invalidate calendar queries to update the modal and calendar UI
      queryClient.invalidateQueries({ queryKey: calendarKeys.day(date) });
      // Parse date (YYYY-MM-DD) to invalidate month view
      const [year, month] = date.split('-').map(Number);
      queryClient.invalidateQueries({ queryKey: calendarKeys.month(year, month) });
    },
  });
}

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * Hook to check if user has any habits
 */
export function useHasHabits() {
  const { data: habits, isLoading } = useHabits();

  return {
    hasHabits: (habits?.length ?? 0) > 0,
    isLoading,
    count: habits?.length ?? 0,
  };
}

/**
 * Hook to get habits sorted by streak (for streaks tab)
 */
export function useHabitsByStreak(): {
  habits: HabitStreakInfo[];
  isLoading: boolean;
  isError: boolean;
} {
  const { data: streaks, isLoading, isError } = useHabitStreaks();

  // Sort by current streak descending
  const sortedHabits = streaks
    ? [...streaks].sort((a, b) => b.currentStreak - a.currentStreak)
    : [];

  return {
    habits: sortedHabits,
    isLoading,
    isError,
  };
}
