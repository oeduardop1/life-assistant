# ADR-017: Reestruturação das Áreas de Vida (8 → 6 + Sub-áreas)

## Status

Accepted

## Date

2026-01-21

## Context

O sistema original definia **8 áreas de vida flat**:
- health, financial, career, relationships, spirituality, personal_growth, mental_health, leisure

Esta estrutura apresentava problemas:

1. **Redundância conceitual**: `mental_health` e `leisure` são semanticamente parte de `health` (bem-estar geral)
2. **Granularidade inconsistente**: `financial` é amplo (budget, savings, debts, investments) enquanto `leisure` é específico
3. **Cálculos imprecisos**: Não era possível identificar qual aspecto de uma área estava em déficit
4. **Nomenclatura confusa**: `career` vs `professional` (inclui empreendedorismo)

Durante análise para implementação do Life Balance Score (M2.5), identificou-se a necessidade de maior granularidade para:
- Calcular scores mais precisos por sub-área
- Permitir análise detalhada ("sua saúde física está ótima, mas saúde mental precisa atenção")
- Organizar conhecimento e tracking de forma mais intuitiva

## Decision

Reestruturar para **6 áreas principais + sub-áreas hierárquicas**:

### Nova Estrutura

| Área Principal | Sub-áreas | Descrição |
|----------------|-----------|-----------|
| **health** | physical, mental, leisure | Saúde física, mental e bem-estar |
| **finance** | budget, savings, debts, investments | Finanças pessoais |
| **professional** | career, business | Carreira e empreendedorismo |
| **learning** | formal, informal | Aprendizado e crescimento |
| **spiritual** | practice, community | Espiritualidade |
| **relationships** | family, romantic, social | Relacionamentos |

### Mapeamento da Migração

| Área Antiga | → Nova Área + Sub-área |
|-------------|------------------------|
| health | health.physical |
| mental_health | health.mental |
| leisure | health.leisure |
| financial | finance.* |
| career | professional.career |
| personal_growth | learning.* |
| spirituality | spiritual.* |
| relationships | relationships.* |

### Detalhamento das Sub-áreas

```typescript
// health: saúde física, mental e bem-estar
physical    // peso, exercício, sono, água, alimentação
mental      // humor, energia, stress
leisure     // hobbies, relaxamento, lazer

// finance: finanças pessoais
budget      // orçamento mensal, gastos vs planejado
savings     // poupança, reserva de emergência
debts       // dívidas, quitação
investments // investimentos, patrimônio

// professional: vida profissional
career      // carreira/emprego principal
business    // empreendedorismo + projetos pessoais

// learning: aprendizado e crescimento
formal      // cursos, certificações, educação formal
informal    // livros, vídeos, autodidatismo

// spiritual: espiritualidade
practice    // devocionais, meditação, oração
community   // igreja, grupos espirituais

// relationships: relacionamentos
family      // família
romantic    // relacionamento romântico
social      // amigos + networking
```

### Cálculo do Life Balance Score (Atualizado)

Cada área principal é calculada como média ponderada de suas sub-áreas:

```typescript
// Health Score
const healthScore = weightedAverage([
  { value: physicalScore, weight: 0.50 },  // peso, exercício, sono, água
  { value: mentalScore, weight: 0.35 },    // humor, energia, stress
  { value: leisureScore, weight: 0.15 },   // hobbies, relaxamento
]);

// Finance Score
const financeScore = weightedAverage([
  { value: budgetScore, weight: 0.30 },
  { value: savingsScore, weight: 0.25 },
  { value: debtsScore, weight: 0.25 },
  { value: investmentsScore, weight: 0.20 },
]);

// Life Balance Score = média ponderada das 6 áreas
const lifeBalanceScore = weightedAverage(
  ALL_LIFE_AREAS.map(area => ({
    value: areaScores[area],
    weight: userPreferences.areaWeights[area],
  }))
);
```

### Comportamento com Dados Ausentes (ADR-015)

Mantém filosofia de baixo atrito:
- Sub-área sem dados: score = 50 (neutro)
- Área inteira sem dados: score = 50
- Nunca penaliza usuário por dados esparsos

## Consequences

### Positivos

- **Análise granular**: IA pode identificar qual aspecto específico precisa atenção
- **Organização intuitiva**: Estrutura hierárquica mais fácil de entender
- **Cálculos precisos**: Pesos por sub-área permitem scores mais significativos
- **Escalabilidade**: Novas sub-áreas podem ser adicionadas sem mudar estrutura principal
- **Consistência**: `finance` agora reflete a complexidade real de finanças pessoais

### Negativos

- **Migração necessária**: Código e dados precisam ser atualizados
- **Complexidade adicional**: Duas dimensões (área + sub-área) vs uma (área)

### Neutros

- **Quantidade de áreas no onboarding**: Reduz de 3-8 para 3-6 seleções

## Implementation Notes

### Ambiente de Desenvolvimento

Como estamos em desenvolvimento sem dados de produção:
1. Atualizar schemas Drizzle
2. `pnpm infra:down -rf` para reset completo
3. `pnpm infra:up` recria banco com `db:push` + `db:seed`

### Arquivos Principais Afetados

| Categoria | Arquivos |
|-----------|----------|
| Enums | `packages/shared/src/enums.ts`, `packages/database/src/schema/enums.ts` |
| Constants | `packages/shared/src/constants.ts` |
| Schema | `packages/database/src/schema/*.ts` (tracking, knowledge-items, goals) |
| Backend | Módulos onboarding, memory, tracking |
| Frontend | area-selector, filter-bar, types |
| AI Tools | add-knowledge, search-knowledge, analyze-context |
| Docs | data-model.md, system.md, product.md, ai.md |

### Novo Enum SubArea

```typescript
export enum SubArea {
  // health
  PHYSICAL = 'physical',
  MENTAL = 'mental',
  LEISURE = 'leisure',
  // finance
  BUDGET = 'budget',
  SAVINGS = 'savings',
  DEBTS = 'debts',
  INVESTMENTS = 'investments',
  // professional
  CAREER = 'career',
  BUSINESS = 'business',
  // learning
  FORMAL = 'formal',
  INFORMAL = 'informal',
  // spiritual
  PRACTICE = 'practice',
  COMMUNITY = 'community',
  // relationships
  FAMILY = 'family',
  ROMANTIC = 'romantic',
  SOCIAL = 'social',
}
```

## Alternatives Considered

### 1. Manter 8 áreas flat
- **Descartado**: Não permite análise granular necessária para Life Balance Score

### 2. Adicionar mais áreas (10+)
- **Descartado**: Aumenta complexidade para usuário no onboarding

### 3. Usar tags ao invés de sub-áreas
- **Descartado**: Menos estruturado, dificulta cálculos automáticos

### 4. Hierarquia de 3 níveis (área → sub-área → aspecto)
- **Descartado**: Complexidade excessiva para MVP

## References

- ADR-015: Tracking de Baixo Atrito (filosofia de dados ausentes)
- ADR-012: Tool Use + Memory Consolidation (arquitetura de memória)
- M2.5: Life Balance Score implementation
- docs/specs/system.md §3.4: Cálculo do Life Balance Score
