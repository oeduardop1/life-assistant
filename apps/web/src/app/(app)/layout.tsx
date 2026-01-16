'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/auth-context';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useUIStore } from '@/stores/ui-store';
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
  const { sidebarOpen } = useUIStore();

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
          // Desktop: always has margin (full or collapsed)
          sidebarOpen ? 'md:ml-64' : 'md:ml-16'
        )}
      >
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
