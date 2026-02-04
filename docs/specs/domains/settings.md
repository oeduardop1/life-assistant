# Settings

> Configurações do usuário: perfil, segurança e preferências de integrações.

---

## 1. Overview

O módulo Settings é a central de configurações do usuário, organizado em seções:

| Seção | Milestone | Descrição |
|-------|-----------|-----------|
| **Perfil** | M0.11 | Nome, avatar |
| **Segurança** | M0.11 | Email, senha |
| **Preferências** | M0.11 | Fuso horário |
| **Telegram** | M3.1 | Conexão com bot |
| **Calendário** | M3.2 | Google Calendar |
| **Notificações** | M3.4 | Preferências por tipo/canal |
| **Assinatura** | M3.x | Plano, pagamentos |

---

## 2. Perfil (M0.11)

### 2.1 Atualizar Nome

**Regras:**
- Mínimo 2 caracteres, máximo 100
- Apenas trimmed (sem espaços no início/fim)
- Armazenado em `public.users.name` (sincronizado via trigger do Supabase Auth)

**Fluxo:**
1. Usuário edita nome
2. Validação client-side
3. `PATCH /api/settings/profile`
4. Atualiza diretamente na tabela `public.users`
5. Feedback de sucesso

---

## 3. Segurança (M0.11)

### 3.1 Alterar Email

**Regras:**
- Requer senha atual para confirmar identidade
- Novo email deve ser válido e diferente do atual
- Novo email não pode estar em uso por outro usuário
- Rate limit: 3 tentativas por hora

**Fluxo:**
1. Usuário informa novo email + senha atual
2. Sistema verifica senha atual
3. Sistema verifica se novo email não está em uso
4. Supabase envia link de verificação para **novo** email
5. Sistema envia notificação de segurança para **email antigo**
6. Usuário clica no link de verificação
7. Email é atualizado

**Email de notificação (email antigo):**
```
Assunto: Solicitação de alteração de email

Olá {nome},

Recebemos uma solicitação para alterar o email da sua conta
de {email_antigo} para {email_novo}.

Se você não fez essa solicitação, entre em contato conosco
imediatamente.
```

### 3.2 Alterar Senha

**Regras:**
- Requer senha atual válida
- Nova senha deve ter score mínimo 2 no zxcvbn (Fair)
- Nova senha não pode ser igual à atual
- Rate limit: 5 tentativas por hora

**Fluxo:**
1. Usuário informa senha atual + nova senha
2. Sistema verifica senha atual
3. Validação de força (zxcvbn)
4. Atualiza via Supabase Auth
5. Invalida outras sessões (opcional, configurável)
6. Feedback de sucesso

**Níveis de força (zxcvbn):**
| Score | Label | Cor | Permitido |
|-------|-------|-----|-----------|
| 0 | Muito fraca | Vermelho | ❌ |
| 1 | Fraca | Laranja | ❌ |
| 2 | Razoável | Amarelo | ✅ |
| 3 | Boa | Verde claro | ✅ |
| 4 | Forte | Verde | ✅ |

---

## 4. Preferências (M0.11)

### 4.1 Fuso Horário

**Armazenamento:** `public.users.timezone` (TEXT NOT NULL, default 'America/Sao_Paulo')

**Regras:**
- Deve ser um timezone IANA válido (ex: 'America/Sao_Paulo', 'America/Manaus')
- Validado via `Intl.DateTimeFormat` no backend
- Coletado durante onboarding, editável em /settings

**Uso no sistema:**
- Todas as operações de data usam o timezone do usuário
- "Hoje" = data atual no timezone do usuário (não UTC)
- Mês atual = mês no timezone do usuário
- Calendário, tracking, finanças respeitam o timezone

**Fluxo:**
1. Usuário seleciona timezone na lista
2. `PATCH /api/settings/timezone`
3. Atualiza `public.users.timezone`
4. Frontend atualiza cache de settings

**Timezones comuns (Brasil):**
- `America/Sao_Paulo` - Brasília (UTC-3)
- `America/Manaus` - Manaus (UTC-4)
- `America/Rio_Branco` - Rio Branco (UTC-5)
- `America/Noronha` - Fernando de Noronha (UTC-2)

---

## 5. Integrações (Futuro)

### 4.1 Telegram (M3.1)

**Dados armazenados:**
- `telegram_chat_id` - ID do chat para envio de mensagens
- `telegram_username` - Username para referência
- `telegram_connected_at` - Data da conexão

**Fluxo de conexão:**
1. Usuário acessa `/settings/telegram`
2. Sistema gera código único temporário (6 dígitos, 10 min validade)
3. Usuário envia código para bot no Telegram
4. Bot valida código e vincula `chat_id` ao usuário
5. Conexão confirmada

**Fluxo de desconexão:**
1. Usuário clica em "Desconectar"
2. Confirmação
3. Remove `telegram_chat_id` do perfil
4. Bot para de enviar mensagens

### 4.2 Google Calendar (M3.2)

**Dados armazenados:**
- `google_refresh_token` (criptografado)
- `google_calendar_id` - Calendário selecionado
- `google_connected_at`

**Fluxo de conexão:**
1. OAuth 2.0 com Google
2. Usuário seleciona calendário(s) para sincronizar
3. Token armazenado de forma segura

**Permissões solicitadas:**
- `calendar.readonly` - Leitura de eventos
- `calendar.events` - Criação de eventos (futuro)

### 4.3 Notificações (M3.4)

**Preferências por tipo:**
```typescript
interface NotificationPreferences {
  morning_summary: {
    enabled: boolean;
    time: string; // HH:mm
    channels: ('telegram' | 'email' | 'push')[];
  };
  alerts: {
    enabled: boolean;
    channels: ('telegram' | 'email' | 'push')[];
  };
  reminders: {
    enabled: boolean;
    channels: ('telegram' | 'push')[];
  };
  weekly_report: {
    enabled: boolean;
    day: 0-6; // 0 = domingo
    time: string;
    channels: ('telegram' | 'email')[];
  };
}
```

### 4.4 Assinatura (M3.x)

Ver `docs/specs/domains/saas.md` para detalhes de billing.

**Funcionalidades:**
- Visualizar plano atual
- Histórico de faturas
- Atualizar método de pagamento
- Upgrade/downgrade de plano
- Cancelar assinatura

---

## 5. API Endpoints

### 5.1 Perfil

```
PATCH /api/settings/profile
Body: { name: string }
Response: { success: true }
```

### 5.2 Segurança

```
PATCH /api/settings/email
Body: { newEmail: string, currentPassword: string }
Response: { success: true, message: "Verification email sent" }

PATCH /api/settings/password
Body: { currentPassword: string, newPassword: string }
Response: { success: true }
```

### 5.3 Preferências

```
PATCH /api/settings/timezone
Body: { timezone: string }
Response: { success: true, message: "Fuso horário atualizado com sucesso" }
```

### 5.4 Integrações (Futuro)

```
GET    /api/settings/integrations
POST   /api/settings/integrations/telegram/connect
DELETE /api/settings/integrations/telegram
POST   /api/settings/integrations/google/connect
DELETE /api/settings/integrations/google
PATCH  /api/settings/notifications
```

---

## 6. Segurança

### 6.1 Rate Limiting

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `PATCH /settings/email` | 3 | 1 hora |
| `PATCH /settings/password` | 5 | 1 hora |
| `POST /integrations/*/connect` | 10 | 1 hora |

### 6.2 Autenticação

- Todos os endpoints requerem JWT válido
- Alterações sensíveis (email, senha) requerem verificação de senha atual
- Tokens de integração armazenados com criptografia AES-256

### 6.3 Auditoria

Eventos logados:
- `settings.profile.updated`
- `settings.email.change_requested`
- `settings.email.changed`
- `settings.password.changed`
- `settings.integration.connected`
- `settings.integration.disconnected`

---

## 7. Dados

### 7.1 Armazenamento

| Dado | Local | Motivo |
|------|-------|--------|
| Nome | `public.users.name` | Sincronizado via trigger do auth (ver supabase-auth.md) |
| Email | `public.users.email` + `auth.users.email` | Leitura em public.users, alteração via Supabase Auth |
| Senha | `auth.users` | Gerenciado pelo Supabase Auth |
| Timezone | `public.users.timezone` | IANA timezone (ex: 'America/Sao_Paulo') |
| Telegram ID | `public.user_profiles.telegram_chat_id` | Integração (futuro) |
| Google Token | `public.user_integrations` | Tokens OAuth criptografados (futuro) |

> **Padrão de acesso a dados do usuário:** Para leitura, sempre usar `public.users` via DatabaseService (conforme `supabase-auth.md` §Auth Middleware). Supabase Admin API é usado apenas para operações de autenticação (login, senha, tokens).

### 7.2 Tabelas Relacionadas

```sql
-- Já existe: auth.users (Supabase)
-- Já existe: public.users (inclui name, email, timezone)
-- Já existe: public.user_profiles (M0.8 Onboarding)

-- Coluna timezone em public.users:
-- timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo'
-- Armazena IANA timezone string (ex: 'America/Sao_Paulo', 'America/Manaus')
-- Coletado durante onboarding, editável em /settings

-- Futuro: M3.x
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'telegram'
  credentials JSONB NOT NULL, -- criptografado
  metadata JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

---

## 8. Checklist de Implementação

### M0.11 - Settings Base ✅
- [x] Backend: módulo settings
- [x] Backend: endpoints profile/email/password
- [x] Backend: rate limiting
- [x] Backend: testes
- [x] Frontend: página /settings
- [x] Frontend: seções Perfil e Segurança
- [x] Frontend: validações e feedback

### M3.1 - Telegram
- [ ] Seção /settings/telegram
- [ ] Fluxo de conexão com código

### M3.2 - Google Calendar
- [ ] Seção /settings/calendar
- [ ] OAuth flow

### M3.4 - Notificações
- [ ] Seção /settings/notifications
- [ ] Preferências por tipo/canal

### M3.x - Billing
- [ ] Seção /settings/billing
- [ ] Integração Stripe
