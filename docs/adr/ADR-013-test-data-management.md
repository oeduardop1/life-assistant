# ADR-013: Estratégia de Gerenciamento de Dados de Teste

## Status

Accepted

## Data

2026-01-13

## Contexto

Durante o desenvolvimento da fase 0 e início da fase 1, foram identificados problemas no gerenciamento de dados de teste:

1. **Seed não idempotente**: O seed de tracking entries cria duplicatas a cada execução porque:
   - Não existem unique constraints em `(user_id, type, entry_date)` na tabela tracking_entries
   - `onConflictDoNothing()` só funciona com constraints de unicidade ou PK
   - Tracking entries não tinham IDs fixos (diferente de notes, habits, goals)

2. **Acúmulo de dados E2E**: Testes de signup criam usuários com pattern `test-{timestamp}@example.com` que nunca são removidos, acumulando no banco.

3. **Reset destrutivo**: A opção `--reset --force` no `infra:down` remove todos os dados, incluindo dados de desenvolvimento válidos criados manualmente.

## Decisão

Implementar três melhorias complementares:

### 1. IDs Determinísticos no Seed

Usar IDs fixos para tracking entries, seguindo o mesmo padrão já utilizado em outras entidades:

```typescript
export const TEST_TRACKING_WEIGHT_ID = '00000000-0000-4000-8000-000000000008';
export const TEST_TRACKING_WATER_ID = '00000000-0000-4000-8000-000000000009';
export const TEST_TRACKING_MOOD_ID = '00000000-0000-4000-8000-000000000010';
```

### 2. Global Teardown no Playwright

Implementar `globalTeardown` que executa após todos os testes E2E:

- Remove usuários dinâmicos (`test-{timestamp}@example.com`)
- Preserva usuários fixos (`test@example.com`, `onboarding@example.com`)
- Configurável via `SKIP_GLOBAL_SETUP` (mesmo flag que setup)

### 3. Permitir Múltiplos Tracking Entries por Dia

**Não adicionar** unique constraint em `(user_id, type, entry_date)` porque:

| Tipo | Múltiplos/dia? | Justificativa |
|------|----------------|---------------|
| meal | Sim | Café, almoço, jantar, lanches |
| water | Sim | Cada copo ao longo do dia |
| exercise | Sim | Treino manhã + caminhada tarde |
| expense | Sim | Múltiplas compras |
| medication | Sim | Remédios 2-3x/dia |
| weight | Raro | Geralmente 1x, mas não deve bloquear |
| mood | Sim | Varia ao longo do dia |

A idempotência do seed é garantida pelos IDs fixos, não por constraints de unicidade.

## Justificativa

### IDs Determinísticos vs Unique Constraint

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **IDs fixos** (escolhida) | Funciona com PK existente, não altera schema, flexibilidade de dados | Requer manutenção dos IDs no seed |
| Unique constraint | Idempotência automática | Limita funcionalidade real, não reflete casos de uso |
| Reset completo | Simples | Perde dados de desenvolvimento |

### Cleanup Seletivo vs Reset Completo

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **Cleanup seletivo** (escolhida) | Preserva dados manuais, rápido | Implementação adicional |
| Reset completo | Zero resíduo | Perde dados de desenvolvimento, mais lento |

### Alinhamento com Best Practices

Per [Playwright Documentation](https://playwright.dev/docs/test-global-setup-teardown):
- Global teardown é o padrão recomendado para limpeza pós-teste
- Fixtures com worker scope para isolamento paralelo
- Teardown projects para dependências complexas

Per [Drizzle ORM Documentation](https://orm.drizzle.team/docs/insert):
- `onConflictDoNothing()` requer constraint para funcionar
- IDs fixos com `onConflictDoNothing()` é pattern válido para seeds idempotentes

## Consequências

### Positivas

- Banco de dados previsível e consistente entre execuções
- Dados de desenvolvimento preservados
- Testes E2E isolados e confiáveis
- Flexibilidade mantida para tracking entries (múltiplos por dia)
- Alinhamento com práticas recomendadas do Playwright

### Negativas

- Requer manutenção dos IDs determinísticos quando adicionar novos tipos de seed
- Teardown adiciona pequeno overhead ao final dos testes (~1-2s)
- Padrão de IDs deve ser documentado para novos desenvolvedores

## Implementação

### Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `packages/database/src/seed/index.ts` | Adicionar IDs fixos para tracking entries |
| `apps/web/e2e/setup/global-teardown.ts` | Criar arquivo de teardown |
| `apps/web/playwright.config.ts` | Adicionar `globalTeardown` |
| `ENGINEERING.md` | Documentar padrões de teste |

### Padrão de IDs Determinísticos

```
00000000-0000-4000-8000-000000000001  # TEST_USER_ID
00000000-0000-4000-8000-000000000002  # TEST_CONVERSATION_ID
00000000-0000-4000-8000-000000000003  # TEST_NOTE_1_ID
00000000-0000-4000-8000-000000000004  # TEST_NOTE_2_ID
00000000-0000-4000-8000-000000000005  # TEST_HABIT_ID
00000000-0000-4000-8000-000000000006  # TEST_GOAL_ID
00000000-0000-4000-8000-000000000007  # TEST_ONBOARDING_USER_ID
00000000-0000-4000-8000-000000000008  # TEST_TRACKING_WEIGHT_ID (novo)
00000000-0000-4000-8000-000000000009  # TEST_TRACKING_WATER_ID (novo)
00000000-0000-4000-8000-000000000010  # TEST_TRACKING_MOOD_ID (novo)
```

## Referências

- [Playwright Global Setup and Teardown](https://playwright.dev/docs/test-global-setup-teardown)
- [Playwright Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Drizzle ORM Upserts and Conflicts](https://orm.drizzle.team/docs/insert#upserts-and-conflicts)
- [ADR-011: Estratégia de Testes E2E no CI](./ADR-011-e2e-testing-strategy-ci.md)
