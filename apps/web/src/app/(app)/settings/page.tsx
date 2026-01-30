'use client';

import { useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ProfileSection,
  EmailSection,
  PasswordSection,
} from '@/components/settings';
import { useSettings } from '@/hooks/use-settings';

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
  const {
    settings,
    isLoading,
    error,
    fetchSettings,
    updateProfile,
    updateEmail,
    updatePassword,
  } = useSettings();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Loading state
  if (isLoading && !settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Configuracoes</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Configuracoes</h1>
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Configuracoes</h1>
          <p className="text-muted-foreground">
            Gerencie seu perfil e seguranca
          </p>
        </div>
      </div>

      {/* Tabs for mobile, stacked cards for desktop */}
      <div className="block md:hidden">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="password">Senha</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-4">
            <ProfileSection
              defaultName={settings.name}
              onSubmit={updateProfile}
            />
          </TabsContent>
          <TabsContent value="email" className="mt-4">
            <EmailSection
              currentEmail={settings.email}
              onSubmit={updateEmail}
            />
          </TabsContent>
          <TabsContent value="password" className="mt-4">
            <PasswordSection
              userEmail={settings.email}
              userName={settings.name}
              onSubmit={updatePassword}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Stacked cards for desktop */}
      <div className="hidden md:block space-y-6">
        <ProfileSection
          defaultName={settings.name}
          onSubmit={updateProfile}
        />
        <EmailSection
          currentEmail={settings.email}
          onSubmit={updateEmail}
        />
        <PasswordSection
          userEmail={settings.email}
          userName={settings.name}
          onSubmit={updatePassword}
        />
      </div>
    </div>
  );
}
