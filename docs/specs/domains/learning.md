# Learning Module

> Acompanhamento de estudos: livros, cursos, certificações e horas de estudo.

---

## 1. Overview

O módulo de Estudos permite acompanhar o aprendizado contínuo através de livros, cursos, certificações e horas de estudo dedicadas.

---

## 2. Books

### 2.1 Status de Leitura

| Status | Descrição |
|--------|-----------|
| `to_read` | Na fila para ler |
| `reading` | Lendo atualmente |
| `completed` | Concluído |
| `abandoned` | Abandonado |

### 2.2 Campos

| Campo | Descrição |
|-------|-----------|
| Título | Nome do livro |
| Autor | Quem escreveu |
| Categoria | Ficção, negócios, técnico, etc. |
| Páginas | Total de páginas |
| Página atual | Onde parou |
| Progresso | % lido |
| Início | Data que começou |
| Conclusão | Data que terminou |
| Rating | Nota 1-5 |
| Notas | Observações |

### 2.3 Via Conversa

```
"Comecei a ler Atomic Habits"
"Terminei o livro do James Clear"
"Estou na página 150 do Atomic Habits"
```

---

## 3. Annual Book Goal

### 3.1 Configuração

| Campo | Descrição |
|-------|-----------|
| Meta | Número de livros |
| Ano | Ano da meta |
| Concluídos | Quantos leu |
| Progresso | % atingido |

### 3.2 Visualização

```
Meta 2026: 24 livros
Lidos: 8/24 (33%)
████████░░░░░░░░░░░░░░░░

Ritmo atual: 8 livros em 3 meses = 32/ano
Status: À frente da meta! 🎉
```

---

## 4. Book Summaries

> Integrado com módulo Memory

### 4.1 Notas do Livro

Armazenadas como knowledge_items:
- Insights principais
- Citações marcantes
- Aplicações práticas
- Conexões com outros livros

### 4.2 Extração Automática

A IA pode ajudar a organizar notas:
```
"Me ajuda a organizar o que aprendi com Atomic Habits"
```

---

## 5. Courses

### 5.1 Status

| Status | Descrição |
|--------|-----------|
| `enrolled` | Matriculado |
| `in_progress` | Em andamento |
| `completed` | Concluído |
| `paused` | Pausado |

### 5.2 Campos

| Campo | Descrição |
|-------|-----------|
| Nome | Nome do curso |
| Plataforma | Udemy, Coursera, etc. |
| Instrutor | Quem ministra |
| Duração | Horas totais |
| Progresso | % concluído |
| Início | Data de início |
| Conclusão | Data de conclusão |
| Certificado | URL do certificado |

### 5.3 Via Conversa

```
"Comecei o curso de Python no Udemy"
"Terminei 3 módulos do curso de React"
"Concluí o curso de AWS"
```

---

## 6. Certifications

### 6.1 Campos

| Campo | Descrição |
|-------|-----------|
| Nome | Nome da certificação |
| Instituição | Quem emitiu |
| Data obtida | Quando passou |
| Validade | Data de expiração |
| ID | Número de registro |
| URL | Link para verificação |

### 6.2 Alertas

- 90 dias antes da expiração
- 30 dias antes da expiração
- No dia da expiração

---

## 7. Study Hours Tracking

### 7.1 Registro

Via conversa:
```
"Estudei 2 horas de programação hoje"
"Passei a manhã estudando para a prova"
```

Campos:
- Data
- Duração (minutos/horas)
- Área de estudo
- Notas

### 7.2 Métricas

| Métrica | Cálculo |
|---------|---------|
| Horas por semana | Soma da semana |
| Horas por mês | Soma do mês |
| Média diária | Total / Dias |
| Área mais estudada | Categoria com mais horas |

### 7.3 Metas de Estudo

| Campo | Descrição |
|-------|-----------|
| Horas por semana | Meta semanal |
| Horas por mês | Meta mensal |
| Progresso | % atingido |

---

## 8. Study Areas

### 8.1 Categorias

```typescript
export const studyAreaEnum = pgEnum('study_area', [
  'programming',    // Programação
  'languages',      // Idiomas
  'business',       // Negócios
  'finance',        // Finanças
  'health',         // Saúde
  'arts',           // Artes
  'sciences',       // Ciências
  'humanities',     // Humanas
  'technology',     // Tecnologia geral
  'personal_dev',   // Desenvolvimento pessoal
  'other'
]);
```

### 8.2 Distribuição

Visualização de tempo por área:
- Gráfico de pizza
- Comparativo com meses anteriores

---

## 9. Learnings (Extracted Insights)

### 9.1 Estrutura

Armazenados como knowledge_items tipo "insight":
- Aprendizado
- Fonte (livro, curso, experiência)
- Área
- Data

### 9.2 Exemplos

```
"Aprendi que hábitos são formados por gatilho-rotina-recompensa"
"Descobri que TypeScript strict mode previne muitos bugs"
```

---

## 10. Flashcards (Spaced Repetition)

### 10.1 Estrutura

| Campo | Descrição |
|-------|-----------|
| Frente | Pergunta/termo |
| Verso | Resposta/definição |
| Deck | Conjunto de cards |
| Área | Categoria |
| Próxima revisão | Data calculada |
| Facilidade | Score 1-5 |

### 10.2 Algoritmo

Baseado em spaced repetition (SM-2):
- Acertou fácil: próxima em 7+ dias
- Acertou com dificuldade: próxima em 3 dias
- Errou: próxima em 1 dia

---

## 11. Data Model

### 11.1 books

```typescript
export const books = pgTable('books', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  title: varchar('title', { length: 500 }).notNull(),
  author: varchar('author', { length: 255 }),
  category: varchar('category', { length: 100 }),

  totalPages: integer('total_pages'),
  currentPage: integer('current_page').default(0),
  progress: integer('progress').default(0),

  status: varchar('status', { length: 50 }).default('to_read'),
  startedAt: date('started_at'),
  completedAt: date('completed_at'),

  rating: integer('rating'),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 11.2 courses

```typescript
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  name: varchar('name', { length: 500 }).notNull(),
  platform: varchar('platform', { length: 100 }),
  instructor: varchar('instructor', { length: 255 }),

  totalHours: decimal('total_hours', { precision: 5, scale: 1 }),
  progress: integer('progress').default(0),

  status: varchar('status', { length: 50 }).default('enrolled'),
  startedAt: date('started_at'),
  completedAt: date('completed_at'),

  certificateUrl: text('certificate_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 12. Definition of Done

- [ ] CRUD de livros com status
- [ ] Meta anual de livros com progresso
- [ ] CRUD de cursos com progresso
- [ ] CRUD de certificações com alertas
- [ ] Registro de horas de estudo
- [ ] Métricas de estudo (semanal/mensal)
- [ ] Flashcards com spaced repetition
- [ ] Integração com Memory para insights
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 26 Janeiro 2026*
