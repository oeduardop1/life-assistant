/**
 * Job queues defined in the system
 * Separated from jobs.module.ts to avoid circular dependencies
 * @see docs/specs/engineering.md §7.1
 */
export const QUEUES = {
  CLEANUP_ONBOARDING: 'cleanup-onboarding',
} as const;
