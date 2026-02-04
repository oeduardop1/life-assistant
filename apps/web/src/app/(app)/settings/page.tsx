'use client';

import { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Shield,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ProfileSection,
  EmailSection,
  PasswordSection,
  PreferencesSection,
} from '@/components/settings';
import { useSettings } from '@/hooks/use-settings';

type SettingsSection = 'profile' | 'email' | 'password' | 'preferences';

const navigationItems = [
  {
    id: 'profile' as const,
    label: 'Perfil',
    description: 'Nome e informações pessoais',
    icon: User,
    color: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  {
    id: 'preferences' as const,
    label: 'Preferências',
    description: 'Fuso horário e região',
    icon: Globe,
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
  },
  {
    id: 'email' as const,
    label: 'Email',
    description: 'Endereço de email da conta',
    icon: Mail,
    color: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-500 dark:text-violet-400',
  },
  {
    id: 'password' as const,
    label: 'Senha',
    description: 'Credenciais de acesso',
    icon: Lock,
    color: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-500 dark:text-amber-400',
  },
];

/**
 * Settings page - User profile and security settings
 *
 * Features:
 * - Profile section: Edit name
 * - Email section: Change email with password verification
 * - Password section: Change password with strength meter
 *
 * @see docs/specs/domains/settings.md
 */
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const {
    settings,
    isLoading,
    error,
    fetchSettings,
    updateProfile,
    updateEmail,
    updatePassword,
    updateTimezone,
  } = useSettings();

  // React Query handles fetching automatically when authenticated

  // Loading state
  if (isLoading && !settings) {
    return <SettingsLoadingSkeleton />;
  }

  // Error state
  if (error && !settings) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Erro ao carregar</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button
            onClick={fetchSettings}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileSection
            defaultName={settings.name}
            onSubmit={updateProfile}
          />
        );
      case 'preferences':
        return (
          <PreferencesSection
            currentTimezone={settings.timezone}
            onSubmit={updateTimezone}
          />
        );
      case 'email':
        return (
          <EmailSection
            currentEmail={settings.email}
            onSubmit={updateEmail}
          />
        );
      case 'password':
        return (
          <PasswordSection
            userEmail={settings.email}
            userName={settings.name}
            onSubmit={updatePassword}
          />
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8 md:mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Configurações
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie sua conta e preferências
            </p>
          </div>
        </div>
      </header>

      {/* Mobile Navigation (horizontal tabs) */}
      <div className="block lg:hidden mb-6">
        <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Desktop Layout: Sidebar + Content */}
      <div className="flex gap-8">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-72 shrink-0">
          <nav className="space-y-2 sticky top-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
              Conta
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'w-full group flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r ' + item.color + ' shadow-sm'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                      isActive
                        ? 'bg-background shadow-sm'
                        : 'bg-muted/50 group-hover:bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isActive ? item.iconColor : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'font-medium text-sm transition-colors',
                        isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 transition-all duration-200',
                      isActive
                        ? 'opacity-100 translate-x-0 text-muted-foreground'
                        : 'opacity-0 -translate-x-2'
                    )}
                  />
                </button>
              );
            })}

            {/* Security Info Card */}
            <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Conta protegida
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seus dados estão seguros com criptografia de ponta a ponta
                  </p>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <div
            key={activeSection}
            className="animate-in fade-in-0 slide-in-from-right-4 duration-300"
          >
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Loading skeleton with elegant animation
 */
function SettingsLoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8 md:mb-12">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex gap-8">
        {/* Sidebar skeleton (desktop) */}
        <div className="hidden lg:block w-72 shrink-0 space-y-2">
          <Skeleton className="h-4 w-16 mb-4" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 space-y-6">
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
