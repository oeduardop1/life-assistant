'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * OnboardingPage - Entry point for onboarding wizard
 *
 * Redirects to the appropriate step based on current progress:
 * - If no progress: /onboarding/profile
 * - If profile complete: /onboarding/areas
 * - If areas complete: /onboarding/telegram
 * - If telegram complete: /onboarding/tutorial
 * - If all complete: /dashboard
 *
 * @see docs/specs/system.md §3.1 for onboarding flow
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { currentStep, isLoading, isComplete } = useOnboarding();

  useEffect(() => {
    if (!isLoading) {
      if (isComplete) {
        router.replace('/dashboard');
      } else {
        router.replace(`/onboarding/${currentStep}`);
      }
    }
  }, [isLoading, isComplete, currentStep, router]);

  // Show loading while determining redirect
  return (
    <div className="flex items-center justify-center py-8">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>
    </div>
  );
}
