# ADR-015: Tracking de Baixo Atrito (Low Friction Philosophy)

## Status

Accepted

## Date

2026-01-19

## Context

O Life Assistant foi originalmente projetado com **micro-tracking diário** de métricas (peso, água, humor, gastos, etc.) através de formulários e comandos. Essa abordagem apresenta problemas:

1. **Alto atrito**: Usuário precisa lembrar de registrar métricas diariamente
2. **Abandono**: Micro-tracking leva a fadiga e abandono do sistema
3. **Conflito com proposta**: A proposta de valor é "você só conversa, a IA organiza"
4. **Inconsistência**: M2.6 Finance já adota modelo de planejamento mensal (baixo atrito)

Durante análise da documentação, identificamos inconsistências:

| Documento | Problema |
|-----------|----------|
| **product.md** | §6.6 assume nutrição com micro-tracking; §6.10 assume devocional diário obrigatório |
| **system.md** | §2.3 define metas diárias de água/sono; §3.4 fórmulas assumem dados diários |
| **ai.md** | Tool `record_metric` não menciona captura conversacional |
| **phase-2-tracker.md** | M2.1 define 10 tipos de tracking como obrigatórios |

Em contraste, o **M2.6 Finance** foi projetado com filosofia explícita de baixo atrito:
> "Planejamento financeiro mensal. Usuário cadastra orçamento no início do mês e marca contas como pagas ao longo do mês. NÃO é micro-tracking de gastos diários."

## Decision

Adotar **Modelo Híbrido Orientado a Conversa** para todo o sistema de tracking, unificando a filosofia com M2.6 Finance.

### Princípios Fundamentais

| Princípio | Descrição |
|-----------|-----------|
| **Baixo Atrito** | Tracking NÃO é obrigatório; sistema funciona bem sem ele |
| **Captura Conversacional** | IA detecta métricas mencionadas naturalmente na conversa |
| **Confirmação Sempre** | Antes de registrar, IA SEMPRE pede confirmação explícita |
| **Dashboard Opcional** | Formulários manuais para quem quer controle direto |
| **Sem Metas Impostas** | Nenhuma meta diária é imposta; usuário define se quiser |

### Fluxo de Captura Conversacional

```
Usuario: "Voltei do médico, ele disse que estou com 82kg"
         ↓
IA detecta métrica (peso=82kg)
         ↓
IA: "Que bom que foi ao médico! Quer que eu registre seu peso de 82kg?"
         ↓
Usuario: "Sim" / "Na verdade é 82.5" / "Não precisa"
         ↓
Se confirmado: registra em tracking_entries
```

### Comportamento da IA

1. **Detectar, não cobrar**: IA detecta métricas quando mencionadas, mas nunca pergunta "você registrou seu peso hoje?"
2. **Oferecer, não insistir**: IA oferece registrar com tom de sugestão, não de obrigação
3. **Confirmar, não assumir**: NUNCA registra métricas sem confirmação explícita

### Impacto no Life Balance Score

O cálculo de score se adapta à disponibilidade de dados:

| Situação | Comportamento |
|----------|---------------|
| Área com dados | Calcula normalmente |
| Área sem dados | Retorna **50** (neutro), sem penalização |
| Dados esparsos | Calcula com dados disponíveis + aviso |

O sistema NÃO "cobra" tracking não realizado.

### Dashboard Manual

O dashboard `/tracking` continua existindo, mas como **opção secundária**:

- Formulários rápidos para quem prefere registrar manualmente
- Histórico e gráficos de métricas registradas
- Empty state amigável quando não há dados
- Nenhum widget de "meta diária" ou "streak" imposto

## Consequences

### Positivos

- **Alinhamento**: Toda a documentação segue mesma filosofia de baixo atrito
- **Consistência**: M2.1 Tracking agora funciona como M2.6 Finance
- **Menor abandono**: Sem fadiga de micro-tracking diário
- **Proposta de valor**: Reforça "você só conversa, a IA organiza"
- **Flexibilidade**: Usuários power podem usar dashboard; casuais só conversam

### Negativos

- **Scores menos precisos**: Para usuários que não fazem tracking, scores são aproximados
- **Redesign necessário**: M2.1 precisa ser reformulado

### Neutros

- **tracking_entries continua existindo**: Propósito muda de micro-tracking para registro confirmado
- **Tipos de tracking mantidos**: Apenas source e fluxo mudam

## Alternatives Considered

### 1. Manter micro-tracking obrigatório
- **Descartado**: Conflita com proposta "zero atrito" do produto

### 2. Remover tracking_entries completamente
- **Descartado**: Usuários power perdem funcionalidade que querem

### 3. Tracking apenas via dashboard
- **Descartado**: Perde captura conversacional, aumenta atrito

### 4. Tracking automático sem confirmação
- **Descartado**: Viola princípio de transparência e controle do usuário

## Implementation Notes

### Documentos Atualizados

| Documento | Seções Modificadas |
|-----------|-------------------|
| **product.md** | §2.3, §3, §6.6, §6.10, §7.2, §7.6 |
| **system.md** | §2.3, §3.3, §3.4 |
| **ai.md** | Tool record_metric, §6.5, §4.1 |
| **data-model.md** | §4.3 (nota adicionada) |
| **phase-2-tracker.md** | M2.1 reformulado completamente |

### Tool record_metric

```typescript
{
  name: 'record_metric',
  description: `Registra métrica do usuário detectada em conversa natural.
    O sistema automaticamente pede confirmação antes de executar.`,
  requiresConfirmation: true,  // Confirmação via SISTEMA
}
```

> **Nota (2026-01-20):** `record_metric` usa `requiresConfirmation: true` com detecção
> automática de intent pelo sistema. Quando o usuário responde à confirmação:
> - "sim/pode/ok" → Sistema executa tool diretamente
> - "não/cancela" → Sistema cancela
> - Correção (ex: "75.5 kg") → Novo tool loop com valor corrigido
> - Mensagem não relacionada → Cancela e processa nova mensagem
>
> A confirmação é garantida pelo SISTEMA, não pela IA (que poderia ignorar).
> Padrões de detecção em `ChatService.detectUserIntent()`.
> Tools como `create_reminder` e `update_person` também usam `requiresConfirmation: true`.

### Milestone M2.1 Reformulado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Título** | "Tracking de Métricas" | "Tracking de Métricas (Baixo Atrito)" |
| **Tipos** | 10 tipos (incluindo expense) | 7 tipos (expense via M2.6) |
| **Fluxo** | Tracking via chat | Captura conversacional com confirmação |
| **Frontend** | QuickTrackForm destaque | Dashboard opcional |
| **get_trends** | Incluído em M2.1 | Movido para M2.2 (junto com Life Balance Score) |
| **DoD** | Assume tracking ativo | "Sistema funciona sem tracking" |

## References

- TBD-205: Decisão sobre modelo de tracking
- ADR-012: Tool Use + Memory Consolidation (base técnica)
- M2.6 Finance: Modelo de referência para baixo atrito
- product.md §1.3: Proposta de valor "você só conversa"
