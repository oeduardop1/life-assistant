# Relatório: Fontes de Dados do Life Balance Score (M2.5)

> **⚠️ DOCUMENTO DESATUALIZADO**
>
> Este documento foi escrito antes do **ADR-017** que reestruturou as áreas de vida de 8 para 6:
> - **Novas 6 áreas:** health, finance, professional, learning, spiritual, relationships
> - **17 sub-áreas:** physical/mental/leisure (health), budget/savings/debts/investments (finance), career/business (professional), formal/informal (learning), practice/community (spiritual), family/romantic/social (relationships)
>
> As referências a "8 áreas", "financial", "career", "personal_growth", "mental_health", "spirituality", "leisure" como áreas principais estão desatualizadas.
> Ver `docs/adr/ADR-017-life-areas-restructuring.md` para a estrutura atual.
>
> **⚠️ NUMERAÇÃO DE MILESTONES DESATUALIZADA:** Os milestones foram reordenados em 21/01/2026.
> M2.2 → M2.5 (Life Balance Score), M2.6 → M2.2 (Finance), M2.4 → M2.3 (Hábitos), M3.4 → M2.4 (CRM).
> Ver `docs/milestones/` para numeração atual.

**Data:** 2026-01-21
**Contexto:** Análise das dependências e fontes de dados para implementação do M2.2

---

## Resumo Executivo

O M2.2 define cálculos para **8 áreas** da vida, mas apenas **~12.5%** dos componentes têm dados disponíveis atualmente. A maioria das áreas está bloqueada por milestones não implementados ou especificações indefinidas.

---

## Status por Área

| Área | Status | Dados Prontos | Bloqueador |
|------|--------|---------------|------------|
| **Saúde** | 🟡 60% | peso, exercício, sono, água | Falta: meal tracking (M2.1) |
| **Saúde Mental** | 🟡 67% | humor, energia | Falta: stress tracking (M2.1) |
| **Financeiro** | 🔴 0% | nenhum | M2.6 não iniciado |
| **Relacionamentos** | 🔴 0% | nenhum | CRM não está no roadmap |
| **Carreira** | 🔴 0% | nenhum | M2.4 + work-hours não definido |
| **Crescimento Pessoal** | ❓ N/A | - | Fórmula NÃO DEFINIDA no spec |
| **Lazer** | ❓ N/A | - | Fórmula NÃO DEFINIDA no spec |
| **Espiritualidade** | ❓ N/A | - | Fórmula NÃO DEFINIDA no spec |

---

## Detalhamento dos Problemas

### 1. Saúde (Health) — Falta `meal` tracking

**Conforme system.md §3.4:**

| Componente   | Peso | Fonte de Dados                | Status |
|--------------|------|-------------------------------|--------|
| Peso (IMC)   | 20%  | tracking_entries (weight)     | ✅     |
| Exercício    | 30%  | tracking_entries (exercise)   | ✅     |
| Sono         | 25%  | tracking_entries (sleep)      | ✅     |
| Água         | 15%  | tracking_entries (water)      | ✅     |
| Alimentação  | 10%  | tracking_entries (meal)       | ❌     |

**Problema:** M2.1 não implementou `meal` tracking (apenas weight, water, sleep, exercise, mood, energy, custom).

---

### 2. Financeiro (Financial) — Depende de M2.6

**Conforme system.md §3.4:**

| Componente   | Peso | Fonte de Dados      | Status |
|--------------|------|---------------------|--------|
| Budget       | 40%  | variable_expenses   | 🔴 M2.6 |
| Savings      | 30%  | investments         | 🔴 M2.6 |
| Debt         | 20%  | debts               | 🔴 M2.6 |
| Investments  | 10%  | investments         | 🔴 M2.6 |

**Problema:** Todas as 5 tabelas (incomes, bills, variable_expenses, debts, investments) estão em M2.6 que não foi iniciado.

---

### 3. Relacionamentos (Relationships) — CRM não existe no roadmap

**Conforme system.md §3.4:**

| Componente   | Peso | Fonte de Dados        | Status |
|--------------|------|-----------------------|--------|
| Interações   | 50%  | person_interactions   | 🔴     |
| Qualidade    | 50%  | Manual rating (CRM)   | 🔴     |

**Problema:**
- A tabela `people` existe no data-model.md
- **MAS não há milestone para implementar CRM**
- Não existe M3.x ou outro milestone definido para isso

---

### 4. Carreira (Career) — Múltiplos bloqueadores

**Conforme system.md §3.4:**

| Componente   | Peso | Fonte de Dados           | Status |
|--------------|------|--------------------------|--------|
| Satisfação   | 50%  | Manual rating / Goals    | 🔴     |
| Progresso    | 30%  | goals (area='career')    | 🔴 M2.4 |
| Work-life    | 20%  | horas trabalhadas vs ideal | 🔴     |

**Problemas:**
1. M2.4 (Goals & Habits) não foi iniciado
2. **Não existe tracking type para horas trabalhadas**
3. Não há definição de como capturar "satisfação de carreira"

---

### 5. Saúde Mental (Mental Health) — Falta `stress` tracking

**Conforme system.md §3.4:**

| Componente   | Peso | Fonte de Dados           | Status |
|--------------|------|--------------------------|--------|
| Humor        | 40%  | tracking_entries (mood)  | ✅     |
| Energia      | 30%  | tracking_entries (energy)| ✅     |
| Stress       | 30%  | tracking_entries (?)     | ❌     |

**Problema:** Não existe `stress` tracking type no M2.1.

---

### 6. Três áreas SEM FÓRMULA DEFINIDA

As seguintes áreas estão listadas no enum `LifeArea` mas **NÃO têm fórmulas de cálculo definidas no system.md §3.4**:

- **Crescimento Pessoal** (personal_growth)
- **Lazer** (leisure)
- **Espiritualidade** (spirituality)

O M2.2 menciona `(outros conforme spec)`, mas o spec não define essas fórmulas.

---

## Comportamento com Dados Insuficientes

Per ADR-015 (Low-Friction), o sistema não penaliza o usuário:

| Situação | Comportamento |
|----------|---------------|
| Componente sem dados | Score = **50** (neutro) |
| Área inteira sem dados | Score = **50** |
| Relacionamentos sem CRM | Score = **100** (assume saudável) |

**Implicação:** Se M2.2 for implementado agora, a maioria das áreas retornará 50, tornando o Life Balance Score pouco útil.

---

## Matriz de Dependências

```
M2.2 (Life Balance Score)
├── Depende de:
│   ├── M2.1 Tracking ✅ (parcial - falta meal, stress)
│   ├── M2.4 Goals & Habits 🔴 (não iniciado)
│   ├── M2.6 Finance 🔴 (não iniciado)
│   └── CRM Module 🔴 (NÃO EXISTE NO ROADMAP)
│
└── Bloqueia:
    ├── M2.3 Dashboard (exibe scores)
    └── M2.5 Reports (usa scores)
```

---

## Recomendações

### Opção A: Implementar M2.2 Agora (MVP)
- Aceitar que 5/8 áreas retornarão score=50
- Life Balance será apenas Health + Mental Health parciais
- Útil como estrutura, mas valor limitado

### Opção B: Adicionar Enhancements ao M2.1 Primeiro
1. Adicionar `meal` tracking (Health 100%)
2. Adicionar `stress` tracking (Mental Health 100%)
3. Então implementar M2.2

### Opção C: Reordenar Roadmap
1. Implementar M2.6 Finance antes de M2.2
2. Criar milestone para CRM
3. Definir fórmulas para as 3 áreas indefinidas
4. Então implementar M2.2 completo

### Opção D: Redefinir Escopo do M2.2
- Remover áreas sem dados das tasks
- Focar apenas em Saúde + Saúde Mental
- Adicionar outras áreas quando milestones estiverem prontos

---

## Arquivos Relacionados

- `docs/milestones/phase-2-tracker.md` - Definição do M2.2
- `docs/specs/system.md` §3.4 - Fórmulas do Life Balance Score
- `docs/specs/data-model.md` - Schema das tabelas
- `docs/adr/ADR-015-tracking-low-friction-philosophy.md` - Filosofia de baixo atrito
