# Wellbeing Module

> Bem-estar geral: estresse, satisfação, work-life balance, hobbies e gratidão.

---

## 1. Overview

O módulo de Bem-estar permite acompanhar aspectos subjetivos da qualidade de vida, incluindo estresse, satisfação, hobbies e práticas de gratidão.

---

## 2. Stress Level

### 2.1 Registro

Via conversa:
```
"Estou muito estressado hoje"
"Semana tranquila, pouco estresse"
"O trabalho está me sobrecarregando"
```

Escala: 1-10 (extraído pela IA)

### 2.2 Tracking

- Registro diário (quando mencionado)
- Média semanal/mensal
- Tendência (aumentando, estável, diminuindo)
- Correlações (com trabalho, sono, exercício)

---

## 3. General Satisfaction

### 3.1 Check-in Periódico

A IA pode perguntar ocasionalmente:
```
"Como você está se sentindo sobre a vida em geral esta semana?"
```

### 3.2 Escala

1-10 onde:
- 1-3: Insatisfeito
- 4-6: Neutro
- 7-8: Satisfeito
- 9-10: Muito satisfeito

---

## 4. Work-Life Balance

### 4.1 Indicadores

| Indicador | Fonte |
|-----------|-------|
| Horas trabalhadas | Mencionado em conversas |
| Tempo com família | Módulo Family |
| Tempo de lazer | Este módulo |
| Férias utilizadas | Registro |

### 4.2 Score de Equilíbrio

Calculado quando há dados suficientes:
- Ratio trabalho/vida pessoal
- Comparativo com período anterior
- Alertas quando desequilibrado

---

## 5. Hobbies

### 5.1 Cadastro

| Campo | Descrição |
|-------|-----------|
| Nome | Nome do hobby |
| Categoria | Arte, esporte, música, etc. |
| Frequência ideal | Quanto quer praticar |
| Última prática | Quando fez por último |

### 5.2 Registro de Prática

Via conversa:
```
"Toquei violão hoje à noite"
"Passei 2 horas pintando"
"Joguei tênis com amigos"
```

### 5.3 Insights

- "Faz 2 semanas que você não pratica {hobby}"
- "Você mencionou que tocar violão te relaxa. Que tal esta semana?"

---

## 6. Leisure Time

### 6.1 Registro

Atividades de lazer além de hobbies:
- Assistir séries/filmes
- Sair com amigos
- Passeios
- Descanso intencional

### 6.2 Horas de Lazer

- Por semana
- Comparativo com trabalho
- Tendência

---

## 7. Vacations

### 7.1 Registro

| Campo | Descrição |
|-------|-----------|
| Destino | Para onde foi |
| Período | Data início - fim |
| Tipo | Descanso, aventura, família, trabalho |
| Notas | Memórias, experiências |
| Fotos | Links/referências |

### 7.2 Planejamento

| Campo | Descrição |
|-------|-----------|
| Destino desejado | Para onde quer ir |
| Período planejado | Quando pretende ir |
| Orçamento | Quanto quer gastar |
| Checklist | O que precisa fazer antes |

### 7.3 Saldo de Férias

Para CLT:
- Dias disponíveis
- Dias utilizados
- Próximo vencimento

---

## 8. Personal Achievements

### 8.1 Celebrações

Marcos pessoais a serem celebrados:
- Conquistas profissionais
- Objetivos atingidos
- Momentos especiais
- Superações

### 8.2 Registro

Via conversa:
```
"Consegui a promoção que queria!"
"Completei minha primeira maratona"
"Fiz 1 ano sem fumar"
```

---

## 9. Gratitude Journal

### 9.1 Prática

Opcional, para quem quer cultivar gratidão:
```
"Hoje sou grato por: café quente, sol bonito, conversa com amigo"
```

### 9.2 Estrutura

| Campo | Descrição |
|-------|-----------|
| Data | Dia do registro |
| Itens | Lista de gratidões (1-5) |
| Reflexão | Nota opcional |

### 9.3 Frequência

- Não há obrigatoriedade
- Quando registrado, celebrar
- Insights sobre padrões de gratidão

---

## 10. Social Activities

### 10.1 Registro

Via conversa:
```
"Encontrei amigos para jantar"
"Happy hour com colegas de trabalho"
"Fui a uma festa de aniversário"
```

### 10.2 Métricas

- Frequência de encontros sociais
- Pessoas diferentes encontradas
- Tipos de atividades

### 10.3 Insights

- "Você tem encontrado amigos com frequência esta semana!"
- "Faz um tempo que você não menciona sair com amigos"

---

## 11. Data Model

### 11.1 wellbeing_entries

```typescript
export const wellbeingEntries = pgTable('wellbeing_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  type: varchar('type', { length: 50 }).notNull(),
  // Types: stress, satisfaction, work_hours, leisure, social, gratitude

  value: integer('value'), // 1-10 para escalas
  date: date('date').notNull(),
  notes: text('notes'),

  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 11.2 hobbies

```typescript
export const hobbies = pgTable('hobbies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  frequency: varchar('frequency', { length: 50 }), // weekly, monthly, etc.
  lastPracticed: date('last_practiced'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 11.3 vacations

```typescript
export const vacations = pgTable('vacations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  destination: varchar('destination', { length: 255 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  type: varchar('type', { length: 50 }),

  notes: text('notes'),
  isPlanned: boolean('is_planned').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 12. Definition of Done

- [ ] Registro de nível de estresse via conversa
- [ ] Check-in de satisfação geral
- [ ] Indicadores de work-life balance
- [ ] CRUD de hobbies com frequência
- [ ] Registro de tempo de lazer
- [ ] CRUD de férias (passadas e planejadas)
- [ ] Registro de conquistas pessoais
- [ ] Diário de gratidão opcional
- [ ] Registro de atividades sociais
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 26 Janeiro 2026*
