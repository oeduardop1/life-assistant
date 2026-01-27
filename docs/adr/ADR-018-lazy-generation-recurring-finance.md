# ADR-018: Lazy Generation para Recorrências Financeiras

## Status

Accepted

## Date

2026-01-23 (Atualizado: 2026-01-26)

## Context

O módulo Finance (M2.2) implementa contas fixas, despesas variáveis e rendas que podem ser **recorrentes** (`isRecurring=true`). O plano original previa um **job BullMQ agendado** (`finance-recurrence`, cron: `0 5 0 1 * *`) que executaria no dia 1 de cada mês às 00:05 UTC, copiando todos os registros recorrentes para o novo mês.

### Problemas identificados com a abordagem job-based:

1. **Falha silenciosa:** Se o job falhar (crash, timeout, Redis down), o usuário não teria seus registros recorrentes no mês — sem feedback imediato.
2. **Complexidade operacional:** Requer Redis, BullMQ, monitoramento de job queues, retry policies, dead-letter queues.
3. **Race condition temporal:** Usuário acessa o sistema à 00:01 do dia 1 (antes do job rodar às 00:05) e não vê seus registros.
4. **Recuperação manual:** Se o job falhar, requer intervenção manual ou re-agendamento — sem auto-healing.
5. **Desperdício de recursos:** Processa TODOS os usuários do sistema de uma vez, mesmo aqueles que não acessarão o módulo finance naquele mês.
6. **Testabilidade:** Testar jobs agendados é mais complexo que testar lógica síncrona no service layer.

### Alternativa identificada:

**Lazy generation** — gerar registros sob demanda quando o usuário (ou o sistema) acessa um mês específico.

## Decision

Implementar **lazy generation** no service layer em vez de job agendado:

### Algoritmo

Quando `findAll(userId, { monthYear })` ou `getSummary(userId, monthYear)` é chamado:

1. Calcular `previousMonth = monthYear - 1` (tratando boundary dez→jan)
2. Buscar todos os registros com `isRecurring=true AND recurringGroupId IS NOT NULL` do mês anterior
3. Para cada registro: verificar se já existe entrada com mesmo `(userId, recurringGroupId, monthYear)` no mês alvo
4. Se não existir: criar cópia com campos resetados (status='pending', paidAt=null, etc.)
5. Usar `INSERT ... ON CONFLICT (user_id, recurring_group_id, month_year) DO NOTHING` para idempotência em concorrência

### Mecanismos de segurança

- **`recurringGroupId` (UUID):** Identifica a "série" de um item recorrente. Atribuído no `create()` quando `isRecurring=true`.
- **UNIQUE constraint `(user_id, recurring_group_id, month_year)`:** Impede duplicações mesmo com requisições concorrentes.
- **`ON CONFLICT DO NOTHING`:** Se a constraint violar, o INSERT é simplesmente ignorado (idempotente).

### Scope-based operations

Para edição/exclusão de itens recorrentes, adicionado parâmetro `scope`:

| Scope | Update | Delete |
|-------|--------|--------|
| `this` | Altera apenas este mês | Marca como `excluded`/`canceled` (soft delete) |
| `future` | Altera este + todos os meses futuros | Para recorrência + deleta futuros |
| `all` | Altera todos do grupo | Deleta todos do grupo |

**Soft delete para `scope='this'`:** Todas as entidades (Bills, Incomes, Variable Expenses) usam soft delete via campo `status` (`'canceled'` para Bills, `'excluded'` para Incomes/Expenses) em vez de DELETE físico. Isso é necessário porque, se o registro fosse deletado, o lazy generation recriaria o registro no próximo acesso (o mês anterior ainda tem `isRecurring=true`).

**Importante:** O filtro `status != 'excluded'` é aplicado apenas nas queries de **exibição** (`findByUserId`, `countByUserId`, `sumByMonthYear`), **nunca** em `findRecurringByMonth`. Itens excluídos devem continuar propagando para criar meses futuros — a exclusão afeta apenas a visibilidade, não a cadeia de recorrência.

## Consequences

### Positivas

- **Auto-healing:** Se algo falhar, basta o usuário recarregar a página — a geração ocorre novamente.
- **Zero infraestrutura extra:** Não precisa de Redis, BullMQ, monitoramento de jobs para esta funcionalidade.
- **Sem race condition temporal:** Registros são gerados no momento exato em que são necessários.
- **Eficiente:** Processa apenas os registros do usuário que está acessando, não do sistema inteiro.
- **Testável:** Lógica pura no service layer, testável com mocks simples.
- **Idempotente por design:** UNIQUE constraint + ON CONFLICT DO NOTHING garante segurança em concorrência.

### Negativas

- **Latência na primeira query:** A primeira vez que um mês é acessado, há latência adicional para gerar os registros (~10-50ms para 10-50 itens). Acessos subsequentes não têm overhead.
- **Geração limitada a 1 mês:** Se o usuário não acessar o sistema por 3 meses e depois acessar abril, apenas os registros de março (mês anterior) serão gerados em abril. Registros de fevereiro e março não existirão automaticamente.
- **Complexidade no delete:** Bills canceladas continuam gerando no próximo mês (by design), o que pode ser confuso para desenvolvedores que não conhecem a regra.

### Trade-off da geração limitada a 1 mês

A decisão de gerar apenas a partir do mês imediatamente anterior (e não de forma recursiva) é intencional:
- Evita loops potencialmente longos (gerar 12 meses retroativamente)
- Registros de meses muito antigos podem não ser relevantes
- O caso de uso principal é navegação mês-a-mês, não pulos de múltiplos meses
- Se necessário no futuro, pode-se adicionar geração recursiva sem breaking changes

## Alternatives Considered

1. **Job BullMQ agendado (original):** Rejeitado pelos problemas listados no Context.
2. **Geração recursiva (todos os meses intermediários):** Descartado por complexidade e potencial de loops longos.
3. **Trigger PostgreSQL (AFTER INSERT on month access):** Rejeitado por acoplar lógica de negócio ao banco.
4. **Geração no login:** Rejeitado por não cobrir navegação entre meses e por gerar para módulos que o usuário pode não acessar.

## Industry Research: Comparação com Google Calendar

### Como o Google Calendar gerencia recorrências

Segundo a [documentação oficial](https://developers.google.com/workspace/calendar/api/guides/recurringevents), o Google Calendar:

1. **Armazena um único registro "pai"** com campo `recurrence` contendo regra RRULE (RFC 5545)
2. **Gera instâncias dinamicamente** quando o usuário consulta o calendário
3. **Exclusões usam soft delete:** Instâncias excluídas recebem `status: "cancelled"`, não são deletadas fisicamente
4. **Exceções são registros separados:** Modificações em uma única instância criam registro filho com `recurringEventId` apontando para o pai

### Três abordagens da indústria

| Abordagem | Descrição | Usado por | Trade-offs |
|-----------|-----------|-----------|------------|
| **Instâncias Materializadas** | Criar todos os registros futuros antecipadamente | Sistemas legados | Infla banco; problema com "sem data final" |
| **Lazy Generation Pura** | Só armazenar regra, calcular em runtime | Calendários simples | Performance em consultas complexas |
| **Híbrida** | Regra + pré-computar próximos N meses | Google Calendar (~1 ano), Asana (~30 dias) | Complexidade de implementação |

### Por que nossa abordagem é adequada

Para o domínio de **finanças pessoais**, a lazy generation simplificada é preferível ao modelo RRULE completo:

| Aspecto | Google Calendar (RRULE) | Life Assistant (Lazy) |
|---------|-------------------------|----------------------|
| **Valores por instância** | Todos iguais | Cada mês tem `actualAmount` diferente ✅ |
| **Histórico** | Derivado da regra | Preservado exatamente ✅ |
| **Edição individual** | Cria exceção complexa | Edita registro diretamente ✅ |
| **Complexidade** | Parser RRULE necessário | Lógica simples de cópia ✅ |
| **Visibilidade futura** | Infinita via RRULE | Limitada a navegação |

**Justificativa técnica:**

1. **Valores mudam:** Diferente de eventos de calendário, rendas/despesas têm `actualAmount` que varia mensalmente — cada mês precisa de seu próprio registro.
2. **Histórico importa:** Queremos saber exatamente quanto foi gasto em Jan/2025, não recalcular a partir de uma regra.
3. **Escopo limitado:** Usuários de finanças pessoais raramente navegam além de 12 meses.
4. **Simplicidade:** Não requer biblioteca `rrule.js` nem parser de RFC 5545.

### Melhoria futura opcional

Se necessário, podemos evoluir para abordagem **híbrida** sem breaking changes:

```typescript
// Ao criar item recorrente, pré-computar próximos 6 meses
async create(userId: string, data: CreateIncomeDto): Promise<Income> {
  const income = await this.repository.create(userId, data);

  if (data.isRecurring) {
    const futureMonths = getNextMonths(data.monthYear, 6);
    await this.repository.createMany(userId,
      futureMonths.map(month => ({ ...data, monthYear: month, actualAmount: '0' }))
    );
  }

  return income;
}
```

Isso eliminaria a necessidade de navegação para ver meses futuros, mantendo a simplicidade do modelo atual.

## References

- [Google Calendar API - Recurring Events](https://developers.google.com/workspace/calendar/api/guides/recurringevents)
- [Apriorit - Implementing Recurring Events in Calendar Apps](https://www.apriorit.com/dev-blog/web-recurring-events-feature-calendar-app-development)
- [Codegenes - Calendar Recurring Events Storage Methods](https://www.codegenes.net/blog/calendar-recurring-repeating-events-best-storage-method/)
- [RFC 5545 - iCalendar Specification](https://datatracker.ietf.org/doc/html/rfc5545)
- [rrule.js - JavaScript RRULE Library](https://github.com/jkbrzt/rrule)
