# Tracking & Habits (ADR-015, ADR-017)

> Módulo unificado de tracking de métricas de saúde e hábitos diários, com calendário visual, streaks e insights de correlação.

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

Similar ao módulo Finance, o tracking suporta dois modos de entrada:

1. **Captura conversacional:** IA detecta métricas/hábitos em conversa natural e pede confirmação
2. **Dashboard manual:** Formulários e checkboxes para registro ativo (opcional)

### Confirmation Rule

Antes de salvar, IA SEMPRE pergunta: "Quer que eu registre...?"
- Tom de oferta, não de cobrança
- Usuário pode corrigir valores antes de confirmar
- Usuário pode recusar ("não precisa")

---

## 2. Conceito: Tracking Unificado

> **Decisão (2026-02-01):** Unificar o antigo M2.1 (Tracking Métricas) com M2.3 (Hábitos) em um único módulo `/tracking`.

### Dois Tipos de Dados

| Tipo | Natureza | Exemplos | Armazenamento |
|------|----------|----------|---------------|
| **Métricas** | Valores numéricos | peso (kg), água (ml), sono (h), humor (1-10) | `tracking_entries` |
| **Hábitos** | Booleanos (fez/não fez) | treino, leitura, meditação, journaling | `habits` + `habit_completions` |

### Relação entre Tipos

```
┌─────────────────────────────────────────────────────────┐
│                    /tracking                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MÉTRICAS (quanto?)           HÁBITOS (fez?)           │
│  ├─ peso: 75.5 kg             ├─ treino: ✓ 🔥12       │
│  ├─ água: 2000 ml             ├─ leitura: ✓ 🔥45      │
│  ├─ sono: 7.5 h               ├─ meditação: ✗         │
│  ├─ humor: 7/10               └─ journaling: ✓ 🔥7    │
│  └─ energia: 8/10                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. UI Structure

### 3.1 Overview

```
/tracking
├── 📅 Calendário Mensal (vista principal)
│   ├── Navegação ◄ Mês ► (similar ao /finance)
│   ├── Cada dia mostra resumo visual
│   └── Clicar no dia abre detalhe
│
├── 📝 Vista do Dia (modal ou página)
│   ├── Hábitos do dia (checkboxes + streaks)
│   └── Métricas do dia (inputs numéricos)
│
├── 📊 Aba Insights
│   ├── Correlações automáticas
│   └── Life Balance Score
│
└── 🔥 Aba Streaks
    └── Todos os hábitos com sequências
```

### 3.2 Calendário Mensal (Vista Principal)

Inspirado no padrão "Year in Pixels" do Daylio. Cada dia mostra:

```
┌─────────────────────────────────────────┐
│  ◄  Janeiro 2026  ►                     │
├─────────────────────────────────────────┤
│ Dom  Seg  Ter  Qua  Qui  Sex  Sáb      │
│                  1    2    3    4       │
│                 🟢   🟡   🟢   🟢       │
│                 ●●   ●○   ●●●  ●●       │
│                                         │
│  5    6    7    8    9   10   11       │
│ 🟡   🟢   🟢   🔴   🟡   🟢   🟡       │
│ ●○   ●●●  ●●   ○○   ●○   ●●●  ●●       │
└─────────────────────────────────────────┘

Legenda:
🟢🟡🔴 = Cor do humor (bom ≥7 / neutro 4-6 / ruim ≤3)
●○ = Hábitos completados/total do dia
```

**Navegação:**
- Similar ao `/finance` com MonthSelector
- Setas ◄ ► para navegar entre meses
- Clicar no mês atual retorna para hoje
- Indicador visual quando não está no mês atual

### 3.3 Vista do Dia

Ao clicar em um dia no calendário:

```
┌─────────────────────────────────────────┐
│ Terça, 7 de Janeiro                 ✕   │
├─────────────────────────────────────────┤
│ HÁBITOS                                 │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Treino (manhã)      🔥 12 dias   │ │
│ │ ☑ Leitura (manhã)     🔥 45 dias   │ │
│ │ ☐ Meditação (manhã)   🔥 0 dias    │ │
│ │ ☑ Journaling (noite)  🔥 7 dias    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ MÉTRICAS                                │
│ ┌─────────────────────────────────────┐ │
│ │ 😊 Humor      [●●●●●●●○○○] 7       │ │
│ │ ⚡ Energia    [●●●●●●●●○○] 8       │ │
│ │ 💧 Água       [2100] ml            │ │
│ │ 😴 Sono       [7.5] h              │ │
│ │ ⚖️ Peso       [75.2] kg            │ │
│ └─────────────────────────────────────┘ │
│              [Salvar]                   │
└─────────────────────────────────────────┘
```

### 3.4 Aba Insights

Correlações automáticas calculadas com níveis de confiança:

```
┌─────────────────────────────────────────┐
│ 💡 Insights do Mês                      │
├─────────────────────────────────────────┤
│                                         │
│ "Quando você dorme 7h+, seu humor       │
│  tende a ser 1.5 pontos maior"          │
│  Confiança: Alta ●●●                    │
│                                         │
│ "Dias com treino têm energia média      │
│  de 7.8 vs 5.2 sem treino"              │
│  Confiança: Média ●●○                   │
│                                         │
│ "Leitura matinal aparece em 80%         │
│  dos seus melhores dias"                │
│  Confiança: Alta ●●●                    │
│                                         │
└─────────────────────────────────────────┘
```

### 3.5 Aba Streaks

Dashboard de sequências por hábito:

```
┌─────────────────────────────────────────┐
│ 🔥 Streaks                              │
├─────────────────────────────────────────┤
│                                         │
│ 📚 Leitura                              │
│ ├─ Atual: 45 dias 🔥                    │
│ └─ Recorde: 45 dias ⭐                  │
│                                         │
│ 🏋️ Treino                               │
│ ├─ Atual: 12 dias 🔥                    │
│ └─ Recorde: 30 dias                     │
│                                         │
│ ✍️ Journaling                           │
│ ├─ Atual: 7 dias 🔥                     │
│ └─ Recorde: 21 dias                     │
│                                         │
│ 🧘 Meditação                            │
│ ├─ Atual: 0 dias                        │
│ └─ Recorde: 14 dias                     │
│                                         │
└─────────────────────────────────────────┘
```

---

## 4. Tracking Types (Métricas)

> **Nota:** Dados financeiros são gerenciados pelo **módulo Finance (M2.2)**. Ver `docs/specs/domains/finance.md`.

```typescript
enum TrackingType {
  // Saúde física
  WEIGHT = 'weight',
  WATER = 'water',
  SLEEP = 'sleep',
  EXERCISE = 'exercise',

  // Bem-estar mental
  MOOD = 'mood',
  ENERGY = 'energy',

  // Personalizado
  CUSTOM = 'custom',
}
```

### 4.1 Validation Rules

| Tipo | Campo | Validação | Unidade |
|------|-------|-----------|---------|
| **weight** | value | `0 < value ≤ 500` | kg |
| **weight** | date | `≤ now` (não pode ser futuro) | - |
| **water** | value | `0 < value ≤ 10000` | ml |
| **exercise** | duration | `0 < duration ≤ 1440` | min |
| **exercise** | intensity | `low \| medium \| high` | - |
| **sleep** | duration | `0 < duration ≤ 24` | hours |
| **sleep** | quality | `1-10` | score |
| **mood** | value | `1-10` | score |
| **energy** | value | `1-10` | score |
| **custom** | value | `number` (sem limites) | custom |

---

## 5. Habits (Hábitos)

### 5.1 Habit Definition

```typescript
interface Habit {
  id: string;
  userId: string;
  name: string;              // "Treino", "Leitura", "Meditação"
  description?: string;
  icon: string;              // emoji ou lucide icon name
  color?: string;            // hex color para UI
  frequency: HabitFrequency;
  periodOfDay?: PeriodOfDay;
  isActive: boolean;
  currentStreak: number;     // calculado
  longestStreak: number;     // histórico
  createdAt: Date;
  updatedAt: Date;
}

enum HabitFrequency {
  DAILY = 'daily',           // Todo dia
  WEEKDAYS = 'weekdays',     // Seg-Sex
  WEEKENDS = 'weekends',     // Sáb-Dom
  CUSTOM = 'custom',         // Dias específicos
}

enum PeriodOfDay {
  MORNING = 'morning',       // Manhã (05:00-12:00)
  AFTERNOON = 'afternoon',   // Tarde (12:00-18:00)
  EVENING = 'evening',       // Noite (18:00-05:00)
  ANYTIME = 'anytime',       // Qualquer hora
}
```

### 5.2 Habit Completion

```typescript
interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  completedAt: Date;         // Data/hora da conclusão
  date: Date;                // Data do hábito (YYYY-MM-DD)
  notes?: string;
  source: CompletionSource;
}

enum CompletionSource {
  FORM = 'form',             // Dashboard manual
  CHAT = 'chat',             // Via conversa com IA
  API = 'api',               // API externa
  TELEGRAM = 'telegram',     // Bot Telegram
}
```

### 5.3 Streak Calculation

```typescript
// Streak é calculado em tempo real, não armazenado
function calculateStreak(completions: HabitCompletion[], frequency: HabitFrequency): number {
  // Ordena por data decrescente
  // Conta dias consecutivos de acordo com a frequência
  // Para DAILY: dias seguidos
  // Para WEEKDAYS: dias úteis seguidos
  // Para WEEKENDS: fins de semana seguidos
}
```

**Regras de Streak:**
- Streak quebra se pular um dia esperado pela frequência
- Streak não quebra em dias fora da frequência (ex: WEEKDAYS não quebra no fim de semana)
- Completar no mesmo dia várias vezes conta como 1

### 5.4 Habit Presets

Hábitos sugeridos para onboarding:

| Categoria | Hábitos Sugeridos |
|-----------|-------------------|
| **Saúde** | Treino, Alongamento, Caminhada |
| **Mente** | Meditação, Journaling, Gratidão |
| **Conhecimento** | Leitura, Estudo, Podcast |
| **Espiritual** | Devocional, Oração |
| **Produtividade** | Planejamento do dia, Review semanal |

---

## 6. API Endpoints

### 6.1 Tracking (Métricas)

| Operação | Endpoint | Método | Descrição |
|----------|----------|--------|-----------|
| Criar | `/tracking` | POST | Registra métrica |
| Listar | `/tracking` | GET | Lista com filtros |
| Buscar | `/tracking/:id` | GET | Busca por ID |
| Atualizar | `/tracking/:id` | PATCH | Atualiza métrica |
| Deletar | `/tracking/:id` | DELETE | Remove métrica |
| Agregações | `/tracking/aggregations` | GET | Stats por tipo |
| Por Dia | `/tracking/by-date/:date` | GET | Métricas de um dia |

### 6.2 Habits (Hábitos)

| Operação | Endpoint | Método | Descrição |
|----------|----------|--------|-----------|
| Criar | `/habits` | POST | Cria hábito |
| Listar | `/habits` | GET | Lista hábitos do usuário |
| Buscar | `/habits/:id` | GET | Busca por ID |
| Atualizar | `/habits/:id` | PATCH | Atualiza hábito |
| Deletar | `/habits/:id` | DELETE | Remove hábito |
| Completar | `/habits/:id/complete` | POST | Marca como feito |
| Desmarcar | `/habits/:id/uncomplete` | DELETE | Remove conclusão |
| Streaks | `/habits/streaks` | GET | Streaks de todos |

### 6.3 Calendar View

| Operação | Endpoint | Método | Descrição |
|----------|----------|--------|-----------|
| Mês | `/tracking/calendar/:year/:month` | GET | Resumo do mês |
| Dia | `/tracking/day/:date` | GET | Detalhes do dia |

**Response do Calendar (mês):**
```typescript
interface CalendarMonthResponse {
  month: string;  // "2026-01"
  days: {
    date: string;           // "2026-01-07"
    moodScore?: number;     // 1-10, para cor do dia
    moodColor: 'green' | 'yellow' | 'red' | 'gray';
    habitsCompleted: number;
    habitsTotal: number;
    hasData: boolean;
  }[];
}
```

**Response do Day:**
```typescript
interface DayDetailResponse {
  date: string;
  metrics: TrackingEntry[];
  habits: {
    habit: Habit;
    completed: boolean;
    completedAt?: Date;
  }[];
}
```

---

## 7. AI Tools

### 7.1 record_metric

Registra uma métrica de tracking (saúde, bem-estar).

```typescript
{
  name: 'record_metric',
  parameters: {
    type: TrackingType,
    value: number,
    unit?: string,
    date?: string,         // ISO date, default hoje
    metadata?: object,
  },
  requiresConfirmation: true,
}
```

### 7.2 record_habit

Registra conclusão de um hábito.

```typescript
{
  name: 'record_habit',
  parameters: {
    habitName: string,     // Nome do hábito (fuzzy match)
    date?: string,         // ISO date, default hoje
    notes?: string,
  },
  requiresConfirmation: true,
}
```

**Exemplo de uso:**
```
Usuário: "Treinei hoje de manhã"
IA: "Quer que eu registre o hábito Treino como concluído hoje?"
Usuário: "Sim"
→ record_habit({ habitName: "Treino", date: "2026-01-07" })
```

### 7.3 update_metric / delete_metric

(Mantidos conforme versão anterior - ver seção 6.2/6.3 do doc antigo)

### 7.4 get_tracking_history

```typescript
{
  name: 'get_tracking_history',
  parameters: {
    type?: TrackingType,   // Opcional, filtra por tipo
    days: number,          // Max 90, default 30
    includeHabits?: boolean,
  },
  requiresConfirmation: false,
}
```

### 7.5 get_habits

```typescript
{
  name: 'get_habits',
  parameters: {
    includeStreaks?: boolean,
    includeCompletionsToday?: boolean,
  },
  requiresConfirmation: false,
}
```

### 7.6 get_trends

Analisa tendências e correlações entre métricas e hábitos.

```typescript
{
  name: 'get_trends',
  parameters: {
    types?: TrackingType[],  // Métricas para analisar
    habits?: string[],       // Nomes de hábitos
    days: number,            // 7-365 dias
    includeCorrelations?: boolean,
  },
  requiresConfirmation: false,
}
```

---

## 8. Data Model

### 8.1 Tracking Entries Table (existente)

```sql
CREATE TABLE tracking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type tracking_type NOT NULL,
  area life_area NOT NULL,
  sub_area sub_area,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20),
  metadata JSONB,
  entry_date DATE NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE,
  source VARCHAR(50) DEFAULT 'form',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tracking_user ON tracking_entries(user_id);
CREATE INDEX idx_tracking_user_type ON tracking_entries(user_id, type);
CREATE INDEX idx_tracking_user_date ON tracking_entries(user_id, entry_date);
CREATE INDEX idx_tracking_date ON tracking_entries(entry_date);
```

### 8.2 Habits Table (nova)

```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '✓',
  color VARCHAR(7),                    -- hex color
  frequency habit_frequency NOT NULL DEFAULT 'daily',
  frequency_days INTEGER[],            -- para CUSTOM: [1,2,3,4,5] = seg-sex
  period_of_day period_of_day DEFAULT 'anytime',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, name)
);

CREATE TYPE habit_frequency AS ENUM ('daily', 'weekdays', 'weekends', 'custom');
CREATE TYPE period_of_day AS ENUM ('morning', 'afternoon', 'evening', 'anytime');

-- Indexes
CREATE INDEX idx_habits_user ON habits(user_id);
CREATE INDEX idx_habits_user_active ON habits(user_id, is_active);
```

### 8.3 Habit Completions Table (nova)

```sql
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  source VARCHAR(50) DEFAULT 'form',

  UNIQUE(habit_id, completion_date)
);

-- Indexes
CREATE INDEX idx_completions_habit ON habit_completions(habit_id);
CREATE INDEX idx_completions_user_date ON habit_completions(user_id, completion_date);
CREATE INDEX idx_completions_date ON habit_completions(completion_date);
```

### 8.4 Life Balance History Table (existente)

```sql
CREATE TABLE life_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,
  total_score DECIMAL(5,2),
  health_score DECIMAL(5,2),
  finance_score DECIMAL(5,2),
  professional_score DECIMAL(5,2),
  learning_score DECIMAL(5,2),
  spiritual_score DECIMAL(5,2),
  relationships_score DECIMAL(5,2),
  calculation_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, score_date)
);
```

### 8.5 RLS Policies

```sql
-- Habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_access" ON habits
  FOR ALL USING (user_id = (SELECT auth.uid()));

-- Habit Completions
ALTER TABLE habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_access" ON habit_completions
  FOR ALL USING (user_id = (SELECT auth.uid()));
```

---

## 9. Life Balance Score (ADR-017)

### 9.1 Overview

Pontuação 0-100 que mede o equilíbrio geral da vida baseado em 6 áreas principais.

> **Nota de Display:** O score interno é 0-100 para precisão de cálculo. Na UI, exibir como 0-10 para melhor UX (dividir por 10).

### 9.2 Main Areas & Sub-areas

| Área | Código | Sub-áreas | Fonte de Dados |
|------|--------|-----------|----------------|
| Saúde | `health` | physical, mental, leisure | Tracking + Habits |
| Finanças | `finance` | budget, savings, debts, investments | Finance Module |
| Profissional | `professional` | career, business | Goals + Manual |
| Aprendizado | `learning` | formal, informal | Habits + Tracking |
| Espiritual | `spiritual` | practice, community | Habits |
| Relacionamentos | `relationships` | family, romantic, social | Retorna 50 (neutro) |

> **Cálculo:** Cada sub-área tem peso igual (1.0). Score da área = média das sub-áreas com dados.
> Sub-áreas sem dados são ignoradas no cálculo (não penaliza o usuário).
> Áreas inteiras sem dados retornam 50 (neutro).

### 9.3 Health Score (usando Tracking + Habits)

**Physical:**
- IMC: Baseado em tracking de peso + altura do perfil
- Exercício: Hábito de treino + tracking de exercise
- Sono: Tracking de sleep (média vs meta)
- Água: Tracking de water (média vs meta)

**Mental:**
- Humor: Média dos últimos 7 dias de mood
- Energia: Média dos últimos 7 dias de energy
- Práticas: Hábitos de meditação, journaling

**Leisure:**
- Baseado em hábitos de lazer/hobbies cadastrados

### 9.4 Learning Score (usando Habits)

| Sub-área | Fonte |
|----------|-------|
| formal | Hábitos de estudo, cursos |
| informal | Hábito de leitura, podcasts |

### 9.5 Interpretation (UI 0-10)

| Faixa | Significado | Cor |
|-------|-------------|-----|
| 9.0 - 10.0 | Excelente | Verde |
| 7.5 - 8.9 | Bom | Verde claro |
| 6.0 - 7.4 | Adequado | Amarelo |
| 4.0 - 5.9 | Atenção | Laranja |
| 0.0 - 3.9 | Crítico | Vermelho |

---

## 10. Trend Analysis & Correlations

### 10.1 Correlation Engine

O sistema calcula correlações automáticas entre:
- Métricas ↔ Métricas (ex: sono ↔ humor)
- Hábitos ↔ Métricas (ex: treino → energia)
- Hábitos ↔ Hábitos (ex: leitura matinal → journaling)

### 10.2 Confidence Levels

| Nível | Critério | Display |
|-------|----------|---------|
| Alta | >= 30 data points, p < 0.01 | ●●● |
| Média | >= 14 data points, p < 0.05 | ●●○ |
| Baixa | >= 7 data points, p < 0.1 | ●○○ |
| Insuficiente | < 7 data points | Não exibe |

### 10.3 Example Insights

```typescript
interface Insight {
  type: 'correlation' | 'pattern' | 'streak' | 'trend';
  confidence: 'high' | 'medium' | 'low';
  message: string;
  data: {
    metric1?: TrackingType;
    metric2?: TrackingType;
    habit1?: string;
    habit2?: string;
    correlation?: number;
    impact?: 'positive' | 'negative';
    value?: number;
  };
}

// Exemplos:
{
  type: 'correlation',
  confidence: 'high',
  message: 'Quando você dorme 7h+, seu humor tende a ser 1.5 pontos maior',
  data: { metric1: 'sleep', metric2: 'mood', correlation: 0.72, impact: 1.5 }
}

{
  type: 'pattern',
  confidence: 'medium',
  message: 'Dias com treino têm energia média de 7.8 vs 5.2 sem treino',
  data: { metric1: 'treino', metric2: 'energy', impact: 2.6 }
}
```

---

## 11. Definition of Done

### Tracking (Métricas)
- [ ] Registrar cada tipo de métrica funciona
- [ ] Validações aplicadas corretamente
- [ ] Confirmação antes de salvar (via chat)
- [ ] Histórico de métricas visível
- [ ] Gráficos de evolução (quando há dados)

### Habits (Hábitos)
- [ ] CRUD de hábitos funciona
- [ ] Marcar/desmarcar conclusão funciona
- [ ] Streaks calculados corretamente
- [ ] Agrupamento por período do dia
- [ ] Frequência customizada funciona

### Calendar View
- [ ] Calendário mensal renderiza corretamente
- [ ] Navegação entre meses funciona
- [ ] Cores dos dias baseadas no humor
- [ ] Indicadores de hábitos por dia
- [ ] Vista do dia com métricas + hábitos

### Insights
- [ ] Correlações calculadas
- [ ] Níveis de confiança corretos
- [ ] Mensagens informativas (não cobranças)

### Life Balance Score
- [ ] Cálculo correto por área e sub-área
- [ ] Usa dados de tracking + habits
- [ ] Histórico armazenado diariamente
- [ ] Funciona com dados insuficientes (score 50)

---

*Última atualização: 01 Fevereiro 2026 (interface Insight expandida para suportar métricas tipadas e hábitos)*
