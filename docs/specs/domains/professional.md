# Professional Module

> Carreira, projetos, networking e metas profissionais.

---

## 1. Overview

O módulo Profissional permite acompanhar a evolução da carreira, gerenciar projetos, manter networking e definir metas profissionais.

---

## 2. Career Tracking

### 2.1 Histórico Profissional

| Campo | Descrição |
|-------|-----------|
| Empresa | Nome da empresa |
| Cargo | Título do cargo |
| Período | Data início - fim |
| Descrição | Responsabilidades |
| Conquistas | Realizações notáveis |

### 2.2 Evolução Salarial

| Campo | Descrição |
|-------|-----------|
| Empresa | Nome da empresa |
| Cargo | Cargo na época |
| Salário | Valor mensal |
| Data | Quando começou |
| Variação | % vs anterior |

### 2.3 Habilidades

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: "Python" |
| Nível | Iniciante, Intermediário, Avançado, Expert |
| Anos | Tempo de experiência |
| Última utilização | Data |

### 2.4 Certificações

| Campo | Descrição |
|-------|-----------|
| Nome | Nome da certificação |
| Instituição | Quem emitiu |
| Data obtida | Quando passou |
| Validade | Data de expiração |
| ID | Número de registro |

---

## 3. Projects

### 3.1 Estrutura

| Campo | Descrição |
|-------|-----------|
| Nome | Nome do projeto |
| Descrição | Detalhes |
| Status | Em andamento, concluído, pausado |
| Início | Data de início |
| Deadline | Prazo final |
| Progresso | % conclusão |

### 3.2 Tarefas por Projeto

| Campo | Descrição |
|-------|-----------|
| Título | Nome da tarefa |
| Descrição | Detalhes |
| Prioridade | Alta, Média, Baixa |
| Status | Pendente, Em progresso, Concluída |
| Prazo | Data limite |
| Dependências | Tarefas que devem vir antes |

### 3.3 Alertas

- 3 dias antes do deadline de tarefas
- Projetos com mais de 7 dias sem atualizações
- Tarefas atrasadas

---

## 4. Networking

> Integrado com o módulo People (CRM Pessoal)

### 4.1 Contatos Profissionais

Filtro de pessoas por tag `work`:
- Colegas de trabalho
- Clientes
- Parceiros
- Mentores
- Contatos de networking

### 4.2 Follow-ups

| Campo | Descrição |
|-------|-----------|
| Pessoa | Quem contatar |
| Motivo | Razão do follow-up |
| Data sugerida | Quando fazer |
| Feito | Checkbox |

### 4.3 Sugestões da IA

"Faz 3 meses que você não fala com {pessoa}. Considere um contato?"

---

## 5. Professional Goals (OKRs)

### 5.1 Objectives

| Campo | Descrição |
|-------|-----------|
| Título | O que quer alcançar |
| Período | Trimestre/Semestre/Ano |
| Status | Em progresso, Concluído, Cancelado |

### 5.2 Key Results

| Campo | Descrição |
|-------|-----------|
| Descrição | Resultado mensurável |
| Métrica atual | Valor atual |
| Meta | Valor alvo |
| Progresso | % atingido |

### 5.3 Exemplo

```
Objective: Ser promovido a Tech Lead
Key Results:
- Liderar 3 projetos importantes (1/3 - 33%)
- Mentorar 2 desenvolvedores juniors (0/2 - 0%)
- Obter certificação de gestão (0/1 - 0%)
```

---

## 6. AI Tools

```typescript
{
  name: 'get_professional_context',
  description: 'Obtém contexto profissional do usuário',
  parameters: z.object({
    includeProjects: z.boolean().default(true),
    includeGoals: z.boolean().default(true),
    includeCertifications: z.boolean().default(true),
  }),
  requiresConfirmation: false,
}

{
  name: 'create_project_task',
  description: 'Cria tarefa em projeto',
  parameters: z.object({
    projectId: z.string().uuid(),
    title: z.string(),
    description: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    deadline: z.string().optional(),
  }),
  requiresConfirmation: true,
}
```

---

## 7. Data Model

### 7.1 career_history

```typescript
export const careerHistory = pgTable('career_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  company: varchar('company', { length: 255 }).notNull(),
  position: varchar('position', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isCurrent: boolean('is_current').default(false),

  description: text('description'),
  achievements: jsonb('achievements').default([]),
  salary: decimal('salary', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('BRL'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 7.2 projects

```typescript
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active'),

  startDate: date('start_date'),
  deadline: date('deadline'),
  completedAt: timestamp('completed_at'),

  progress: integer('progress').default(0),
  metadata: jsonb('metadata'),

  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 8. Definition of Done

- [ ] CRUD de histórico profissional
- [ ] CRUD de projetos e tarefas
- [ ] Alertas de prazos
- [ ] OKRs com progresso
- [ ] Integração com CRM (tag work)
- [ ] Sugestões de networking
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 26 Janeiro 2026*
