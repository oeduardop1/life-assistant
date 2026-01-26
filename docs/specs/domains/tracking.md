# Tracking & Life Balance (ADR-015, ADR-017)

> Metric tracking, Life Balance Score calculation, and trend analysis.

---

## 1. Philosophy (Low-Friction)

> **ADR-015:** Tracking é opcional. O sistema funciona sem metas definidas.

### Core Principles

| Princípio | Implementação |
|-----------|---------------|
| **Baixo atrito** | Captura conversacional com confirmação |
| **Sem cobrança** | Sistema nunca pergunta "você registrou X hoje?" |
| **Opção, não obrigação** | Metas são opcionais, não impostas |
| **Funciona sem dados** | Dashboard funciona com empty states |

### Two Registration Modes

1. **Captura conversacional:** IA detecta métricas em conversa natural e pede confirmação
2. **Dashboard manual:** Formulários para registro ativo (opcional)

### Confirmation Rule

Antes de salvar, IA SEMPRE pergunta: "Quer que eu registre...?"
- Tom de oferta, não de cobrança
- Usuário pode corrigir valores antes de confirmar
- Usuário pode recusar ("não precisa")

---

## 2. Tracking Entry Types

```typescript
enum TrackingType {
  // Saúde
  WEIGHT = 'weight',
  WATER = 'water',
  SLEEP = 'sleep',
  EXERCISE = 'exercise',

  // Financeiro (basic tracking, M2.2 has full finance)
  EXPENSE = 'expense',
  INCOME = 'income',
  INVESTMENT = 'investment',

  // Hábitos
  HABIT = 'habit',

  // Bem-estar
  MOOD = 'mood',
  ENERGY = 'energy',

  // Custom
  CUSTOM = 'custom',
}
```

---

## 3. Validation Rules

| Tipo | Campo | Validação |
|------|-------|-----------|
| **weight** | value | `0 < value ≤ 500` (kg) |
| **weight** | date | `≤ now` (não pode ser futuro) |
| **water** | value | `0 < value ≤ 10000` (ml) |
| **expense** | value | `value > 0` |
| **expense** | category | Enum válido |
| **exercise** | duration | `0 < duration ≤ 1440` (min) |
| **exercise** | intensity | `low | medium | high` |
| **sleep** | duration | `0 < duration ≤ 24` (hours) |
| **sleep** | quality | `1-10` |
| **mood** | value | `1-10` |
| **energy** | value | `1-10` |

### 3.1 API Endpoints

| Operacao | Endpoint | Tool | Confirmacao |
|----------|----------|------|-------------|
| Criar | `POST /tracking` | `record_metric` | Sistema |
| Atualizar | `PATCH /tracking/:id` | `update_metric` | Sistema |
| Deletar | `DELETE /tracking/:id` | `delete_metric` | Sistema |
| Listar/Historico | `GET /tracking` | `get_tracking_history` | Nao |

---

## 4. Life Balance Score (ADR-017)

### 4.1 Overview

Pontuação 0-100 que mede o equilíbrio geral da vida baseado em 6 áreas principais.

> **Nota de Display:** O score interno é 0-100 para precisão de cálculo. Na UI, exibir como 0-10 para melhor UX (dividir por 10). Exemplo: score interno 75 → exibir como 7.5.

### 4.2 Formula

```typescript
// lifeBalanceScore = weighted average of areaScore values
lifeBalanceScore = Σ (areaScore × areaWeight) / Σ areaWeight

// Each areaScore = weighted average of subAreaScore values
areaScore = Σ (subAreaScore × subAreaWeight) / Σ subAreaWeight
```

### 4.3 Main Areas & Weights

| Área | Código | Peso Default | Sub-áreas |
|------|--------|--------------|-----------|
| Saúde | `health` | 1.0 | physical (50%), mental (35%), leisure (15%) |
| Finanças | `finance` | 1.0 | budget (30%), savings (25%), debts (25%), investments (20%) |
| Profissional | `professional` | 1.0 | career (60%), business (40%) |
| Aprendizado | `learning` | 0.8 | formal (50%), informal (50%) |
| Espiritual | `spiritual` | 0.5 | practice (70%), community (30%) |
| Relacionamentos | `relationships` | 1.0 | family (40%), romantic (35%), social (25%) |

- Cada área principal tem peso configurável (0.0 a 2.0)
- Peso 0.0 = área ignorada no cálculo
- Pesos de sub-áreas são fixos (não configuráveis pelo usuário)

### 4.4 Area Calculations

#### Health (Saúde)

**Physical Score (50%):**
- IMC: Baseado no cálculo IMC
- Exercício: `(min_semana / meta_min) × 100`, max 100
- Sono: `(horas_media / meta_horas) × 100`, default 50
- Água: `(ml_registrado / meta_ml) × 100`, default 50

**IMC Calculation:**
```
IMC = peso(kg) / altura(m)²
- IMC 18.5-24.9 (ideal): score = 100
- IMC < 18.5 (abaixo): score = 100 - ((18.5 - IMC) × 10), mín 0
- IMC 25-29.9 (sobrepeso): score = 100 - ((IMC - 24.9) × 8), mín 50
- IMC ≥ 30 (obesidade): score = 50 - ((IMC - 30) × 5), mín 0
- Se altura não cadastrada: score = 50 (neutro)
```

**Mental Score (35%):**
- Humor: Média dos últimos 7 dias
- Energia: Média dos últimos 7 dias
- Stress: Inverso do nível reportado

**Leisure Score (15%):**
- Baseado em registros de atividades de lazer/hobbies

#### Finance (Finanças)

| Sub-área | Peso | Cálculo |
|----------|------|---------|
| budget | 30% | `100 - (gastos_mes / budget_mes × 100)`, min 0 |
| savings | 25% | `(poupança_mes / meta_poupança) × 100` |
| debts | 25% | `100 - (dívida / renda_mes × 100)`, min 0 |
| investments | 20% | Presença e crescimento de investimentos |

#### Professional (Profissional)

| Sub-área | Peso | Cálculo |
|----------|------|---------|
| career | 60% | Satisfação + progresso em metas de carreira |
| business | 40% | Progresso em empreendedorismo/projetos pessoais |

#### Learning (Aprendizado)

| Sub-área | Peso | Cálculo |
|----------|------|---------|
| formal | 50% | Progresso em cursos, certificações |
| informal | 50% | Livros lidos, vídeos, autodidatismo |

#### Spiritual (Espiritual)

| Sub-área | Peso | Cálculo |
|----------|------|---------|
| practice | 70% | Frequência de devocionais, meditação, oração |
| community | 30% | Participação em igreja/grupos espirituais |

#### Relationships (Relacionamentos)

| Sub-área | Peso | Cálculo |
|----------|------|---------|
| family | 40% | Frequência de contato + qualidade |
| romantic | 35% | Qualidade do relacionamento romântico |
| social | 25% | Amigos + networking |

**Se usuário não tem pessoas cadastradas:** score = 50 (neutro)

### 4.5 Update Frequency

| Score | Frequência | Trigger |
|-------|------------|---------|
| Area Score | Tempo real | Novo tracking entry |
| Life Balance Score | Diário | Job às 00:00 UTC |
| Histórico | Diário | Snapshot às 00:00 UTC |

### 4.6 Insufficient Data Handling

> **ADR-015:** O sistema NÃO penaliza tracking não realizado.

| Situação | Comportamento |
|----------|---------------|
| Componente sem dados | Retorna **50** (neutro), sem penalização |
| Área inteira sem dados | Retorna **50** para a área |
| Menos de 7 dias de dados | Calcula com dados disponíveis |
| Usuário novo (< 3 dias) | Não calcula, mostra onboarding |
| Métrica opcional não registrada | **50**, sem mensagem de cobrança |

**Mensagens informativas (não de cobrança):**
- "Score baseado nas métricas que você compartilhou"
- "Área [X] calculada com os dados disponíveis"

### 4.7 Interpretation (UI 0-10)

| Faixa | Significado | Cor |
|-------|-------------|-----|
| 9.0 - 10.0 | Excelente | 🟢 Verde |
| 7.5 - 8.9 | Bom | 🟢 Verde claro |
| 6.0 - 7.4 | Adequado | 🟡 Amarelo |
| 4.0 - 5.9 | Atenção | 🟠 Laranja |
| 0.0 - 3.9 | Crítico | 🔴 Vermelho |

---

## 5. Trend Analysis

### 5.1 get_trends Tool

Analisa tendências e correlações entre métricas.

```typescript
{
  name: 'get_trends',
  parameters: {
    types: TrackingType[],     // 1-5 tipos de métricas
    days: number,              // 7-365 dias
    period?: 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all',
    includeCorrelations?: boolean,
  },
}
```

### 5.2 Data Density

```
density = dataPoints / days
```

| Densidade | Fórmula | Comportamento |
|-----------|---------|---------------|
| **Alta** | >= 70% | Análise confiável, sem warnings |
| **Média** | 30-70% | Análise possível, confidence='medium' |
| **Baixa** | < 30% | Warning 'sparse_data', suggestion gerada |

**Exemplos:**
- 7 registros em 10 dias = 70% → density='high'
- 9 registros em 30 dias = 30% → density='low'
- 2 registros em 90 dias = 2.2% → density='low' + warning

**Sugestões são informativas, não cobranças:**
- ✅ "Para análise mais precisa de 90 dias, tente registrar peso semanalmente"
- ❌ "Dados insuficientes! Registre mais para ver resultados"

### 5.3 Calculated Aggregations

| Métrica | Cálculo | Período |
|---------|---------|---------|
| Peso médio | `AVG(weight)` | 7 dias |
| Variação peso | `(atual - anterior) / anterior × 100` | Semanal |
| Água diária | `SUM(water)` | Dia |
| Gasto total | `SUM(expense)` | Mês |
| Gasto por categoria | `SUM(expense) GROUP BY category` | Mês |
| Exercício semanal | `SUM(duration)` | Semana |
| Sono médio | `AVG(duration)` | 7 dias |
| Humor médio | `AVG(mood)` | 7 dias |

---

## 6. AI Tools

### 6.1 record_metric

Registra uma métrica de tracking.

```typescript
{
  name: 'record_metric',
  parameters: {
    type: TrackingType,
    value: number,
    unit?: string,
    category?: string,    // Para expense
    date?: string,        // ISO date, default hoje
    metadata?: object,
  },
  requiresConfirmation: true,  // Sistema pede confirmação
}
```

### 6.2 update_metric

Corrige um registro de métrica existente.

```typescript
{
  name: 'update_metric',
  parameters: {
    entryId: string,
    value?: number,
    unit?: string,
    reason?: string,
  },
  requiresConfirmation: true,
}
```

⚠️ **REGRA CRÍTICA SOBRE entryId:**
- O entryId DEVE ser o UUID EXATO retornado por get_tracking_history
- NUNCA invente, gere ou fabrique IDs (como "sleep-12345" ou "entry-xxx")
- IDs reais são UUIDs no formato: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
- Copie o ID EXATAMENTE como aparece na resposta de get_tracking_history

**QUANDO USAR:**
- Usuário quer CORRIGIR um valor JÁ REGISTRADO
- Usuário diz "errei", "não era X, era Y", "corrigi", "o certo é"

**FLUXO OBRIGATÓRIO:**
1. PRIMEIRO: Chamar get_tracking_history para obter os registros
2. SEGUNDO: Extrair o campo "id" do entry correto da resposta
3. TERCEIRO: Chamar update_metric usando esse ID EXATO como entryId
4. Sistema pedirá confirmação ao usuário

**NUNCA use record_metric para corrigir** — isso cria duplicatas!

### 6.3 delete_metric

Remove um registro de métrica.

```typescript
{
  name: 'delete_metric',
  parameters: {
    entryId: string,
    reason?: string,
  },
  requiresConfirmation: true,
}
```

⚠️ **REGRA CRÍTICA SOBRE entryId:**
- O entryId DEVE ser o UUID EXATO retornado por get_tracking_history
- NUNCA invente, gere ou fabrique IDs (como "sleep-12345" ou "entry-xxx")
- IDs reais são UUIDs no formato: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
- Copie o ID EXATAMENTE como aparece na resposta de get_tracking_history

**ATENÇÃO:** Ação destrutiva. Use APENAS quando usuário EXPLICITAMENTE pedir para deletar.

**FLUXO OBRIGATÓRIO:**
1. PRIMEIRO: Chamar get_tracking_history para obter os registros
2. SEGUNDO: Mostrar ao usuário qual registro será deletado (data e valor)
3. TERCEIRO: Extrair o campo "id" EXATO do entry da resposta
4. QUARTO: Chamar delete_metric usando esse ID como entryId
5. Sistema pedirá confirmação final

**NUNCA delete sem confirmação explícita do usuário!**

### 6.4 get_tracking_history

Obtém histórico de métricas.

```typescript
{
  name: 'get_tracking_history',
  parameters: {
    type: TrackingType,
    days: number,    // Max 90, default 30
  },
  requiresConfirmation: false,
}
```

### 6.5 get_trends

Ver seção 5.1 acima.

---

## 7. Data Model

### 7.1 Tracking Entries Table

```sql
CREATE TABLE tracking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type tracking_type NOT NULL,
  area life_area,
  sub_area sub_area,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20),
  metadata JSONB,
  entry_date DATE NOT NULL,
  entry_time TIMESTAMP,
  source VARCHAR(50) DEFAULT 'user',  -- 'user', 'ai', 'import'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2 Life Balance History Table

```sql
CREATE TABLE life_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  score_date DATE NOT NULL,
  total_score DECIMAL(5,2),
  health_score DECIMAL(5,2),
  finance_score DECIMAL(5,2),
  professional_score DECIMAL(5,2),
  learning_score DECIMAL(5,2),
  spiritual_score DECIMAL(5,2),
  relationships_score DECIMAL(5,2),
  calculation_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, score_date)
);
```

### 7.3 RLS Policies

```sql
ALTER TABLE tracking_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_balance_history ENABLE ROW LEVEL SECURITY;

-- Uses Supabase built-in auth.uid() function
CREATE POLICY "user_access" ON tracking_entries
  FOR ALL USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_access" ON life_balance_history
  FOR ALL USING (user_id = (SELECT auth.uid()));
```

> **Referência:** Ver `docs/specs/core/auth-security.md` §3.2 para detalhes sobre `auth.uid()`.

---

## 8. Definition of Done

### Tracking
- [ ] Registrar cada tipo de métrica funciona
- [ ] Validações aplicadas corretamente
- [ ] Confirmação antes de salvar (via chat)
- [ ] Histórico de métricas visível
- [ ] Gráficos de evolução (quando há dados)
- [ ] Comparativo com período anterior

### Life Balance Score
- [ ] Cálculo correto por área e sub-área
- [ ] Pesos de área configuráveis pelo usuário
- [ ] Histórico armazenado diariamente
- [ ] Gráfico de evolução do score
- [ ] Funciona com dados insuficientes (score 50)
- [ ] Mensagens informativas, não de cobrança

### Trends
- [ ] get_trends tool funciona
- [ ] Correlações calculadas corretamente
- [ ] Densidade de dados calculada
- [ ] Warnings para dados esparsos

---

*Última atualização: 27 Janeiro 2026*
