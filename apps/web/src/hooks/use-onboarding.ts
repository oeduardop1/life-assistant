'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/auth-context';
import type {
  OnboardingStep,
  OnboardingStatus,
  StepSaveResponse,
  OnboardingCompleteResponse,
  ProfileStepData,
  AreasStepData,
  TelegramStepData,
} from '@/lib/validations/onboarding';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Error type for API calls
 */
interface ApiError {
  message: string;
  statusCode?: number;
}

/**
 * Standard API response wrapper from TransformInterceptor
 * @see ENGINEERING.md - API Response Format
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * useOnboarding Hook
 *
 * Provides state management and API calls for the onboarding wizard.
 * Handles:
 * - Fetching current onboarding status
 * - Saving step progress
 * - Completing onboarding
 * - Navigation between steps
 *
 * @see SYSTEM_SPECS.md §3.1 for onboarding flow requirements
 */
export function useOnboarding() {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuthContext();

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Make authenticated API request
   */
  const apiRequest = useCallback(
    async <T>(
      endpoint: string,
      options: RequestInit = {},
    ): Promise<T> => {
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(errorData.message ?? `HTTP ${String(response.status)}`);
      }

      // Unwrap API response from TransformInterceptor format
      const json = await response.json() as ApiResponse<T>;
      return json.data;
    },
    [session?.access_token],
  );

  /**
   * Fetch current onboarding status from API
   */
  const fetchStatus = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await apiRequest<OnboardingStatus>('/onboarding/status');
      setStatus(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message ?? 'Failed to fetch onboarding status');
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, apiRequest]);

  /**
   * Save profile step data
   */
  const saveProfileStep = useCallback(
    async (data: ProfileStepData): Promise<StepSaveResponse> => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await apiRequest<StepSaveResponse>('/onboarding/step/profile', {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        await fetchStatus(); // Refresh status after save
        return response;
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message ?? 'Failed to save profile');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [apiRequest, fetchStatus],
  );

  /**
   * Save areas step data
   */
  const saveAreasStep = useCallback(
    async (data: AreasStepData): Promise<StepSaveResponse> => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await apiRequest<StepSaveResponse>('/onboarding/step/areas', {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        await fetchStatus(); // Refresh status after save
        return response;
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message ?? 'Failed to save areas');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [apiRequest, fetchStatus],
  );

  /**
   * Save telegram step data (or skip)
   */
  const saveTelegramStep = useCallback(
    async (data: TelegramStepData): Promise<StepSaveResponse> => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await apiRequest<StepSaveResponse>('/onboarding/step/telegram', {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        await fetchStatus(); // Refresh status after save
        return response;
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message ?? 'Failed to save telegram step');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [apiRequest, fetchStatus],
  );

  /**
   * Complete onboarding and redirect to dashboard
   */
  const completeOnboarding = useCallback(
    async (tutorialSkipped = false): Promise<void> => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await apiRequest<OnboardingCompleteResponse>('/onboarding/complete', {
          method: 'POST',
          body: JSON.stringify({ tutorialSkipped }),
        });
        if (response.success) {
          router.push(response.redirectTo);
        }
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message ?? 'Failed to complete onboarding');
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [apiRequest, router],
  );

  /**
   * Navigate to a specific step
   */
  const goToStep = useCallback(
    (step: OnboardingStep) => {
      router.push(`/onboarding/${step}`);
    },
    [router],
  );

  /**
   * Skip optional step (telegram or tutorial)
   */
  const skipStep = useCallback(
    async (step: 'telegram' | 'tutorial'): Promise<void> => {
      if (step === 'telegram') {
        const response = await saveTelegramStep({ skipped: true });
        if (response.nextStep !== 'complete') {
          goToStep(response.nextStep as OnboardingStep);
        }
      } else if (step === 'tutorial') {
        await completeOnboarding(true);
      }
    },
    [saveTelegramStep, completeOnboarding, goToStep],
  );

  // Fetch status on mount
  useEffect(() => {
    if (!isAuthLoading && session) {
      void fetchStatus();
    }
  }, [isAuthLoading, session, fetchStatus]);

  return {
    // Status
    status,
    currentStep: status?.currentStep ?? 'profile',
    completedSteps: status?.completedSteps ?? [],
    data: status?.data ?? {},
    isComplete: status?.isComplete ?? false,

    // Loading states
    isLoading: isLoading || isAuthLoading,
    isSaving,
    error,

    // Actions
    fetchStatus,
    saveProfileStep,
    saveAreasStep,
    saveTelegramStep,
    completeOnboarding,
    goToStep,
    skipStep,

    // Helpers
    isStepComplete: (step: OnboardingStep) =>
      status?.completedSteps.includes(step) ?? false,
    canAccessStep: (step: OnboardingStep) => {
      if (!status) return step === 'profile';
      const stepOrder: OnboardingStep[] = ['profile', 'areas', 'telegram', 'tutorial'];
      const currentIndex = stepOrder.indexOf(status.currentStep);
      const stepIndex = stepOrder.indexOf(step);
      return stepIndex <= currentIndex || status.completedSteps.includes(step);
    },
  };
}
