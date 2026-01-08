# ADR-009: Supabase CLI para Desenvolvimento Local

## Status

Accepted

## Data

2026-01-07

## Contexto

O projeto usa Supabase para database e autenticação (conforme ADR-002). Para desenvolvimento local, havia duas opções:

1. PostgreSQL standalone no docker-compose + validação JWT manual
2. Supabase CLI que roda todos os serviços localmente

A decisão inicial colocava um PostgreSQL com pgvector no docker-compose (porta 5432), porém isso apresentava limitações para o fluxo de autenticação:

- Triggers em `auth.users` não funcionam sem o schema `auth` do Supabase
- Sync entre `auth.users` → `public.users` não seria possível
- Menor paridade entre desenvolvimento e produção (Supabase Cloud)

## Decisão

Usar **Supabase CLI** (`npx supabase start`) para desenvolvimento local, removendo o PostgreSQL do docker-compose.

## Justificativa

### Alta Paridade Dev/Prod

Com Supabase CLI, o ambiente local replica exatamente o que teremos em produção:

- PostgreSQL com schema `auth` completo
- GoTrue (Auth API) com mesmo comportamento
- Triggers funcionam nativamente
- RLS policies com `auth.user_id()` funcionam

### Integração Nativa com Auth

O projeto implementa autenticação via Supabase Auth (M0.7). Os triggers que sincronizam `auth.users` → `public.users` só funcionam com o PostgreSQL do Supabase:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### pgvector Incluído

O Supabase CLI já inclui PostgreSQL com extensão pgvector habilitada, necessária para o futuro milestone de RAG (M1.5).

## Consequências

### Positivas

- Alta paridade entre desenvolvimento e produção
- Triggers `auth.users → public.users` funcionam localmente
- Desenvolvimento offline possível
- Emails capturados no Inbucket (não envia emails reais)
- PostgreSQL 17 com pgvector incluso
- Studio para administração local (porta 54323)

### Negativas

- Requer Docker com mais recursos (~2GB RAM adicional)
- Supabase CLI adiciona mais containers ao ambiente
- Porta diferente (54322 ao invés de 5432)

## Implementação

### Portas do Supabase CLI

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| API | 54321 | REST API e Auth |
| PostgreSQL | 54322 | Database |
| Studio | 54323 | Dashboard admin |
| Inbucket | 54324 | Captura de emails |

### Comandos

```bash
# Inicializar (primeira vez)
npx supabase init

# Iniciar serviços
npx supabase start

# Parar serviços
npx supabase stop

# Resetar banco (aplica migrations)
npx supabase db reset
```

### Variáveis de Ambiente

```bash
# DATABASE_URL atualizada para porta 54322
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Variáveis existentes do Supabase (keys demo)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
```

## Alternativas Consideradas

### PostgreSQL Standalone + JWT Manual

Manter PostgreSQL no docker-compose (porta 5432) e validar JWT manualmente.

**Por que não:**
- Menor paridade dev/prod
- Triggers em `auth.users` não funcionam
- Sync `auth.users → public.users` requer workarounds
- Emails de confirmação não testáveis localmente

### Supabase Cloud para Dev

Usar projeto Supabase Cloud mesmo em desenvolvimento.

**Por que não:**
- Requer conexão com internet
- Custos mesmo em dev
- Dados de teste em ambiente cloud
- Emails reais seriam enviados

## Referências

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [ADR-002: Supabase para Database e Auth](./ADR-002-supabase-database-auth.md)
- [ENGINEERING.md §9 - Docker/Infra](../ENGINEERING.md)
