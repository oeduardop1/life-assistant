# Análise: Remoção do Step "Áreas" do Onboarding

**Data:** 2026-01-22 (Atualizado: 2026-01-26)
**Status:** ✅ Decisão tomada — Implementado conforme proposta
**Motivação:** O step de seleção de áreas no onboarding não produz efeito funcional no sistema. Nenhum módulo consome os `areaWeights` para alterar comportamento. A proposta é simplificar o onboarding: todas as 6 áreas ficam disponíveis por padrão e o usuário usa o que quiser organicamente.

---

## Contexto

### Situação Atual

O onboarding possuía 4 etapas (agora 3):
1. **Perfil** (nome, timezone) — obrigatório
2. ~~**Áreas da Vida** (selecionar 3-6 áreas)~~ — **[REMOVIDO]**
3. **Telegram** (conectar bot) — opcional (agora etapa 2)
4. **Tutorial** (tour interativo) — opcional (agora etapa 3)

### Problema

O step 2 coleta a seleção de áreas e salva internamente como `areaWeights` no JSONB de preferences:
- Áreas selecionadas recebem peso fixo (1.0, 0.8 ou 0.5 dependendo da área)
- Áreas não selecionadas recebem peso 0.0

Porém, **nenhuma parte do sistema consome esses pesos**:
- Navegação/sidebar mostra todas as rotas sempre
- Módulo de finanças não verifica se o usuário selecionou "finance"
- Tracking service aceita qualquer `LifeArea` válida sem validar contra preferences
- Memory/Knowledge items aceita qualquer área
- Dashboard não referencia `areaWeights`
- O Life Balance Score (M2.5) que usaria os pesos **não foi implementado**

### Proposta ✅ IMPLEMENTADA

- ✅ Remover o step de seleção de áreas do onboarding
- ✅ Todas as 6 áreas ficam disponíveis por padrão com peso fixo 1.0
- ✅ Onboarding passa a ter 3 etapas: Perfil, Telegram, Tutorial
- ✅ Pesos são fixos (1.0) para todas as áreas — não configuráveis

---

## Arquivos para Deletar

| # | Arquivo | Motivo |
|---|---------|--------|
| 1 | `apps/web/src/app/(auth)/onboarding/areas/page.tsx` | Página do step removido |
| 2 | `apps/web/src/components/onboarding/area-selector.tsx` | Componente de seleção de áreas |
| 3 | `apps/api/src/modules/onboarding/presentation/dtos/areas-step.dto.ts` | DTO de validação do step |

---

## Arquivos de Código para Modificar

### Frontend

| # | Arquivo | Alterações |
|---|---------|------------|
| 4 | `apps/web/src/lib/validations/onboarding.ts` | Remover `areasStepSchema`, `AreasStepData`. Remover `'areas'` do tipo `OnboardingStep`. Remover `areas?` do interface `OnboardingStatus.data` |
| 5 | `apps/web/src/hooks/use-onboarding.ts` | Remover função `saveAreasStep`. Remover `'areas'` do array `stepOrder`. Remover import de `AreasStepData` |
| 6 | `apps/web/src/components/onboarding/onboarding-stepper.tsx` | Remover entrada `{ id: 'areas', label: 'Áreas da Vida', description: 'Selecione suas prioridades' }` do array `STEPS` |
| 7 | `apps/web/src/components/onboarding/index.ts` | Remover `export { AreaSelector } from './area-selector'` |
| 8 | `apps/web/src/app/(auth)/onboarding/layout.tsx` | Remover `'areas'` do array `validSteps` (linha 28) |

### Backend

| # | Arquivo | Alterações |
|---|---------|------------|
| 9 | `apps/api/src/modules/onboarding/application/services/onboarding.service.ts` | Remover método `saveAreasStep()` inteiro (linhas 142-187). Remover `'areas'` de `STEP_ORDER`. Remover checagem de `onboarding.areasComplete` no `getOnboardingStatus` (linhas 63-64). Remover `'areas'` da validação em `completeOnboarding` (linha 243-244). Alterar `saveProfileStep` para retornar `nextStep: 'telegram'` ao invés de `'areas'` (linha 135). Remover import de `AreasStepDto`. Remover lógica de reconstrução de `areas` a partir de `areaWeights` no `getOnboardingStatus` (linhas 75-77) |
| 10 | `apps/api/src/modules/onboarding/presentation/controllers/onboarding.controller.ts` | Remover case `'areas'` do switch (linhas 68-69). Remover import `AreasStepDto`. Remover `'areas'` do `@ApiParam enum` (linha 49). Atualizar tipo do `@Body()` para remover `AreasStepDto` da union |
| 11 | `apps/api/src/modules/onboarding/presentation/dtos/index.ts` | Remover `export { AreasStepDto } from './areas-step.dto'` |
| 12 | `apps/api/src/modules/onboarding/presentation/dtos/onboarding-status.dto.ts` | Remover `'areas'` do tipo `OnboardingStep` |

### Schema

| # | Arquivo | Alterações |
|---|---------|------------|
| 13 | `packages/database/src/schema/preferences.ts` | Remover `areasComplete: z.boolean().default(false)` do objeto `onboarding` (linha 61). **Decisão pendente:** atualizar defaults de `areaWeights` para todos 1.0 ou manter valores atuais |

**Nota:** Não é necessária migration SQL. O campo `areasComplete` faz parte do JSONB `preferences`, não é coluna separada. O `safeParse` do Zod ignora campos extras, então usuários existentes com `areasComplete: true` não serão afetados.

---

## Testes para Modificar

| # | Arquivo | Alterações |
|---|---------|------------|
| 14 | `apps/api/test/unit/services/onboarding/onboarding.service.spec.ts` | Remover todo o `describe('saveAreasStep')` (~linhas 286-339). Atualizar testes de `getOnboardingStatus` que checam `'areas'` como step (linhas 142-163). Atualizar teste `completeOnboarding` que valida `'areas'` como required (linha 483). Atualizar mock de preferences que inclui `areasComplete` (linhas 46, 175, 348, 429, 491). Atualizar teste que espera `nextStep: 'areas'` após profile (linha 257) |
| 15 | `apps/api/test/integration/onboarding/onboarding-endpoints.integration.spec.ts` | Remover todo `describe('PATCH /api/onboarding/step/areas')` (~linhas 337-406). Remover mock class `AreasStepDto` (linha 51). Remover `saveAreasStep` do mock service (linha 74). Atualizar testes de profile que esperam `nextStep: 'areas'` para `'telegram'` (linhas 290, 301) |
| 16 | `apps/web/e2e/specs/onboarding.spec.ts` | Remover `test('step2_should_select_areas_and_navigate_to_telegram')` (linha 133). Atualizar `test('step1_...')` para esperar navegação direta para telegram (linha 117). Atualizar teste de fluxo completo que inclui Step 2: Areas (linha 207). Atualizar comentário "4-step wizard" (linha 8) |
| 17 | `apps/web/e2e/pages/onboarding.page.ts` | Remover seção "Areas step elements" (linha 19). Remover método `selectAreas` (linhas 36+, 85+). Remover `'areas'` do método `gotoStep` (linha 54) |
| 18 | `apps/web/e2e/setup/global-setup.ts` | Remover `areasComplete` dos mocks de preferences (linhas 262, 350). Remover `areaWeights` customizado se houver (linha 235) |
| 19 | `packages/database/src/schema/preferences.test.ts` | Atualizar testes que validam defaults de `areaWeights` se os valores mudarem (linhas 98-103). Remover referências a `areasComplete` nos testes de onboarding state |

---

## Documentação para Atualizar

### Specs

| # | Arquivo | Seção/Linha | Alteração |
|---|---------|-------------|-----------|
| 20 | `docs/specs/system.md` | §3.1, linha 213 | Remover linha `2. Áreas de foco | Selecionar 3-6 áreas (ADR-017)` da tabela de etapas. Renumerar etapas (Telegram vira 2, Tutorial vira 3) |
| 21 | `docs/specs/system.md` | §2.2, linhas 106-115 | Atualizar descrição: pesos são defaults do sistema, configuráveis nas Settings (não no onboarding). Decidir se uniformiza para 1.0 |
| 22 | `docs/specs/product.md` | linha 804 | Remover `b. Quais áreas quer focar inicialmente` do wizard de onboarding |
| 23 | `docs/specs/product.md` | linha 1128 | Remover/atualizar `Áreas da vida | 3 | Todas | Todas` da tabela de planos — todas as áreas disponíveis para todos |
| 24 | `docs/specs/engineering.md` | linhas 725, 743 | Atualizar exemplos de API que mostram `currentStep: "areas"`. Atualizar para refletir novo fluxo de 3 etapas |
| 25 | `docs/specs/data-model.md` | linha 760 | Remover `areasComplete: z.boolean().default(false)` do exemplo de preferences schema |

### ADRs

| # | Arquivo | Alteração |
|---|---------|-----------|
| 26 | `docs/adr/ADR-017-life-areas-restructuring.md` | Atualizar linha 141: remover "Quantidade de áreas no onboarding: Reduz de 3-8 para 3-6 seleções". Adicionar nota de que as 6 áreas são sempre ativas por padrão |

### Milestones

| # | Arquivo | Alteração |
|---|---------|-----------|
| 27 | `docs/milestones/phase-0-foundation.md` | Linhas 583, 603, 628: adicionar nota `[REMOVIDO]` indicando que step foi eliminado. Manter histórico de que foi implementado e depois removido |
| 28 | `docs/milestones/phase-1-counselor.md` | Linha 482: "Adicionar opção de perspectiva cristã na etapa 2 do onboarding (junto com seleção de áreas)" — realocar para o step de Perfil (etapa 1) ou para Settings |

---

## Decisões ✅ TOMADAS

### 1. Defaults de `areaWeights` — ✅ Opção B Escolhida

Com a remoção do step de seleção, os defaults do schema são usados diretamente para todos os usuários:

| Área | Valor Antigo | **Valor Atual** |
|------|-------------|-----------------|
| health | 1.0 | **1.0** |
| finance | 1.0 | **1.0** |
| professional | 1.0 | **1.0** |
| learning | 0.8 | **1.0** |
| spiritual | 0.5 | **1.0** |
| relationships | 1.0 | **1.0** |

**Decisão:** ✅ **Opção B — Uniformizar para 1.0** — todas as áreas com importância igual, sem viés implícito.

### 2. Toggle de Perspectiva Cristã (M1.6) — ✅ Opção B Escolhida

A milestone `phase-1-counselor.md` planejava adicionar o toggle de perspectiva cristã "na etapa 2 do onboarding (junto com seleção de áreas)". Com a remoção do step:

**Decisão:** ✅ **Opção B — Mover para Settings** (`/settings/preferences`) — configurado pós-onboarding.

### 3. Plano Free com 3 áreas — ✅ Opção A Escolhida

A tabela de planos indicava que o plano Free teria limite de 3 áreas.

**Decisão:** ✅ **Opção A — Remover restrição** — todos os planos têm todas as 6 áreas disponíveis. O conceito de "selecionar áreas" foi removido do produto.

---

## Resumo Quantitativo

| Tipo | Quantidade |
|------|-----------|
| Arquivos a deletar | 3 |
| Arquivos de código a modificar | 10 |
| Arquivos de teste a modificar | 6 |
| Documentação a atualizar | 9 |
| **Total de alterações** | **28** |

---

## Fluxo do Onboarding Após Remoção

```
Etapa 1: Perfil (nome, timezone) — obrigatório
    ↓
Etapa 2: Telegram (conectar bot) — opcional, skip permitido
    ↓
Etapa 3: Tutorial (tour interativo) — opcional, skip permitido
    ↓
Dashboard (todas as 6 áreas disponíveis)
```

---

## Impacto em Usuários Existentes

- Usuários que já completaram o onboarding: **nenhum impacto**. Os `areaWeights` salvos continuam no JSONB, mas como nenhum módulo os consome, não há diferença funcional.
- Usuários em meio ao onboarding (step 2): serão redirecionados para o próximo step disponível (telegram ou tutorial) na próxima carga do status.
- O `safeParse` do Zod retorna defaults para campos removidos, então a ausência de `areasComplete` no schema não causa erros.
