# Guia de Deploy — Life Assistant

> Guia operacional passo a passo para deploy em produção.
> Para arquitetura e decisões técnicas, veja [ENGINEERING.md §12](ENGINEERING.md).

## Visão Geral

| Serviço | Plataforma | Função |
|---------|------------|--------|
| Web (Next.js) | Vercel | Frontend |
| API (NestJS) | Railway | Backend |
| Database | Supabase Cloud | PostgreSQL + Auth |
| Error Tracking | Sentry | Monitoramento de erros |

## Pré-requisitos

- [ ] Conta no GitHub com o repositório
- [ ] Conta no [Vercel](https://vercel.com) (gratuito)
- [ ] Conta no [Railway](https://railway.app) (gratuito para começar)
- [ ] Conta no [Supabase](https://supabase.com) (gratuito)
- [ ] Conta no [Sentry](https://sentry.io) (gratuito)

---

## 1. Configurar Sentry

### 1.1 Criar Projetos

1. Acesse [sentry.io](https://sentry.io) e faça login
2. **Projects** → **Create Project** → Selecione **Next.js** → Nome: `life-assistant-web`
3. **Projects** → **Create Project** → Selecione **Node.js** (para NestJS) → Nome: `life-assistant-api`

### 1.2 Obter DSN

O DSN identifica para qual projeto os erros serão enviados.

**Caminho:** `[Projeto] → Settings → SDK Setup → Client Keys (DSN)`

| Projeto | Usar Como |
|---------|-----------|
| `life-assistant-web` | `NEXT_PUBLIC_SENTRY_DSN` |
| `life-assistant-api` | `SENTRY_DSN` |

### 1.3 Criar Auth Token (para CI/CD)

O Auth Token permite upload de source maps e releases.

**Caminho:** `Settings → Developer Settings → Organization Tokens`

1. Clique em **Create New Token**
2. Nome: `life-assistant-ci`
3. O token terá permissões pré-configuradas para CI (não é customizável)
4. **Copie o token** — ele não será exibido novamente

> **Nota:** Organization Tokens são recomendados para CI. Personal Tokens param de funcionar se o usuário for removido da organização.

### 1.4 Obter Org Slug

**Caminho:** `Settings → General Settings`

O slug aparece na URL: `https://sentry.io/organizations/[org-slug]/`

| Credencial | Usar Como |
|------------|-----------|
| Organization Slug | `SENTRY_ORG` |
| Project Slug (web) | `SENTRY_PROJECT` |

---

## 2. Configurar Supabase Cloud

### 2.1 Criar Projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project** → Escolha organização
3. Nome: `life-assistant`
4. Região: escolha a mais próxima dos usuários
5. Gere e **salve a senha do banco** (não será exibida novamente)

### 2.2 Obter Credenciais de API

**Caminho:** `Project Settings → API` ou clique no botão **Connect** no topo do dashboard

#### Novo Sistema de Chaves (Recomendado)

Supabase está migrando para um novo formato de chaves. Na aba **API Keys**:

| Chave | Formato | Usar Como | Onde Usar |
|-------|---------|-----------|-----------|
| **Publishable key** | `sb_publishable_...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend (browser) |
| **Secret key** | `sb_secret_...` | `SUPABASE_SERVICE_KEY` | Backend only |

> **Criar chaves:** Se não existirem, clique em **+ New publishable key** ou **+ New secret key**

#### Chaves Legacy (Compatibilidade)

Na aba **Legacy anon, service_role API keys**:

| Chave | Usar Como | Onde Usar |
|-------|-----------|-----------|
| `anon` (public) | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` | Frontend + Backend |
| `service_role` | `SUPABASE_SERVICE_KEY` | Backend only |

> **⚠️ Segurança:** A chave `service_role` / `sb_secret_*` tem acesso total ao banco. **Nunca exponha no frontend!**

### 2.3 Obter Project URL

**Caminho:** `Project Settings → API → Project URL`

Ou clique no botão **Connect** no topo do dashboard.

Formato: `https://[project-ref].supabase.co`

| Credencial | Usar Como |
|------------|-----------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` |

### 2.4 Obter Connection String (DATABASE_URL)

**Caminho:** Clique no botão **Connect** no topo do dashboard

Selecione o modo de conexão:
- **Direct connection** — Para aplicações com poucas conexões persistentes
- **Transaction pooler** — Para serverless/edge (muitas conexões curtas)
- **Session pooler** — Alternativa ao direct via IPv4

Copie a connection string e substitua `[YOUR-PASSWORD]` pela senha do banco.

| Credencial | Usar Como |
|------------|-----------|
| Connection string | `DATABASE_URL` |

### 2.5 Aplicar Migrations

```bash
# Conectar ao projeto remoto
npx supabase link --project-ref <project-ref>

# Aplicar migrations
npx supabase db push
```

---

## 3. Configurar Vercel (Web)

### 3.1 Import do Repositório

1. Acesse [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → Selecione `life-assistant`

### 3.2 Configurações de Build

| Campo | Valor |
|-------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| ☑️ Include source files outside Root Directory | **Habilitado** |

> **Nota:** O `vercel.json` em `apps/web` configura automaticamente os comandos de build para funcionar com o monorepo Turborepo.

### 3.3 Environment Variables

Adicione em **Project Settings → Environment Variables**:

| Key | Onde Obter |
|-----|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect ou Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API Keys (publishable ou anon) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry → Projeto web → Settings → Client Keys (DSN) |
| `NEXT_PUBLIC_API_URL` | URL do Railway (após deploy da API) |

### 3.4 Criar Access Token (para CI/CD)

**Caminho:** [vercel.com/account/tokens](https://vercel.com/account/tokens)

Ou: Clique no avatar → **Settings** → **Tokens**

1. Certifique-se de estar em **Personal Account** (não em Teams)
2. Clique em **Create**
3. Nome: `life-assistant-ci`
4. Scope: Selecione o team/account apropriado
5. Expiration: escolha conforme necessidade
6. **Copie o token** — ele não será exibido novamente

### 3.5 Deploy

Clique em **Deploy** e aguarde a conclusão.

---

## 4. Configurar Railway (API)

### 4.1 Criar Projeto

1. Acesse [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → Selecione `life-assistant`

### 4.2 Configurações de Build

Em **Settings → Build**:

| Campo | Valor |
|-------|-------|
| Root Directory | `/` (raiz) |
| Build Command | `pnpm build --filter=api` |
| Start Command | `cd apps/api && node dist/main.js` |

### 4.3 Environment Variables

Em **Variables**, adicione:

| Key | Onde Obter |
|-----|------------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | Supabase → Connect → Connection string |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API Keys |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API Keys (secret ou service_role) |
| `REDIS_URL` | Upstash ou outro provider Redis |
| `SENTRY_DSN` | Sentry → Projeto api → Settings → Client Keys (DSN) |
| `FRONTEND_URL` | URL do Vercel |

### 4.4 Health Check

Em **Settings → Deploy → Health Check**:

| Campo | Valor |
|-------|-------|
| Path | `/api/health` |
| Timeout | `30s` |

### 4.5 Criar API Token (para CI/CD)

**Caminho:** [railway.com/account/tokens](https://railway.com/account/tokens)

Ou: Clique no avatar → **Account Settings** → **Tokens**

1. Clique em **Create**
2. Nome: `life-assistant-ci`
3. **Team dropdown:**
   - Selecione um team → cria token de team
   - Não selecione → cria token de conta pessoal
4. **Copie o token** — ele não será exibido novamente

### 4.6 Atualizar Vercel

Após o deploy no Railway, copie a URL pública e adicione no Vercel:
- `NEXT_PUBLIC_API_URL` = `https://seu-projeto.railway.app/api`

---

## 5. Configurar GitHub Secrets

Para CI/CD automático, configure em:
**Repository → Settings → Secrets and variables → Actions → New repository secret**

### Secrets Necessários

| Secret | Onde Obter | Para Que Serve |
|--------|------------|----------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) | Deploy do frontend |
| `RAILWAY_TOKEN` | [railway.com/account/tokens](https://railway.com/account/tokens) | Deploy do backend |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Developer Settings → Organization Tokens | Upload de source maps |
| `SENTRY_ORG` | Sentry → Settings → General Settings (slug na URL) | Identificar organização |
| `SENTRY_PROJECT` | `life-assistant-web` | Identificar projeto |

### Secrets Opcionais (para health checks no CI)

| Secret | Onde Obter |
|--------|------------|
| `RAILWAY_API_URL` | URL pública do Railway após deploy |
| `SENTRY_DSN` | Sentry → Projeto api → Client Keys (DSN) |

---

## 6. Verificação Pós-Deploy

### Checklist

- [ ] Web carrega em `https://seu-projeto.vercel.app`
- [ ] API responde em `https://seu-projeto.railway.app/api/health`
- [ ] Login funciona (Supabase Auth)
- [ ] Erros aparecem no Sentry

### Comandos de Teste

```bash
# Testar health check da API
curl https://seu-projeto.railway.app/api/health

# Resposta esperada:
# {"status":"ok","timestamp":"...","version":"0.1.0"}
```

---

## 7. Troubleshooting

### Erros no Vercel

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| "No Next.js version detected" | Root Directory errado | Mudar para `apps/web` |
| "Module not found: @life-assistant/*" | Packages não compilados | Habilitar "Include source files outside Root Directory" |
| "Supabase URL required" | Variável não configurada | Adicionar `NEXT_PUBLIC_SUPABASE_URL` nas Environment Variables |
| Build cancelado | `ignoreCommand` no vercel.json | Remover a propriedade `ignoreCommand` |

### Erros no Railway

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| Health check failing | Endpoint não responde | Verificar `PORT` e que app inicia corretamente |
| Connection refused | DATABASE_URL inválida | Verificar connection string do Supabase |
| Module not found | Build incompleto | Verificar Build Command inclui dependências |

### Erros de Autenticação

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| "Invalid API key" | Chave Supabase incorreta | Verificar `SUPABASE_ANON_KEY` |
| CORS errors | Frontend URL não permitida | Verificar `FRONTEND_URL` no Railway |
| 401 Unauthorized (Supabase) | Usando secret key no browser | Usar publishable/anon key no frontend |

---

## Referências

- [ENGINEERING.md §12](ENGINEERING.md) — Arquitetura de CI/CD
- [Vercel Monorepo Docs](https://vercel.com/docs/monorepos)
- [Railway Docs](https://docs.railway.com/)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Sentry Auth Tokens](https://docs.sentry.io/account/auth-tokens/)
- [Sentry Next.js Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
