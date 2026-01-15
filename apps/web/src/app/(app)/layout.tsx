'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/auth-context';
import { useOnboarding } from '@/hooks/use-onboarding';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AppLayout - Protected wrapper for all authenticated app routes
 *
 * Protection:
 * - Redirects to /login if not authenticated
 * - Redirects to /onboarding if onboarding not complete
 * - Shows loading state during checks
 *
 * @see SYSTEM_SPECS.md §3.1 for onboarding requirements
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const { isComplete, isLoading: isOnboardingLoading } = useOnboarding();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [isAuthLoading, user, router]);

  // Redirect to onboarding if not complete
  useEffect(() => {
    if (!isAuthLoading && user && !isOnboardingLoading && !isComplete) {
      router.push('/onboarding');
    }
  }, [isAuthLoading, user, isOnboardingLoading, isComplete, router]);

  // Show loading while checking auth/onboarding
  if (isAuthLoading || isOnboardingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or onboarding incomplete
  if (!user || !isComplete) {
    return null;
  }

  // Render app layout
  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300',
          'md:ml-64' // Sidebar margin only on desktop
        )}
      >
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
