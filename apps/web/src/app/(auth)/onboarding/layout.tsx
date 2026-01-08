'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/auth-context';
import { useOnboarding } from '@/hooks/use-onboarding';
import { OnboardingStepper } from '@/components/onboarding';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * OnboardingLayout - Wrapper for all onboarding pages
 *
 * Provides:
 * - Authentication check (redirects to login if not authenticated)
 * - OnboardingStepper progress indicator
 * - Consistent card layout
 *
 * @see SYSTEM_SPECS.md §3.1 for onboarding flow
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const { currentStep, completedSteps, isLoading: isOnboardingLoading, isComplete } = useOnboarding();

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
