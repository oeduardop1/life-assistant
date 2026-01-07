/**
 * Schema de configuração de integrações externas
 * Todas as integrações são opcionais
 */

import { z } from 'zod';

export const integrationsSchema = z.object({
  // Telegram - opcional (usuário pode não vincular)
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Google OAuth - opcional
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Stripe - opcional (pode usar plano free)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Email - opcional em dev
  RESEND_API_KEY: z.string().optional(),
});

export type IntegrationsEnv = z.infer<typeof integrationsSchema>;
