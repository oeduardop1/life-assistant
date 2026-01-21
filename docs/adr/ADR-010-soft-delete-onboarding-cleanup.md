# ADR-010: Soft Delete para Cleanup de Onboardings Abandonados

## Status

Accepted

## Data

2026-01-08

## Contexto

O `docs/specs/system.md` §3.1 especifica que usuários com onboarding abandonado após 30 dias devem ter "dados parciais deletados". Durante a implementação do M0.8 (Onboarding Wizard), foi necessário decidir entre:

1. **Hard delete** — Remoção física dos registros do banco de dados
2. **Soft delete** — Marcação lógica via campos `deletedAt` e `status`

A escolha impacta auditabilidade, recuperação de dados, compliance com LGPD, e complexidade de queries.

## Decisão

Usar **soft delete** via campos `deletedAt` (timestamp) e `status='deleted'`.

### Implementação

```typescript
// cleanup-onboarding.processor.ts
await this.databaseService.db
  .update(users)
  .set({
    status: UserStatus.DELETED,
    deletedAt: now,
    updatedAt: now,
  })
  .where(eq(users.id, user.id));
```

### Critérios para Cleanup

Usuários são marcados como deletados quando:
- `status = 'pending'` (não completou onboarding)
- `onboardingCompletedAt IS NULL`
- `createdAt < (NOW - 30 dias)`
- `deletedAt IS NULL` (não foi deletado anteriormente)

## Consequências

### Positivas

- **Recuperação de dados**: Permite restaurar usuários deletados por engano
- **Auditabilidade**: Mantém trilha de auditoria para compliance (LGPD Art. 18)
- **Análise de abandono**: Dados podem ser usados para análise de funnel e melhorias no onboarding
- **Consistência**: Alinha com padrão de soft delete já usado em outras tabelas do sistema
- **Segurança**: RLS policies já filtram por `deletedAt IS NULL`, garantindo que dados deletados não vazem

### Negativas

- **Espaço em disco**: Dados ocupam espaço mesmo após "deletados"
  - *Mitigação*: Implementar purge físico após 90 dias (job futuro)
- **Complexidade de queries**: Todas as queries precisam filtrar `deletedAt IS NULL`
  - *Mitigação*: RLS policies já fazem isso automaticamente

## Alternativas Consideradas

### 1. Hard Delete (Rejeitada)

```sql
DELETE FROM users WHERE ...
```

**Prós**: Libera espaço imediatamente, queries mais simples
**Contras**: Sem recuperação, sem auditoria, viola princípio LGPD de "direito ao esquecimento" gradual

### 2. Arquivamento em Tabela Separada (Rejeitada)

```sql
INSERT INTO users_archived SELECT * FROM users WHERE ...;
DELETE FROM users WHERE ...;
```

**Prós**: Separa dados ativos de arquivados
**Contras**: Complexidade adicional, necessita sincronização de schema entre tabelas

## Trabalho Futuro

- [ ] Implementar job de purge físico para registros com `deletedAt > 90 dias` (M3.4 ou posterior)
- [ ] Considerar notificação por email antes do cleanup (já planejado para M3.4)

## Referências

- `docs/specs/system.md` §3.1 — Onboarding Abandonado
- `docs/specs/engineering.md` §7 — Jobs e Filas (BullMQ)
- `apps/api/src/jobs/cleanup-onboarding/cleanup-onboarding.processor.ts` — Implementação
- LGPD Art. 18 — Direitos do titular dos dados
