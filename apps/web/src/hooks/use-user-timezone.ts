'use client';

import { SYSTEM_DEFAULTS } from '@life-assistant/shared';
import { useSettingsQuery } from './use-settings';

/**
 * useUserTimezone - Get the current user's timezone
 *
 * Returns the user's configured timezone from settings,
 * falling back to the system default if not available.
 *
 * @returns The user's timezone (IANA format, e.g., 'America/Sao_Paulo')
 *
 * @example
 * const timezone = useUserTimezone();
 * const today = getTodayInTimezone(timezone);
 */
export function useUserTimezone(): string {
  const { data: settings } = useSettingsQuery();
  return settings?.timezone ?? SYSTEM_DEFAULTS.timezone;
}
