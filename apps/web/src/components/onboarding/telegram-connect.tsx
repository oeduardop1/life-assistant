'use client';

import { useState } from 'react';
import { Send, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SkipButton } from './skip-button';

interface TelegramConnectProps {
  telegramBotUsername?: string;
  onConnect: (telegramId: string) => Promise<void>;
  onSkip: () => Promise<void>;
  isLoading?: boolean;
  isConnected?: boolean;
}

/**
 * TelegramConnect - Third step of onboarding wizard (optional)
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
export function TelegramConnect({
  telegramBotUsername = 'LifeAssistantBot',
  onConnect,
  onSkip,
  isLoading = false,
  isConnected = false,
}: TelegramConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const telegramDeepLink = `https://t.me/${telegramBotUsername}?start=connect`;

  const handleOpenTelegram = () => {
    // Open Telegram in new tab
    window.open(telegramDeepLink, '_blank');
    setIsConnecting(true);
  };

  // Note: In a real implementation, this would poll an API or use WebSocket
  // to detect when the user has connected via Telegram
  const handleConfirmConnection = async () => {
    // Placeholder: In production, this would verify the connection
    // and get the telegramId from the backend
    await onConnect('pending-verification');
  };

  if (isConnected) {
    return (
      <div className="space-y-6">
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="flex items-center gap-4 pt-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Telegram conectado!
              </p>
              <p className="text-sm text-muted-foreground">
                Voce recebera notificacoes e lembretes pelo Telegram.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={() => onConnect('confirmed')}>
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0088cc]/10">
            <Send className="h-8 w-8 text-[#0088cc]" />
          </div>
          <CardTitle>Conectar Telegram</CardTitle>
          <CardDescription>
            Receba lembretes, notificacoes e faca tracking rapido pelo Telegram.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Lembretes de agua, exercicios e medicamentos
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Registro de gastos por mensagem de voz
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Conversar com a IA de qualquer lugar
            </li>
          </ul>
        </CardContent>
      </Card>

      {!isConnecting ? (
        <Button
          type="button"
          className="w-full"
          onClick={handleOpenTelegram}
          disabled={isLoading}
        >
          <Send className="mr-2 h-4 w-4" />
          Abrir no Telegram
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-center text-muted-foreground">
            Clique em &quot;Iniciar&quot; no Telegram e depois confirme aqui.
          </p>
          <Button
            type="button"
            className="w-full"
            onClick={handleConfirmConnection}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Ja conectei no Telegram'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setIsConnecting(false)}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      <SkipButton
        onSkip={onSkip}
        isLoading={isLoading}
        label="Configurar depois"
      />
    </div>
  );
}
