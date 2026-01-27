'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/auth-context';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingStepper } from '@/components/onboarding';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { OnboardingStep } from '@/lib/validations/onboarding';

/**
 * OnboardingLayout - Wrapper for all onboarding pages
 *
 * Provides:
 * - Authentication check (redirects to login if not authenticated)
 * - OnboardingStepper progress indicator
 * - Consistent card layout
 *
 * @see docs/specs/system.md §3.1 for onboarding flow
 */
/**
 * Derive the current onboarding step from the URL pathname
 * This ensures the stepper always reflects the actual page being viewed
 */
function getStepFromPathname(pathname: string): OnboardingStep {
  const segment = pathname.split('/').pop();
  const validSteps: OnboardingStep[] = ['profile', 'telegram', 'tutorial'];
  if (segment && validSteps.includes(segment as OnboardingStep)) {
    return segment as OnboardingStep;
  }
  return 'profile'; // Default to first step
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const { completedSteps, isLoading: isOnboardingLoading, isComplete, fetchStatus } = useOnboarding();

  // Derive current step from URL for immediate visual feedback
  const currentStep = getStepFromPathname(pathname);

  // Re-fetch onboarding status when pathname changes (after navigation)
  useEffect(() => {
    void fetchStatus();
  }, [pathname, fetchStatus]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [isAuthLoading, user, router]);

  // Redirect to dashboard if onboarding is already complete
  useEffect(() => {
    if (!isOnboardingLoading && isComplete) {
      router.push('/dashboard');
    }
  }, [isOnboardingLoading, isComplete, router]);

  // Show loading state while checking auth/onboarding status
  if (isAuthLoading || isOnboardingLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-16 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Stepper */}
      <OnboardingStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Page content */}
      {children}
    </div>
  );
}
