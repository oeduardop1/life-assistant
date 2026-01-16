'use client';

import { useOnboarding } from '@/hooks/use-onboarding';
import { TutorialCarousel } from '@/components/onboarding';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

/**
 * TutorialPage - Step 4 of onboarding wizard (optional)
 *
 * Shows 3-4 slides introducing key features of the app.
 * User can navigate through slides or skip directly to dashboard.
 *
 * Completing this step finalizes onboarding and sets:
 * - user.status = 'active'
 * - user.onboardingCompletedAt = NOW()
 *
 * @see docs/specs/system.md §3.1 for onboarding flow
 */
export default function TutorialPage() {
  const { completeOnboarding, skipStep, isSaving, error } = useOnboarding();

  const handleComplete = async () => {
    try {
      await completeOnboarding(false);
      toast.success('Bem-vindo ao Life Assistant!');
      // Router push is handled by completeOnboarding
    } catch {
      toast.error(error ?? 'Erro ao finalizar onboarding');
    }
  };

  const handleSkip = async () => {
    try {
      await skipStep('tutorial');
      toast.success('Bem-vindo ao Life Assistant!');
      // Router push is handled by skipStep -> completeOnboarding
    } catch {
      toast.error(error ?? 'Erro ao pular tutorial');
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Conheca o App</CardTitle>
        <CardDescription>
          Uma rapida introducao aos recursos principais.
          Voce pode pular e explorar por conta propria.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TutorialCarousel
          onComplete={handleComplete}
          onSkip={handleSkip}
          isLoading={isSaving}
        />
      </CardContent>
    </Card>
  );
}
