# ADR-019: Drizzle as Single Source of Truth for Migrations

## Status

Accepted

## Data

2026-01-25

## Contexto

O projeto tinha **dois sistemas de migrations concorrentes** que criavam schema sobreposto:

1. **Supabase Migrations** (`supabase/migrations/`) - 5 arquivos SQL, aplicados durante `supabase start`
2. **Drizzle Migrations** (`packages/database/src/migrations/`) - 2 arquivos SQL, aplicados via `db:migrate`

Isso causava:
- **Falha em DB fresh**: Supabase criava enums primeiro → Drizzle falhava com "type already exists"
- **Tabelas faltando**: 19 tabelas do módulo Finance nunca criadas em DBs novos
- **Risco de drift**: Mudanças em um sistema podiam conflitar com o outro
- **Confusão**: Desenvolvedores e assistentes de IA incertos sobre qual sistema usar

### Sobreposição de Schema

| Aspecto | Supabase | Drizzle |
|---------|----------|---------|
| Tabelas | 15 | 33 |
| Enums | 11 | 30 |
| Triggers | 11 | 0 (antes) |
| RLS Policies | 24 | 0 (em apply-rls.ts) |

Tabelas em **ambos**: users, conversations, messages, tracking_entries, notes, note_links, goals, goal_milestones, habits, habit_completions, user_memories, knowledge_items, memory_consolidations

## Decisão

Usar **Drizzle ORM como única fonte de verdade** para migrations, eliminando Supabase migrations.

## Justificativa

### Por que Drizzle (não Supabase)?

1. **Schema completo**: Drizzle tem 33 tabelas vs 15 do Supabase - todas as tabelas de negócio estão no Drizzle
2. **Type safety**: Arquivos TypeScript de schema fornecem validação em tempo de compilação
3. **Integração ORM**: Queries usam tipos Drizzle diretamente
4. **Tooling padrão**: `drizzle-kit generate/migrate` é o padrão moderno
5. **Compatibilidade Supabase**: Migrations Drizzle podem incluir RLS e triggers

### Implementação

1. **Migration idempotente**: Reescrita de `0000_luxuriant_wraith.sql` com padrões idempotentes:
   - `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` para ENUMs
   - `CREATE TABLE IF NOT EXISTS` para tabelas
   - `CREATE INDEX IF NOT EXISTS` para índices
   - Triggers `updated_at` e sync `auth.users → public.users` incluídos

2. **Supabase migrations removidas**: Diretório `supabase/migrations/` agora vazio

3. **Scripts atualizados**:
   - `pnpm infra:up` aplica migrations Drizzle automaticamente
   - Bootstrap script removido (não mais necessário)

## Consequências

### Positivas

- **Um sistema, uma verdade**: Elimina confusão e conflitos
- **Idempotência**: Migrations podem ser re-aplicadas sem erro
- **Type safety**: Schema TypeScript validado em compilação
- **DB fresh funciona**: `pnpm infra:down -r -f && pnpm infra:up` cria todas as 33 tabelas

### Negativas

- **Migration inicial grande**: ~1000 linhas de SQL idempotente
- **Triggers no SQL**: Triggers `updated_at` agora definidos na migration SQL, não no schema TS

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `packages/database/src/migrations/0000_luxuriant_wraith.sql` | Reescrito com padrões idempotentes + triggers |
| `supabase/migrations/*.sql` | Deletados (5 arquivos) |
| `packages/database/scripts/bootstrap-migrations.ts` | Deletado |
| `packages/database/package.json` | Removido `db:bootstrap` |
| `scripts/dev-start.sh` | Removida lógica de bootstrap |
| `.github/workflows/ci.yml` | Adicionado step `db:migrate` |
| `CLAUDE.md`, `README.md`, `DEPLOYMENT.md` | Documentação atualizada |
| `docs/specs/engineering.md`, `docs/specs/data-model.md` | Workflow atualizado |

## Workflow Atual

```bash
# Schema change
1. Editar packages/database/src/schema/*.ts
2. pnpm --filter database db:generate
3. Revisar SQL em packages/database/src/migrations/
4. pnpm --filter database db:migrate

# Fresh database
pnpm infra:down -r -f && pnpm infra:up

# Reset sem perder dados
pnpm infra:down && pnpm infra:up
```

## Referências

- [ADR-009: Supabase CLI](./ADR-009-supabase-cli-local-development.md)
- [CLAUDE.md §Database Development](../../CLAUDE.md)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/migrations)
