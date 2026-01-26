# Health Module

> Tracking de saúde física, mental, exercícios, sono e histórico médico.

---

## 1. Overview

O módulo de Saúde permite registrar e acompanhar métricas de saúde física e mental. Segue a filosofia de baixo atrito (ADR-015): métricas são capturadas via conversa natural com confirmação ou registradas manualmente no dashboard.

**Filosofia (ADR-015):** Nenhuma métrica é obrigatória. O sistema funciona sem dados e não penaliza ausência de registros.

---

## 2. Body Metrics

### 2.1 Peso

| Campo | Descrição |
|-------|-----------|
| Valor | Peso em kg ou lb |
| Data | Data do registro |
| Fonte | 'conversation', 'form', 'integration' |

**Meta de peso (opcional):**
- Definida pelo usuário
- Progresso visual (barra)
- Sem penalização por não registrar

### 2.2 Outras Métricas Corporais

| Métrica | Unidade | Frequência Típica |
|---------|---------|-------------------|
| Gordura corporal | % | Semanal |
| Circunferência abdominal | cm | Mensal |
| IMC | calculado | Automático |
| Altura | cm | Uma vez |

### 2.3 Cálculo de IMC

```typescript
function calculateBMI(weight: number, height: number): number {
  // height em cm, weight em kg
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

// Categorias
// < 18.5: Abaixo do peso
// 18.5-24.9: Normal
// 25-29.9: Sobrepeso
// >= 30: Obesidade
```

---

## 3. Exercise Tracking

### 3.1 Registro de Treinos

Via conversa:
```
"Treinei 45 minutos de musculação hoje"
"Corri 5km em 30 minutos"
"Fiz yoga por 1 hora"
```

Campos:
- Tipo de exercício
- Duração (minutos)
- Intensidade (baixa, média, alta)
- Distância (se aplicável)
- Calorias (estimativa)

### 3.2 Tipos de Exercício

```typescript
export const exerciseTypeEnum = pgEnum('exercise_type', [
  'cardio',      // Corrida, bike, natação
  'strength',    // Musculação
  'flexibility', // Yoga, alongamento
  'sports',      // Futebol, tênis
  'other'
]);

export const exerciseIntensityEnum = pgEnum('exercise_intensity', [
  'low',    // Caminhada leve
  'medium', // Treino moderado
  'high'    // HIIT, treino intenso
]);
```

### 3.3 Métricas Calculadas

| Métrica | Cálculo | Período |
|---------|---------|---------|
| Frequência semanal | Dias com treino / 7 | Semana |
| Volume total | Soma de minutos | Semana/Mês |
| Consistência | Semanas ativas / Total | Mês |

### 3.4 PRs (Personal Records)

- Maior peso levantado por exercício
- Melhor tempo por distância
- Maior distância percorrida

---

## 4. Nutrition (Optional)

### 4.1 Registro de Refeições

Via conversa:
```
"Almocei salada com frango"
"Comi pizza no jantar"
```

Campos (opcionais):
- Descrição
- Tipo (café, almoço, jantar, lanche)
- Calorias (se informado)
- Macros (se informado)

### 4.2 Filosofia

- **SEM** metas diárias impostas
- **SEM** contagem obrigatória de calorias
- Apenas registro para quem quer acompanhar
- Insights sobre padrões (quando há dados)

---

## 5. Sleep Tracking

### 5.1 Registro

Via conversa:
```
"Dormi 7 horas ontem"
"Acordei mal hoje, só dormi 5h"
```

Campos:
- Horas dormidas
- Qualidade (quando mencionada)
- Horário de dormir (opcional)
- Horário de acordar (opcional)

### 5.2 Métricas Calculadas

| Métrica | Cálculo |
|---------|---------|
| Média de sono | Soma / Dias registrados |
| Consistência de horário | Desvio padrão de horários |
| Dívida de sono | Horas < meta acumuladas |

---

## 6. Medical History

### 6.1 Consultas

| Campo | Descrição |
|-------|-----------|
| Data | Data da consulta |
| Médico | Nome e especialidade |
| Motivo | Razão da consulta |
| Resultado | Diagnóstico/conduta |
| Próxima consulta | Data agendada |
| Notas | Observações |

### 6.2 Médicos

| Campo | Descrição |
|-------|-----------|
| Nome | Nome completo |
| Especialidade | Cardiologista, etc. |
| Contato | Telefone, email |
| Local | Consultório/hospital |
| Notas | Observações |

### 6.3 Medicamentos

| Campo | Descrição |
|-------|-----------|
| Nome | Nome do medicamento |
| Dosagem | Ex: 50mg |
| Frequência | 1x ao dia, etc. |
| Horário | Manhã, almoço, noite |
| Início | Data que começou |
| Término | Data que parou (se aplicável) |
| Motivo | Por que está tomando |
| Status | Em uso, pausado, encerrado |

### 6.4 Vacinas

| Campo | Descrição |
|-------|-----------|
| Nome | Nome da vacina |
| Data | Data de aplicação |
| Dose | 1ª, 2ª, reforço |
| Próxima dose | Data agendada |
| Local | Onde tomou |

### 6.5 Exames e Marcadores

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: Colesterol Total |
| Valor | Resultado numérico |
| Unidade | mg/dL, etc. |
| Data | Data do exame |
| Referência | Valores normais |
| Status | Normal, atenção, alterado |

**Evolução de Marcadores:**
- Gráfico histórico por marcador
- Comparativo com valores de referência
- Tendência (subindo, estável, descendo)

### 6.6 Alertas de Exames Periódicos

- Lembretes de periodicidade por tipo de exame
- Aviso antecipado (ex: 30 dias antes)
- Integração com consultas agendadas

---

## 7. Mental Health

### 7.1 Humor

Via conversa:
```
"Estou me sentindo bem hoje"
"Dia difícil, muito estresse"
```

Escala: 1-10 (extraído pela IA)

### 7.2 Outras Métricas

| Métrica | Descrição |
|---------|-----------|
| Ansiedade | Nível reportado (1-10) |
| Estresse | Nível reportado (1-10) |
| Energia | Nível de energia (1-10) |

### 7.3 Terapia

| Campo | Descrição |
|-------|-----------|
| Data | Data da sessão |
| Terapeuta | Nome |
| Notas | Tópicos discutidos (privado) |

### 7.4 Gatilhos

A IA identifica padrões via conversas:
- "Percebi que você mencionou cansaço várias vezes esta semana"
- "Suas menções de estresse coincidem com semanas de muitas reuniões"

---

## 8. Integrations

### 8.1 Google Fit (Futuro)

- Importar passos
- Importar exercícios
- Importar sono

### 8.2 Strava (Futuro)

- Importar atividades
- Sincronizar PRs

---

## 9. AI Tools

### 9.1 Read Tools

```typescript
{
  name: 'get_health_metrics',
  description: 'Obtém métricas de saúde do usuário',
  parameters: z.object({
    type: z.enum(['weight', 'sleep', 'exercise', 'mood', 'all']),
    days: z.number().default(30),
  }),
  requiresConfirmation: false,
}

{
  name: 'get_medical_history',
  description: 'Obtém histórico médico',
  parameters: z.object({
    type: z.enum(['consultations', 'medications', 'exams', 'vaccines']),
    limit: z.number().default(10),
  }),
  requiresConfirmation: false,
}
```

### 9.2 Write Tools

```typescript
{
  name: 'record_metric',
  description: 'Registra métrica de saúde',
  parameters: z.object({
    type: z.enum(['weight', 'sleep', 'exercise', 'mood', 'energy']),
    value: z.number(),
    unit: z.string().optional(),
    date: z.string(),
    metadata: z.object({}).optional(),
  }),
  requiresConfirmation: true,
}
```

---

## 10. Data Model

### 10.1 tracking_entries (Health)

Ver `core/data-conventions.md` para schema completo.

Tipos relevantes para saúde:
- `weight`
- `water`
- `sleep`
- `exercise`
- `meal`
- `medication`
- `mood`
- `energy`

### 10.2 Metadata por Tipo

```typescript
// weight
{ notes?: string }

// sleep
{ quality?: number, bedtime?: string, waketime?: string }

// exercise
{
  exerciseType: 'cardio' | 'strength' | 'flexibility' | 'sports' | 'other',
  intensity: 'low' | 'medium' | 'high',
  distance?: number,
  distanceUnit?: 'km' | 'mi',
  calories?: number,
  notes?: string
}

// mood/energy
{ notes?: string }
```

---

## 11. Preparation for Medical Consultation

A IA gera automaticamente um resumo para consultas:

```markdown
PREPARAÇÃO PARA CONSULTA - {ESPECIALIDADE}
Data: {data} - Dr. {nome}

ÚLTIMA CONSULTA
- {data} - Dr. {nome}
- Resultado: {resultado}

MEDICAMENTOS EM USO
- {nome} {dosagem} - {frequência}

EXAMES RECENTES
- {nome}: {valor} ({data}) {tendência}

EVOLUÇÃO DO PESO
- Atual: {peso}kg | Meta: {meta}kg | 6 meses atrás: {peso_anterior}kg

SINTOMAS REGISTRADOS NO PERÍODO
- {data}: "{sintoma}"

PERGUNTAS PENDENTES
- {pergunta}
```

---

## 12. Definition of Done

- [ ] Registrar peso via conversa e dashboard
- [ ] Registrar exercício via conversa
- [ ] Registrar sono via conversa
- [ ] Registrar humor/energia
- [ ] Histórico de métricas com gráficos
- [ ] CRUD de medicamentos
- [ ] CRUD de exames
- [ ] Preparação automática para consulta
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 26 Janeiro 2026*
