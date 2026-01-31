'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { FloatingOrbs, BrandingPanel } from '@/components/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignup = pathname === '/signup';

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-auth-gradient-start via-auth-gradient-mid to-auth-gradient-end">
      {/* Floating decorative orbs */}
      <FloatingOrbs />

      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          {/* Branding panel - hidden on mobile for login, visible for signup */}
          <div className={`w-full max-w-md lg:flex-1 ${!isSignup ? 'hidden lg:block' : ''}`}>
            <BrandingPanel showFeatures={isSignup} />
          </div>

          {/* Mobile branding for login - compact version */}
          {!isSignup && (
            <div className="flex flex-col items-center text-center lg:hidden">
              <h1 className="text-2xl font-bold tracking-tight">
                Life Assistant
                <span className="ml-2 text-chat-accent">AI</span>
              </h1>
            </div>
          )}

          {/* Form container */}
          <div className="w-full max-w-md lg:flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
