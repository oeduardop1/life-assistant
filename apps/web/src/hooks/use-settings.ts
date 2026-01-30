'use client';

import { useState, useCallback } from 'react';
import { useAuthenticatedApi } from './use-authenticated-api';
import type {
  UserSettings,
  SettingsResponse,
  UpdateProfileData,
  UpdateEmailData,
  UpdatePasswordData,
} from '@/lib/validations/settings';

interface UseSettingsResult {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<SettingsResponse>;
  updateEmail: (data: UpdateEmailData) => Promise<SettingsResponse>;
  updatePassword: (data: UpdatePasswordData) => Promise<SettingsResponse>;
}

/**
 * useSettings - Hook for managing user settings
 *
 * Provides:
 * - Fetch current settings
 * - Update profile (name)
 * - Update email (with password verification)
 * - Update password (with current password)
 *
 * @see docs/specs/domains/settings.md
 */
export function useSettings(): UseSettingsResult {
  const api = useAuthenticatedApi();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<UserSettings>('/settings');
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar configurações';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const updateProfile = useCallback(
    async (data: UpdateProfileData): Promise<SettingsResponse> => {
      const response = await api.patch<SettingsResponse>('/settings/profile', data);
      // Update local settings with new name
      if (response.success && settings) {
        setSettings({ ...settings, name: data.name });
      }
      return response;
    },
    [api, settings],
  );

  const updateEmail = useCallback(
    async (data: UpdateEmailData): Promise<SettingsResponse> => {
      return api.patch<SettingsResponse>('/settings/email', data);
      // Note: Email is not updated locally because it requires verification
    },
    [api],
  );

  const updatePassword = useCallback(
    async (data: UpdatePasswordData): Promise<SettingsResponse> => {
      return api.patch<SettingsResponse>('/settings/password', data);
    },
    [api],
  );

  return {
    settings,
    isLoading,
    error,
    fetchSettings,
    updateProfile,
    updateEmail,
    updatePassword,
  };
}
