'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/use-onboarding';
import { TelegramConnect } from '@/components/onboarding';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

/**
 * TelegramPage - Step 3 of onboarding wizard (optional)
 *
 * Allows user to connect their Telegram account for:
 * - Receiving reminders and notifications
 * - Quick tracking via chat
 * - Voice notes transcription
 *
 * User can skip this step and configure later.
 *
 * @see INTEGRATIONS_SPECS.md for Telegram bot integration
 */
export default function TelegramPage() {
  const router = useRouter();
  const { data, saveTelegramStep, skipStep, isSaving, error } = useOnboarding();

  const handleConnect = async (telegramId: string) => {
    try {
      const response = await saveTelegramStep({ telegramId, skipped: false });
      toast.success('Telegram conectado com sucesso!');
      if (response.nextStep === 'complete') {
        router.push('/dashboard');
      } else {
        router.push(`/onboarding/${response.nextStep}`);
      }
    } catch {
      toast.error(error ?? 'Erro ao conectar Telegram');
    }
  };

  const handleSkip = async () => {
    try {
      await skipStep('telegram');
      toast.info('Telegram configurado como pendente');
      router.push('/onboarding/tutorial');
    } catch {
      toast.error(error ?? 'Erro ao pular etapa');
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Conectar Telegram</CardTitle>
        <CardDescription>
          Esta etapa e opcional. Voce pode configurar o Telegram depois nas configuracoes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TelegramConnect
          onConnect={handleConnect}
          onSkip={handleSkip}
          isLoading={isSaving}
          isConnected={Boolean(data.telegramId)}
        />
      </CardContent>
    </Card>
  );
}
