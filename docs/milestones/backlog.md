# Backlog Técnico

> Itens de melhoria técnica identificados durante desenvolvimento que não são críticos mas devem ser feitos eventualmente.

---

## Logging e Observabilidade

- [ ] Adicionar logging para knowledge items descartados durante consolidação
  - **Contexto:** `consolidation-prompt.ts` descarta items com tipos inválidos silenciosamente
  - **Arquivo:** `apps/api/src/jobs/memory-consolidation/consolidation-prompt.ts`

- [ ] Implementar Audit Logging para operações sensíveis do Settings
  - **Contexto:** M0.11 Settings não inclui auditoria de alterações sensíveis
  - **Eventos a logar:**
    - `settings.profile.updated` - Alteração de perfil
    - `settings.email.change_requested` - Solicitação de mudança de email
    - `settings.email.changed` - Email alterado (após verificação)
    - `settings.password.changed` - Senha alterada
  - **Implementação sugerida:**
    - Criar `AuditLogService` em `apps/api/src/modules/audit/`
    - Persistir em tabela `audit_logs` (já existe no schema)
    - Incluir: userId, action, metadata, ip, userAgent, timestamp
  - **Arquivos:**
    - `apps/api/src/modules/settings/application/services/settings.service.ts`
    - `apps/api/src/modules/audit/` (criar)

---

## Memória e Contexto

- [ ] Implementar detecção de memória desatualizada (stale memory)
  - **Contexto:** Sistema não detecta se Memory Consolidation falhou por vários dias
  - **Impacto:** Usuário pode receber respostas baseadas em memória desatualizada
  - **Implementação sugerida:**
    - Adicionar check em `UserMemoryService.getOrCreate()` para idade da última consolidação
    - Query: última `memory_consolidations` com `status='completed'` para o userId
    - Se >7 dias sem consolidação bem-sucedida, logar WARNING
    - Considerar: flag no contexto para LLM saber que memória pode estar desatualizada
  - **Arquivos:**
    - `apps/api/src/modules/memory/application/services/user-memory.service.ts`
    - `apps/api/src/modules/memory/infrastructure/repositories/memory-consolidation.repository.ts`

---

## Testes

- [ ] Adicionar testes para AdminModule
  - **Contexto:** AdminJobsController não tem testes unitários
  - **Arquivo:** `apps/api/test/unit/modules/admin/admin-jobs.controller.spec.ts`

---

## Segurança e RLS (Prioridade Alta)

> **Contexto:** Análise de 16 Jan 2026 identificou que 14 tabelas têm RLS apenas no `rls-policies.sql`
> (script manual) e não nas migrations Supabase. Isso significa que `supabase db reset` não aplica
> RLS a essas tabelas automaticamente. O código backend está protegido via `withUserId()`, mas o
> banco precisa de RLS como segunda camada de defesa.
>
> **Decisão:** Consolidar RLS nas migrations Supabase (padrão novo) e manter `rls-policies.sql` apenas como referência.

- [ ] Criar migration `20260117000000_complete_rls.sql` para as 10 tabelas faltantes:
  - Tabelas: `life_balance_history`, `vault_items`, `notifications`, `reminders`, `user_integrations`, `calendar_events`, `budgets`, `subscriptions`, `export_requests`, `audit_logs`
  - **Padrão:** Usar `public.get_current_user_id()` + service role bypass
  - **Referência:** `supabase/migrations/20260114200001_tracking_notes_goals_habits.sql`

- [ ] Atualizar `rls-policies.sql` com as 3 tabelas do Memory System:
  - Tabelas: `user_memories`, `knowledge_items`, `memory_consolidations`
  - **Motivo:** Manter sincronizado como documentação/referência

- [ ] Adicionar teste pgTAP para validar cobertura RLS:
  - Criar `supabase/tests/rls_coverage.test.sql`
  - Usar helper `tests.rls_enabled('public')` do Supabase
  - Integrar no CI via `supabase test db`
  - **Referência:** https://supabase.com/docs/guides/local-development/testing/pgtap-extended

- [ ] Documentar em docs/specs/engineering.md §6:
  - Regra: toda nova tabela com `user_id` DEVE ter RLS na própria migration
  - Template de policy padrão a seguir
  - Referência ao teste pgTAP de validação
