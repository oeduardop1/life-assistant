# SaaS & Multi-tenancy Module

> Gestão de usuários, planos, billing e features SaaS.

---

## 1. Overview

O módulo SaaS gerencia o ciclo de vida do usuário, desde o cadastro até a assinatura, incluindo planos, limites, billing e suporte.

---

## 2. User Registration

### 2.1 Métodos de Cadastro

| Método | Provider |
|--------|----------|
| Email + Senha | Supabase Auth |
| Google OAuth | Supabase Auth |
| GitHub OAuth | Supabase Auth (futuro) |
| Magic Link | Supabase Auth |

### 2.2 Fluxo

```
1. Usuário acessa /signup
2. Escolhe método de cadastro
3. Completa autenticação
4. Redireciona para /onboarding
5. Conta criada com plano Free
```

### 2.3 Validação de Email

- Email de confirmação enviado
- Link válido por 24h
- Acesso limitado até confirmar

---

## 3. Onboarding Wizard

### 3.1 Etapas

| Etapa | Campos | Obrigatório |
|-------|--------|-------------|
| 1. Perfil | Nome, foto | Nome sim |
| 2. Conexões | Telegram, Google Calendar | Não |
| 3. Tutorial | Tour do app | Pular permitido |

> **Nota (2026-01-26):** Áreas são fixas (6 áreas para todos).

### 3.2 Progresso

```typescript
interface OnboardingProgress {
  profileComplete: boolean;
  telegramComplete: boolean;
  telegramSkipped: boolean;
  tutorialComplete: boolean;
  tutorialSkipped: boolean;
}
```

### 3.3 Persistência

Salvo em `users.preferences.onboarding`.

---

## 4. Subscription Plans

### 4.1 Free

| Recurso | Limite |
|---------|--------|
| Mensagens/mês | 100 |
| Histórico | 30 dias |
| Memória | Limitada |
| Dashboard | Básico |
| Integrações | Telegram/WhatsApp |
| Modelo IA | Básico |

### 4.2 Pro (R$ 29,90/mês)

| Recurso | Limite |
|---------|--------|
| Mensagens | Ilimitado |
| Histórico | 1 ano |
| Memória | Completa |
| Dashboard | Completo |
| Integrações | Todas |
| Vault | Sim |
| CRM | Completo |
| Alertas | Básicos |
| Relatórios | Todos |
| Modelo IA | Avançado |

### 4.3 Premium (R$ 49,90/mês)

| Recurso | Limite |
|---------|--------|
| Mensagens | Ilimitado |
| Histórico | Ilimitado |
| Tudo do Pro | Sim |
| Alertas | Avançados |
| Modelo IA | Premium |
| Suporte | Prioritário |

### 4.4 Feature Matrix

```typescript
const PLAN_LIMITS = {
  free: {
    messagesPerMonth: 100,
    historyDays: 30,
    hasVault: false,
    hasCrmFull: false,
    hasIntegrations: false,
    hasAdvancedAlerts: false,
    aiModel: 'basic',
  },
  pro: {
    messagesPerMonth: Infinity,
    historyDays: 365,
    hasVault: true,
    hasCrmFull: true,
    hasIntegrations: true,
    hasAdvancedAlerts: false,
    aiModel: 'advanced',
  },
  premium: {
    messagesPerMonth: Infinity,
    historyDays: Infinity,
    hasVault: true,
    hasCrmFull: true,
    hasIntegrations: true,
    hasAdvancedAlerts: true,
    aiModel: 'premium',
  },
};
```

> **Nota (2026-01-26):** `areasLimit` removido - todas as 6 áreas estão disponíveis para todos os planos.

---

## 5. Billing (Stripe Integration)

> Ver `integrations/stripe.md` para detalhes técnicos.

### 5.1 Fluxo de Assinatura

```
1. Usuário clica em "Upgrade"
2. Seleciona plano
3. Redireciona para Stripe Checkout
4. Completa pagamento
5. Webhook atualiza status
6. Plano ativado imediatamente
```

### 5.2 Métodos de Pagamento

- Cartão de crédito
- Boleto bancário
- Pix

### 5.3 Gerenciamento

- Portal do cliente Stripe
- Cancelar assinatura
- Alterar cartão
- Ver histórico de faturas

---

## 6. Trial Period

### 6.1 Configuração

| Campo | Valor |
|-------|-------|
| Duração | 14 dias |
| Plano trial | Pro |
| Requer cartão | Não |

### 6.2 Fluxo

```
1. Usuário opta por trial
2. 14 dias de acesso Pro
3. 3 dias antes: notificação
4. 1 dia antes: notificação
5. Fim do trial: volta para Free
6. Opção de fazer upgrade a qualquer momento
```

---

## 7. Plan Limits

### 7.1 Enforcement

```typescript
async function checkLimit(userId: string, feature: string): Promise<boolean> {
  const user = await getUser(userId);
  const limits = PLAN_LIMITS[user.plan];

  switch (feature) {
    case 'message':
      const count = await getMonthlyMessageCount(userId);
      return count < limits.messagesPerMonth;

    case 'vault':
      return limits.hasVault;

    case 'integration':
      return limits.hasIntegrations;

    default:
      return true;
  }
}
```

### 7.2 Mensagens de Limite

| Limite | Mensagem |
|--------|----------|
| Mensagens | "Você atingiu o limite de 100 mensagens este mês. Faça upgrade para continuar." |
| Histórico | "Dados anteriores a 30 dias disponíveis no plano Pro." |

### 7.3 Storage Limits (por plano)

| Recurso | Free | Pro | Premium |
|---------|------|-----|---------|
| Mensagens IA/dia | 20 | 100 | Ilimitado |
| Tracking entries/mês | 100 | 1.000 | Ilimitado |
| Notas | 50 | 500 | Ilimitado |
| Pessoas (CRM) | 20 | 200 | Ilimitado |
| Storage (arquivos) | 100MB | 1GB | 10GB |
| Histórico conversas | 30 dias | 1 ano | Ilimitado |

---

## 8. Admin Dashboard

### 8.1 Métricas

| Métrica | Descrição |
|---------|-----------|
| Total de usuários | Cadastrados |
| Usuários ativos | DAU/MAU |
| Conversão | Free → Pago |
| MRR | Receita recorrente |
| Churn | Taxa de cancelamento |
| LTV | Lifetime value |

### 8.2 Gestão

- Lista de usuários
- Alterar plano manualmente
- Suspender conta
- Ver logs de atividade
- Métricas de uso

---

## 9. Support System

### 9.1 Canais

| Canal | Plano |
|-------|-------|
| FAQ/Base de conhecimento | Todos |
| Email | Pro, Premium |
| Chat | Premium |
| Telefone | Enterprise (futuro) |

### 9.2 Tickets

```typescript
interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  resolvedAt?: Date;
}
```

---

## 10. Knowledge Base

### 10.1 Estrutura

```
/help
├── getting-started/
│   ├── first-steps.md
│   ├── onboarding.md
│   └── telegram-setup.md
├── features/
│   ├── memory.md
│   ├── tracking.md
│   └── vault.md
├── billing/
│   ├── plans.md
│   ├── upgrade.md
│   └── cancel.md
└── faq/
    └── common-questions.md
```

### 10.2 Busca

- Full-text search
- Sugestões contextuais
- Artigos relacionados

---

## 11. Profile Templates

### 11.1 Templates Disponíveis

| Template | Áreas Foco | Configurações |
|----------|------------|---------------|
| Empreendedor | Profissional, Financeiro | Dashboard executivo |
| CLT | Carreira, Família | Work-life balance |
| Estudante | Aprendizado, Metas | Tracking de estudos |

### 11.2 Aplicação

- Durante onboarding
- Pode trocar depois
- Personalização mantida

---

## 12. Data Import

### 12.1 Fontes

| Fonte | Status |
|-------|--------|
| CSV genérico | Disponível |
| JSON export | Disponível |
| Notion | Futuro |
| Todoist | Futuro |
| Google Keep | Futuro |

### 12.2 Processo

```
1. Upload do arquivo
2. Mapeamento de campos
3. Preview de dados
4. Confirmação
5. Importação em background
6. Notificação de conclusão
```

> Detalhes técnicos: `docs/specs/core/data-import.md`.

---

## 13. Public API (Future)

### 13.1 Endpoints

```
GET /api/v1/user/profile
GET /api/v1/tracking/entries
POST /api/v1/tracking/entries
GET /api/v1/memory/search
GET /api/v1/reports
```

### 13.2 Autenticação

- API Keys
- OAuth 2.0
- Rate limiting por plano

---

## 14. Success Metrics

### 14.1 Engajamento

| Métrica | Meta |
|---------|------|
| DAU/MAU | > 40% |
| Mensagens/dia/usuário | > 10 |
| Sessões web/semana | > 5 |
| Tracking rate | > 70% |

### 14.2 Negócio

| Métrica | Meta |
|---------|------|
| Conversão Free→Pago | > 5% |
| Churn mensal | < 5% |
| NPS | > 50 |
| LTV/CAC | > 3 |

---

## 15. Data Model

### 15.1 subscriptions

```typescript
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),

  plan: userPlanEnum('plan').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  // active, past_due, canceled, trialing

  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  canceledAt: timestamp('canceled_at'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),

  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),

  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 16. Definition of Done

- [ ] Registro com email e OAuth
- [ ] Onboarding wizard completo
- [ ] 3 planos com feature matrix
- [ ] Integração Stripe para pagamentos
- [ ] Trial de 14 dias
- [ ] Enforcement de limites por plano
- [ ] Admin dashboard básico
- [ ] Sistema de suporte (tickets)
- [ ] Base de conhecimento (FAQ)
- [ ] Importação de dados CSV
- [ ] Métricas de sucesso trackadas
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 26 Janeiro 2026*
