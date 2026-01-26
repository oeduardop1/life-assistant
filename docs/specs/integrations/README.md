# Integrations Overview

> External APIs, webhooks, and third-party services.

---

## Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LIFE ASSISTANT AI                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│   MESSAGING   │           │   CALENDAR    │           │   PAYMENTS    │
│               │           │               │           │               │
│ • Telegram    │           │ • Google Cal  │           │ • Stripe      │
│ • WhatsApp*   │           │ • Apple Cal*  │           │               │
└───────────────┘           └───────────────┘           └───────────────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│     AUTH      │           │   STORAGE     │           │      AI       │
│               │           │               │           │               │
│ • Supabase    │           │ • Cloudflare  │           │ • Google AI   │
│   Auth        │           │   R2          │           │   (Gemini)    │
│ • Google      │           │ • Supabase    │           │ • OpenAI*     │
│   OAuth       │           │   Storage     │           │ • Anthropic*  │
└───────────────┘           └───────────────┘           └───────────────┘

* = Futuro / Opcional
```

---

## Status

| Integração | Status | Descrição |
|------------|--------|-----------|
| [Telegram Bot](telegram.md) | ✅ Produção | Interface de chat via Telegram |
| [WhatsApp Business](whatsapp.md) | ⚪ Futuro | Canal de chat via Cloud API |
| [Google Calendar](google-calendar.md) | ✅ Produção | Sincronização de eventos |
| Apple Calendar | ⚪ Futuro | Integração via CalDAV |
| [Stripe](stripe.md) | 🟡 Em dev | Pagamentos e assinaturas |
| [Supabase Auth](supabase-auth.md) | ✅ Produção | Autenticação OAuth |
| [Gemini](gemini.md) | ✅ Produção | LLM provider principal |
| OpenAI | ⚪ Opcional | LLM provider backup |
| Anthropic | ⚪ Opcional | LLM provider backup |
| [Cloudflare R2](cloudflare-r2.md) | ✅ Produção | Armazenamento de arquivos |

---

## Common Patterns

### Fail Gracefully

Se integração falha, app continua funcionando:

```typescript
try {
  await integration.execute();
} catch (error) {
  logger.error('Integration failed', { error });
  // Continue with degraded functionality
}
```

### Retry with Backoff

```typescript
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
};
```

### Idempotency

Operações podem ser repetidas com segurança:

```typescript
const idempotencyKey = `${operation}:${resourceId}:${timestamp}`;
```

### Audit Everything

Todas as chamadas são logadas:

```typescript
await auditLog.create({
  action: 'integration.call',
  integration: 'telegram',
  metadata: { chatId, messageType },
});
```

---

## Environment Variables

```bash
# ===========================================
# SUPABASE
# ===========================================
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=xxx

# ===========================================
# TELEGRAM
# ===========================================
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_URL=https://api.myapp.com
TELEGRAM_WEBHOOK_SECRET=random-secret-string

# ===========================================
# GOOGLE
# ===========================================
# OAuth (Calendar)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://myapp.com/api/auth/google/callback

# AI (Gemini)
GOOGLE_AI_API_KEY=AIza...
GEMINI_MODEL=gemini-flash

# ===========================================
# STRIPE
# ===========================================
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxx

# ===========================================
# CLOUDFLARE R2
# ===========================================
CLOUDFLARE_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=life-assistant
R2_PUBLIC_URL=https://files.myapp.com

# ===========================================
# AI PROVIDER (fallback)
# ===========================================
LLM_PROVIDER=gemini
ANTHROPIC_API_KEY=sk-ant-xxx    # Optional
OPENAI_API_KEY=sk-xxx           # Optional
```

---

## Error Handling by Integration

| Integração | Erro | Código | Ação |
|------------|------|--------|------|
| **Telegram** | Bot bloqueado | 403 | Desativar integração |
| **Telegram** | Rate limit | 429 | Retry com backoff |
| **Google Cal** | Token expirado | 401 | Refresh token |
| **Google Cal** | Token revogado | 401 | Desativar integração |
| **Google Cal** | Quota exceeded | 429 | Pause syncs, notify admin |
| **Stripe** | Card declined | card_declined | Notificar usuário |
| **Stripe** | Invalid request | invalid_request | Log + alerta |
| **Gemini** | Rate limit | 429 | Retry com backoff |
| **Gemini** | Safety block | SAFETY | Log + resposta alternativa |
| **R2** | Access denied | 403 | Verificar credenciais |
| **Supabase** | JWT expired | 401 | Refresh session |

---

## Retry Strategy

```typescript
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'RATE_LIMIT', '429', '503'],
};

async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isRetryable = opts.retryableErrors.some(
        e => error.code === e || error.status === e || error.message?.includes(e)
      );

      if (!isRetryable || attempt === opts.maxRetries) {
        throw error;
      }

      console.log(`Retry attempt ${attempt}/${opts.maxRetries} after ${delay}ms`);
      await sleep(delay);
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }

  throw lastError!;
}
```

---

## Monitoring

### Metrics by Integration

| Integração | Métricas |
|------------|----------|
| **Telegram** | Mensagens recebidas/enviadas, latência, erros |
| **Google Cal** | Syncs realizados, eventos importados, erros |
| **Stripe** | Transações, MRR, churn, falhas de pagamento |
| **Gemini** | Requests, tokens usados, latência, erros |
| **R2** | Uploads, downloads, storage usado |

### Health Checks

```typescript
interface IntegrationHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  lastCheck: Date;
  error?: string;
}

async function checkIntegrationHealth(): Promise<IntegrationHealth[]> {
  const checks: IntegrationHealth[] = [];

  // Telegram
  try {
    const start = Date.now();
    await telegram.getMe();
    checks.push({
      name: 'telegram',
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date(),
    });
  } catch (error) {
    checks.push({
      name: 'telegram',
      status: 'unhealthy',
      lastCheck: new Date(),
      error: error.message,
    });
  }

  // Gemini
  try {
    const start = Date.now();
    await aiService.chat([{ role: 'user', content: 'ping' }], { maxTokens: 10 });
    checks.push({
      name: 'gemini',
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date(),
    });
  } catch (error) {
    checks.push({
      name: 'gemini',
      status: 'unhealthy',
      lastCheck: new Date(),
      error: error.message,
    });
  }

  // Stripe
  try {
    const start = Date.now();
    await stripe.balance.retrieve();
    checks.push({
      name: 'stripe',
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date(),
    });
  } catch (error) {
    checks.push({
      name: 'stripe',
      status: 'unhealthy',
      lastCheck: new Date(),
      error: error.message,
    });
  }

  // R2
  try {
    const start = Date.now();
    await storageService.download('health-check.txt');
    checks.push({
      name: 'r2',
      status: 'healthy',
      latency: Date.now() - start,
      lastCheck: new Date(),
    });
  } catch (error) {
    checks.push({
      name: 'r2',
      status: 'unhealthy',
      lastCheck: new Date(),
      error: error.message,
    });
  }

  return checks;
}
```

### Health Endpoint

```typescript
// GET /api/health/integrations
router.get('/health/integrations', async (req, res) => {
  const health = await checkIntegrationHealth();
  const allHealthy = health.every(h => h.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    integrations: health,
    timestamp: new Date().toISOString(),
  });
});
```

---

## Glossary

| Termo | Definição |
|-------|-----------|
| **Webhook** | URL que recebe notificações de eventos |
| **OAuth** | Protocolo de autorização para acesso a APIs |
| **Refresh Token** | Token para obter novos access tokens |
| **Presigned URL** | URL temporária com permissão de acesso |
| **Rate Limit** | Limite de requisições por período |
| **Backoff** | Estratégia de aumentar delay entre retries |
| **MRR** | Monthly Recurring Revenue |
| **Bot API** | API do Telegram para bots |
| **GoTrue** | Serviço de autenticação do Supabase |

---

*Última atualização: 27 Janeiro 2026*
