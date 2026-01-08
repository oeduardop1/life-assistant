'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/use-onboarding';
import { ProfileForm } from '@/components/onboarding';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import type { ProfileStepData } from '@/lib/validations/onboarding';

/**
 * ProfilePage - Step 1 of onboarding wizard (required)
 *
 * Collects:
 * - User name (min 2 chars)
 * - Timezone (IANA format)
 *
 * @see SYSTEM_SPECS.md §3.1 for validation requirements
 */
export default function ProfilePage() {
  const router = useRouter();
  const { data, saveProfileStep, isSaving, error } = useOnboarding();

  const handleSubmit = async (formData: ProfileStepData) => {
    try {
      const response = await saveProfileStep(formData);
      toast.success('Perfil salvo com sucesso!');
      router.push(`/onboarding/${response.nextStep}`);
    } catch {
      toast.error(error ?? 'Erro ao salvar perfil');
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Bem-vindo!</CardTitle>
        <CardDescription>
          Vamos comecar configurando seu perfil para personalizar sua experiencia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          defaultValues={{
            name: data.name,
            timezone: data.timezone,
          }}
          onSubmit={handleSubmit}
          isLoading={isSaving}
        />
      </CardContent>
    </Card>
  );
}
