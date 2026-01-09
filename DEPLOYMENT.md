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
2. **Create Project** → Selecione **Next.js** → Nome: `life-assistant-web`
3. **Create Project** → Selecione **NestJS** → Nome: `life-assistant-api`

### 1.2 Obter Credenciais

| Credencial | Onde Encontrar | Usar Como |
|------------|----------------|-----------|
| DSN (Web) | Project Settings → Client Keys (DSN) | `NEXT_PUBLIC_SENTRY_DSN` |
| DSN (API) | Project Settings → Client Keys (DSN) | `SENTRY_DSN` |
| Auth Token | Settings → Auth Tokens → Create New Token | `SENTRY_AUTH_TOKEN` |
| Org Slug | Organization Settings → General | `SENTRY_ORG` |

**Criar Auth Token:**
1. Settings → Auth Tokens → **Create New Token**
2. Tipo: **Organization Token**
3. Nome: `life-assistant-ci`
4. Scopes: `org:ci` (mínimo necessário)

---

## 2. Configurar Supabase Cloud

### 2.1 Criar Projeto

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project** → Escolha organização
3. Nome: `life-assistant`
4. Região: escolha a mais próxima dos usuários
5. Gere e **salve a senha do banco** (não será exibida novamente)

### 2.2 Obter Credenciais

| Credencial | Caminho no Dashboard | Usar Como |
|------------|----------------------|-----------|
| Project URL | Settings → API → Project URL | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` |
| anon (public) | Settings → API → Project API Keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY` |
| service_role | Settings → API → Project API Keys | `SUPABASE_SERVICE_KEY` |
| Database URI | Settings → Database → Connection string → URI | `DATABASE_URL` |

> **⚠️ Segurança:** A chave `service_role` tem acesso total ao banco. **Nunca exponha no frontend!**

### 2.3 Aplicar Migrations

```bash
# Conectar ao projeto remoto
npx supabase link --project-ref <project-id>

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

> **Nota:** O `vercel.json` no `apps/web` configura automaticamente os comandos de build para funcionar com o monorepo.

### 3.3 Environment Variables

Adicione em **Settings → Environment Variables**:

| Key | Onde Obter |
|-----|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry Dashboard (projeto web) |
| `NEXT_PUBLIC_API_URL` | URL do Railway (após deploy da API) |

### 3.4 Deploy

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
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → URI |
| `SUPABASE_URL` | Supabase Dashboard |
| `SUPABASE_ANON_KEY` | Supabase Dashboard |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard |
| `REDIS_URL` | Upstash ou outro provider Redis |
| `SENTRY_DSN` | Sentry Dashboard (projeto api) |
| `FRONTEND_URL` | URL do Vercel |

### 4.4 Health Check

Em **Settings → Deploy → Health Check**:

| Campo | Valor |
|-------|-------|
| Path | `/api/health` |
| Timeout | `30s` |

### 4.5 Atualizar Vercel

Após o deploy no Railway, copie a URL pública e adicione no Vercel:
- `NEXT_PUBLIC_API_URL` = `https://seu-projeto.railway.app/api`

---

## 5. Configurar GitHub Secrets

Para CI/CD automático, configure em:
**Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Onde Obter |
|--------|------------|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |
| `RAILWAY_TOKEN` | Railway → Account Settings → Tokens |
| `RAILWAY_API_URL` | URL pública do Railway após deploy |
| `SENTRY_DSN` | Sentry Dashboard (projeto api) |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens |
| `SENTRY_ORG` | Sentry → Organization Settings → Slug |
| `SENTRY_PROJECT` | `life-assistant-web` |

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
| Build cancelado | `ignoreCommand` configurado | Remover ou ajustar `vercel.json` |

### Erros no Railway

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| Health check failing | Endpoint não responde | Verificar `PORT` e que app inicia corretamente |
| Connection refused | DATABASE_URL inválida | Verificar string de conexão do Supabase |
| Module not found | Build incompleto | Verificar Build Command inclui dependências |

### Erros de Autenticação

| Erro | Causa Provável | Solução |
|------|----------------|---------|
| "Invalid API key" | Chave Supabase incorreta | Verificar `SUPABASE_ANON_KEY` |
| CORS errors | Frontend URL não permitida | Verificar `FRONTEND_URL` no Railway |

---

## Referências

- [ENGINEERING.md §12](ENGINEERING.md) — Arquitetura de CI/CD
- [Vercel Monorepo Docs](https://vercel.com/docs/monorepos)
- [Railway Docs](https://docs.railway.app/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Sentry Next.js Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
