'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from './use-authenticated-api';
import type {
  UserSettings,
  SettingsResponse,
  UpdateProfileData,
  UpdateEmailData,
  UpdatePasswordData,
  UpdateTimezoneData,
} from '@/lib/validations/settings';

// =============================================================================
// Query Keys (Query Key Factory Pattern)
// =============================================================================

export const settingsKeys = {
  all: ['settings'] as const,
  user: () => [...settingsKeys.all, 'user'] as const,
};

// =============================================================================
// Settings Query Hook
// =============================================================================

/**
 * useSettingsQuery - Fetch user settings
 *
 * Uses React Query for:
 * - Automatic caching (prevents duplicate calls)
 * - Only fetches when authenticated
 * - Automatic refetch on focus
 *
 * @see docs/specs/domains/settings.md
 */
export function useSettingsQuery() {
  const api = useAuthenticatedApi();

  return useQuery({
    queryKey: settingsKeys.user(),
    queryFn: async () => {
      const data = await api.get<UserSettings>('/settings');
      return data;
    },
    enabled: api.isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes - settings don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 1, // Only retry once for settings
  });
}

// =============================================================================
// Settings Mutation Hooks
// =============================================================================

/**
 * useUpdateProfile - Update user profile (name)
 */
export function useUpdateProfile() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData): Promise<SettingsResponse> => {
      return api.patch<SettingsResponse>('/settings/profile', data);
    },
    onSuccess: (_response, variables) => {
      // Optimistically update the cache
      queryClient.setQueryData<UserSettings>(settingsKeys.user(), (old) => {
        if (!old) return old;
        return { ...old, name: variables.name };
      });
    },
  });
}

/**
 * useUpdateEmail - Update user email (requires password verification)
 */
export function useUpdateEmail() {
  const api = useAuthenticatedApi();

  return useMutation({
    mutationFn: async (data: UpdateEmailData): Promise<SettingsResponse> => {
      return api.patch<SettingsResponse>('/settings/email', data);
    },
    // Note: Email is not updated locally because it requires verification
  });
}

/**
 * useUpdatePassword - Update user password
 */
export function useUpdatePassword() {
  const api = useAuthenticatedApi();

  return useMutation({
    mutationFn: async (data: UpdatePasswordData): Promise<SettingsResponse> => {
      return api.patch<SettingsResponse>('/settings/password', data);
    },
  });
}

/**
 * useUpdateTimezone - Update user timezone
 */
export function useUpdateTimezone() {
  const api = useAuthenticatedApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTimezoneData): Promise<SettingsResponse> => {
      return api.patch<SettingsResponse>('/settings/timezone', data);
    },
    onSuccess: (_response, variables) => {
      // Optimistically update the cache
      queryClient.setQueryData<UserSettings>(settingsKeys.user(), (old) => {
        if (!old) return old;
        return { ...old, timezone: variables.timezone };
      });
    },
  });
}

// =============================================================================
// Combined Settings Hook (for backward compatibility)
// =============================================================================

interface UseSettingsResult {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<SettingsResponse>;
  updateEmail: (data: UpdateEmailData) => Promise<SettingsResponse>;
  updatePassword: (data: UpdatePasswordData) => Promise<SettingsResponse>;
  updateTimezone: (data: UpdateTimezoneData) => Promise<SettingsResponse>;
}

/**
 * useSettings - Combined hook for managing user settings
 *
 * Provides backward-compatible API while using React Query internally.
 *
 * @see docs/specs/domains/settings.md
 */
export function useSettings(): UseSettingsResult {
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useSettingsQuery();

  const updateProfileMutation = useUpdateProfile();
  const updateEmailMutation = useUpdateEmail();
  const updatePasswordMutation = useUpdatePassword();
  const updateTimezoneMutation = useUpdateTimezone();

  return {
    settings: settings ?? null,
    isLoading,
    error: error?.message ?? null,
    fetchSettings: () => {
      void refetch();
    },
    updateProfile: async (data: UpdateProfileData) => {
      return updateProfileMutation.mutateAsync(data);
    },
    updateEmail: async (data: UpdateEmailData) => {
      return updateEmailMutation.mutateAsync(data);
    },
    updatePassword: async (data: UpdatePasswordData) => {
      return updatePasswordMutation.mutateAsync(data);
    },
    updateTimezone: async (data: UpdateTimezoneData) => {
      return updateTimezoneMutation.mutateAsync(data);
    },
  };
}
