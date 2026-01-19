# Análise de Divergências: Visão "Hub da Vida + JARVIS-First"

> **Data:** 2026-01-19
> **Propósito:** Análise de divergências entre a visão do produto e o estado atual das documentações
> **Status:** Para revisão - arquivo temporário

---

## Visão do Usuário

A aplicação deve ser:

1. **Hub da mente/vida** — Tracking, armazenamento e anotações de TODAS as áreas da vida
2. **IA JARVIS-first** — Faz inferências, dá conselhos, ajuda a tomar decisões inteligentes
3. **Cobertura total** — Financeiro, planos, trabalho, saúde, família — ABSOLUTAMENTE TUDO

---

## 🟡 DIVERGÊNCIAS IMPORTANTES

### 1. Modelo de Dados Incompleto para Educação/Aprendizado

**Resumo:** Educação está **100% documentada** no produto mas tem **0% de implementação** no código.

#### ✅ O que EXISTE na Documentação

**`product.md` §6.11 — Módulo Estudos** especifica 13 features:

| Feature | Descrição |
|---------|-----------|
| Livros lidos | Lista com data de conclusão |
| Livros em andamento | Com % de progresso |
| Livros na fila | Wishlist (want to read) |
| Meta anual de livros | Com tracking de progresso |
| Resumos de livros | Integrados à Memória |
| Cursos em andamento | Com tracking de progresso |
| Cursos concluídos | Histórico |
| Certificações obtidas | Com datas de validade |
| Horas de estudo | Tracking semanal/mensal |
| Meta de horas | Por semana/mês |
| Áreas de estudo | Categorização |
| Aprendizados | Extraídos e armazenados |
| Flashcards | Revisão espaçada |

**`product.md` §3** define área de vida `personal_growth` com métricas: "Livros lidos, horas de estudo"

#### ⚠️ O que EXISTE no Código (parcial)

| Item | Localização | Status |
|------|-------------|--------|
| Enum `'education'` em categorias de despesa | `expenseCategoryEnum` | ✅ Existe |
| Enum `'education'` em tipos de investimento | `investmentTypeEnum` | ✅ Existe |
| Área de vida `'personal_growth'` | `lifeAreaEnum` | ✅ Existe |
| `knowledge_items` genérico | Schema | ✅ Pode armazenar fatos sobre educação |

**Limitação do workaround:** `knowledge_items` não permite tracking estruturado (progresso %, páginas lidas, horas de estudo).

#### ❌ O que NÃO EXISTE no Código

**Tabelas (0/6):**
```sql
-- Nenhuma dessas tabelas existe:
courses (id, title, platform, status, progress, started_at, completed_at)
books (id, title, author, status, pages_total, pages_read, started_at)
skills (id, name, level, area, last_practiced)
certifications (id, name, issuer, obtained_at, expires_at)
study_sessions (id, subject, duration, notes, date)
learning_goals (id, type, target, current, period)
```

**Enums de status:**
- `course_status`: not_started, in_progress, completed, abandoned, paused
- `book_status`: want_to_read, reading, completed, abandoned, reread
- `certification_status`: active, expired, revoked

**Tracking types:**
- `study_hours`, `book_pages`, `course_progress` — não existem em `trackingTypeEnum`

**API Layer:**
- Nenhum módulo `courses`, `books`, `certifications`, `learning`
- Nenhum controller, service, repository, use case

**Frontend:**
- Nenhuma página `/learning`, `/books`, `/courses`, `/certifications`
- Nenhum componente de progresso de leitura/estudo

**AI Tools:**
- Nenhuma tool para captura conversacional de estudos
- Faltam: `record_study_session`, `add_book`, `update_book_progress`, `add_course`, `log_certification`

#### 📊 Gap Analysis

| Camada | Documentação | Código | Gap |
|--------|--------------|--------|-----|
| Especificação | ✅ 100% | - | - |
| Schema/Tabelas | - | ❌ 0% | **100%** |
| Enums de status | - | ❌ 0% | **100%** |
| API Layer | - | ❌ 0% | **100%** |
| Frontend | - | ❌ 0% | **100%** |
| AI Tools | - | ❌ 0% | **100%** |
| Milestone | - | ❌ Não planejado | **100%** |

**Citações:**
- `product.md` §6.11 (linhas 617-633): Módulo Estudos completo
- `product.md` §3: Área "Crescimento Pessoal" com métricas de educação
- `packages/database/src/schema/`: Zero tabelas de educação
- `packages/database/src/schema/enums.ts`: Apenas `education` como categoria financeira
- `docs/milestones/`: Nenhum milestone cobre educação

---

### 2. CRM é Armazenamento, não Conselheiro de Relacionamentos

**Resumo:** CRM básico está **100% especificado** nas docs, **schema 100% implementado**, mas **0% de lógica/API/frontend**. "Relationship Intelligence" **não existe** em nenhuma spec.

#### ✅ O que EXISTE na Documentação

**`product.md` §6.5 — Módulo Pessoas (CRM Pessoal)** especifica 12 features:

| Feature | Descrição | Status Docs |
|---------|-----------|-------------|
| Cadastro de pessoas | Nome, apelido, relacionamento, foto | ✅ Especificado |
| Informações de contato | Telefone, email, redes sociais | ✅ Especificado |
| Aniversários | Data com lembretes automáticos (7 dias antes) | ✅ Especificado |
| Datas importantes | Casamento, data que conheceu, etc. | ✅ Especificado |
| Notas sobre pessoa | Informações relevantes, preferências | ✅ Especificado |
| Família da pessoa | Cônjuge, filhos (para contexto) | ✅ Especificado |
| Histórico de interações | Menções automáticas em conversas | ✅ Especificado |
| Presentes dados/recebidos | Registro com datas | ✅ Especificado |
| Tags e grupos | Família, trabalho, amigos, igreja | ✅ Especificado |
| Última interação | Timestamp automático | ✅ Especificado |
| Sugestão de contato | "Faz 3 meses que não fala com X" | ✅ Especificado |
| Conhecimento → Memória | Fatos sobre pessoa salvos automaticamente | ✅ Especificado |

**`system.md` §3.6** define regras de negócio:
```typescript
interface Person {
  name, nickname, relationship, email, phone,
  birthday, anniversary, interests[], dislikes[],
  giftIdeas[], dietaryRestrictions[],
  lastContact, contactFrequencyDays, tags[], notes
}
```

**`system.md` §3.4** — Life Balance Score (Relacionamentos):
- 50% Interações (frequência de contato)
- 50% Qualidade (auto-avaliação)
- **Regra:** "Se sem pessoas cadastradas: score = 100 (assume relacionamentos saudáveis fora do sistema)"

**`ai.md` §6.2** — Tools definidas:
- `get_person` (READ): Obtém info de pessoa do CRM
- `update_person` (WRITE): Atualiza pessoa (requer confirmação)

**`ai.md` §7.6** — Prompt de sugestão de presentes personalizado

#### ✅ O que EXISTE no Código

**Schema 100% implementado** em `packages/database/src/schema/people.ts`:

| Tabela | Campos | Status |
|--------|--------|--------|
| `people` | id, userId, name, nickname, relationship, email, phone, birthday, anniversary, preferences (JSONB), contactFrequencyDays, lastContact, tags, notes, isArchived, deletedAt | ✅ Existe |
| `person_notes` | id, personId, noteId, createdAt (junction table) | ✅ Existe |
| `person_interactions` | id, personId, userId, type, date, notes, conversationId | ✅ Existe |

**Enums implementados:**
- `relationshipTypeEnum`: family, friend, work, acquaintance, romantic, mentor, other
- `interactionTypeEnum`: call, message, meeting, email, gift, other

**JSONB preferences:**
```json
{ "interests": [], "dislikes": [], "giftIdeas": [], "dietaryRestrictions": [], "importantTopics": [] }
```

**Tool Schema** em `packages/ai/src/schemas/tools/update-person.tool.ts`:
- Schema Zod definido
- `requiresConfirmation: true`
- **Mas SEM executor implementado**

#### ❌ O que NÃO EXISTE no Código

**API Layer (0%):**
```
❌ apps/api/src/modules/people/        (diretório não existe)
❌ PeopleController
❌ PeopleService
❌ PeopleRepository
❌ CreatePersonUseCase
❌ RecordInteractionUseCase
❌ GetPeopleUseCase
```

**Frontend (0%):**
```
❌ apps/web/app/people/               (diretório não existe)
❌ /people (lista)
❌ /people/[id] (detalhes)
❌ PersonCard, PersonForm, InteractionTimeline
```

**Jobs (0%):**
```
❌ BirthdayReminderJob
❌ ContactFrequencyJob
```

**Tool Executors (0%):**
```
❌ UpdatePersonExecutor (schema existe, executor não)
❌ GetPersonExecutor
```

#### ❌ O que NÃO EXISTE em Nenhuma Spec ("Relationship Intelligence")

| Feature Faltante | Descrição | Onde Procurei |
|------------------|-----------|---------------|
| **Relationship Health Score** | Score 0-100 por pessoa (frequência + qualidade + recência) | ❌ product.md, system.md, ai.md |
| **Análise de padrões** | Detectar: frequência declinando, só liga quando precisa | ❌ Não mencionado |
| **Tracking de qualidade** | Interação foi positiva/negativa/neutra? | ❌ Não mencionado |
| **Detecção de conflitos** | Interações difíceis, cancelamentos frequentes | ❌ Não mencionado |
| **Alertas inteligentes** | "Você cancelou 3 encontros com João" | ❌ Não mencionado |
| **Metas de relacionamento** | "Quero me aproximar dos pais" com progresso | ❌ Não mencionado |
| **Coaching contextual** | "O que conversar com X?", "Como abordar Y?" | ❌ Não mencionado |
| **Análise de sentimento** | Tom das notas sobre pessoa mudando | ❌ Não mencionado |

#### 📊 Gap Analysis

| Camada | CRM Básico (M3.4) | Relationship Intelligence |
|--------|-------------------|---------------------------|
| **Especificação** | ✅ 100% | ❌ 0% |
| **Schema/Tabelas** | ✅ 100% | ❌ 0% (sem campos de health/quality) |
| **Enums** | ✅ 100% | ❌ 0% (sem interaction_quality, relationship_health) |
| **API Layer** | ❌ 0% | ❌ 0% |
| **Frontend** | ❌ 0% | ❌ 0% |
| **AI Tools** | ⚠️ 50% (schema sem executor) | ❌ 0% |
| **Jobs** | ❌ 0% | ❌ 0% |
| **Milestone** | ✅ M3.4 definido | ❌ Não planejado |

#### 🎯 Comparativo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                     CRM BÁSICO (M3.4)                           │
│  ✅ Documentado  ✅ Schema existe  ❌ API/Frontend não impl.    │
├─────────────────────────────────────────────────────────────────┤
│  • Armazenar pessoas e dados de contato                         │
│  • Registrar interações (tipo, data, notas)                     │
│  • Lembrar aniversários (7 dias antes)                          │
│  • Alertar tempo sem contato (meta em dias)                     │
│  • Sugerir presentes baseado em preferências                    │
│  • Vincular notas a pessoas                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    GAP: "Relationship Intelligence"
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 RELATIONSHIP INTELLIGENCE (Novo)                │
│  ❌ Não especificado  ❌ Não existe  ❌ Não planejado           │
├─────────────────────────────────────────────────────────────────┤
│  • Score de saúde por relacionamento (0-100)                    │
│  • Detectar padrões negativos (frequência declinando)           │
│  • Analisar qualidade das interações (positiva/negativa)        │
│  • Alertar: "Você cancelou 3 encontros com João"                │
│  • Sugerir: "Última conversa foi difícil. Preparar próxima?"    │
│  • Metas: "Quero me aproximar dos meus pais"                    │
│  • Coaching: "Como abordar assunto X com Y?"                    │
│  • Análise de rede: quem me apoia? quem precisa de mim?         │
└─────────────────────────────────────────────────────────────────┘
```

**Citações com localização:**
- `product.md` §6.5 (linhas 437-452): 12 features do CRM
- `system.md` §3.6 (linhas 657-719): Interface Person + regras
- `system.md` §3.4 (linhas 467-479): Life Balance Score (relationships)
- `ai.md` §6.2 (linhas 610-626, 739-752): Tools get_person e update_person
- `packages/database/src/schema/people.ts`: 136 linhas, 3 tabelas, 2 enums
- `packages/ai/src/schemas/tools/update-person.tool.ts`: Schema sem executor
- `docs/milestones/phase-3-assistant.md` (linhas 188-245): M3.4 completo
- **Nenhum documento menciona "relationship intelligence", "relationship health", ou análise de padrões**

---

## 🔵 ADRs QUE PRECISAM SER CRIADOS

| # | ADR Proposto | Propósito | Prioridade | Bloqueia |
|---|--------------|-----------|------------|----------|
| 1 | **ADR-017: Detecção de Anomalias em Tempo Real** | Definir triggers para alertas imediatos vs batch | 🟡 ALTO | Real-time inference |
| 2 | **ADR-018: Schema de Knowledge Graph Semântico** | Definir tipos de entidades, relacionamentos, raciocínio | 🟡 ALTO | AI reasoning |
| 3 | **ADR-019: Encadeamento de Tools & Autonomia** | Definir quando IA pode executar múltiplas tools sem confirmação | 🟡 MÉDIO | AI autonomy |
| 4 | **ADR-020: Privacidade Multi-Tenant** | Definir isolamento de dados em cenários compartilhados | 🟡 MÉDIO | Family accounts |

---

## 📋 MILESTONES QUE PRECISAM SER CRIADOS

### Phase 2 (Pós-Finance)

| # | Milestone | Descrição | Dependências |
|---|-----------|-----------|--------------|
| 1 | **M2.1b — Gestão de Saúde Completa** | Consultas, médicos, exames, medicamentos, histórico | M2.1 |

> **Nota:** `get_trends` (correlação estatística + insights) já está em M2.2.
> **Nota:** Decision Support foi documentado como M3.8 (ADR-016).

### Phase 3 (Pós-Telegram/Calendar)

| # | Milestone | Descrição | Dependências |
|---|-----------|-----------|--------------|
| 1 | **M3.9 — Módulo Carreira/Profissional** | Projetos, clientes, skills, progressão, satisfação | M2.4, M3.4 |
| 2 | **M3.10 — Notas & Documentação** | Criação/edição de notas, markdown, export | M1.3 |

### Phase 4 (Backlog)

| # | Milestone | Descrição | Prioridade |
|---|-----------|-----------|------------|
| 1 | **M4.1 — Lazer & Recreação** | Hobbies, viagens, entretenimento, descanso | Baixa |
| 2 | **M4.2 — Casa & Moradia** | Manutenção, reformas, inventário | Baixa |
| 3 | **M4.3 — Educação & Aprendizado** | Ver detalhes abaixo | **Média** |

#### Detalhamento M4.3 — Educação & Aprendizado

**Escopo:** Implementar tracking completo de educação conforme `product.md` §6.11.

**Tasks por camada:**

| Camada | Tasks |
|--------|-------|
| **Schema** | Tabelas: `courses`, `books`, `skills`, `certifications`, `study_sessions`, `learning_goals` |
| **Enums** | `course_status`, `book_status`, `certification_status`, `study_area`, `learning_source` |
| **Tracking** | Adicionar tipos: `study_hours`, `book_pages`, `course_progress` |
| **API** | Módulo `learning` com controllers, services, repositories, use cases |
| **Frontend** | Páginas: `/learning`, `/learning/books`, `/learning/courses`, `/learning/certifications` |
| **AI Tools** | `record_study_session`, `add_book`, `update_book_progress`, `add_course`, `log_certification` |

**Dependências:** M2.1 (Tracking), M1.3 (Knowledge Items)

**Estimativa:** ~80-120h de desenvolvimento

---

## 📊 SCORE DE ALINHAMENTO: VISÃO vs REALIDADE

| Dimensão | Score | Status | Notas |
|----------|-------|--------|-------|
| **IA Proativa (JARVIS-first)** | 85% | 🟢 | `analyze_context` + `add_knowledge` automático + Memory Consolidation |
| **Correlação Cross-Domain** | 75% | 🟢 | `analyze_context` + `get_trends` (M2.2) |
| **Suporte a Decisões** | 60% | 🟡 | M3.8 documentado (ADR-016), implementação pendente |
| **Memória & Conhecimento** | 85% | 🟢 | M1.3-M1.6 bem implementado, captura automática funciona |
| **Chat-First/Baixo Atrito** | 85% | 🟢 | ADR-015 resolve bem |
| **Dashboard & Relatórios** | 70% | 🟡 | Estrutura ok, implementação pendente |
| **Cobertura de Áreas de Vida** | 50% | 🔴 | Educação 0%, CRM básico, Carreira não existe |
| **MÉDIA GERAL** | **73%** | 🟡 | **Fundação sólida, gaps em áreas de vida** |

> **Nota sobre Cobertura:** Das 8 áreas de vida definidas em `product.md` §3:
> - ✅ Saúde: M2.1 (tracking básico)
> - ✅ Financeiro: M2.6 (Finance completo)
> - ✅ Saúde Mental: M2.1 (mood, energy)
> - 🟡 Relacionamentos: M3.4 (CRM básico, sem intelligence)
> - ❌ Crescimento Pessoal: 0% implementado (educação)
> - ❌ Carreira: 0% implementado
> - ❌ Espiritualidade: apenas knowledge_items genérico
> - ❌ Lazer: 0% implementado

---

## 🎯 CONCLUSÃO

### O que está BOM:
- Arquitetura técnica excelente (Clean Architecture, Tool Use, Memory Consolidation)
- ADR-015 resolve filosofia de tracking de baixo atrito
- Sistema de memória (M1.3-M1.6) é robusto
- Chat-first funciona bem
- **IA proativa durante conversas** — `analyze_context` (M1.6) faz inferências em tempo real
- **Captura automática de conhecimento** — `add_knowledge` salva sem pedir, Memory Consolidation extrai padrões
- **Correlação entre áreas** — `analyze_context` + `get_trends` (M2.2) cobrem análise qualitativa e estatística
- **Decision Support documentado** — M3.8 com ADR-016

### O que está FALTANDO:

#### 1. Educação/Aprendizado (Gap Crítico)
- **Documentação:** 100% especificado em `product.md` §6.11 (13 features)
- **Código:** 0% implementado
- **Impacto:** Área "Crescimento Pessoal" sem tracking estruturado
- **Solução:** Implementar M4.3 (~80-120h)

#### 2. CRM sem Relationship Intelligence
- **Documentação:** 100% especificado em `product.md` §6.5 (12 features)
- **Schema:** 100% implementado (3 tabelas, 2 enums)
- **API/Frontend:** 0% implementado (M3.4 não iniciado)
- **Relationship Intelligence:** 0% especificado (não existe em nenhum doc)
- **Impacto:** CRM básico atende armazenamento, mas IA não consegue aconselhar sobre relacionamentos
- **Solução:** Implementar M3.4 primeiro (~60-80h), depois considerar M3.4b Intelligence (~40-60h)

### Para ser o "Hub da Sua Mente" + "JARVIS-First":

| Gap | Docs | Código | Esforço | Milestone |
|-----|------|--------|---------|-----------|
| **Educação/Aprendizado** | ✅ 100% | ❌ 0% | 80-120h | M4.3 (novo) |
| **CRM Básico** | ✅ 100% | ⚠️ Schema only | 60-80h | M3.4 (existente) |
| **Relationship Intelligence** | ❌ 0% | ❌ 0% | 40-60h | M3.4b (novo) |
| **Carreira/Profissional** | ⚠️ Parcial | ❌ 0% | 60-80h | M3.9 (novo) |
| **Lazer & Recreação** | ⚠️ Parcial | ❌ 0% | 30-40h | M4.1 (novo) |

> **Nota:** M3.4 (CRM Básico) já está no roadmap e tem schema pronto. Relationship Intelligence seria uma extensão futura.

---

## Próximos Passos Sugeridos

### Imediato (antes de V1)
1. **Decidir prioridade de Educação** — M4.3 entra no V1 ou fica para V2?
2. **Se V1:** Criar milestone M4.3 completo em `phase-4-backlog.md`

### Após V1
3. **Relationship Intelligence** — Expandir M3.4 com detecção de padrões
4. **Carreira/Profissional** — Criar M3.9 se houver demanda

### Decisões Pendentes
| Decisão | Opções | Impacto |
|---------|--------|---------|
| Educação em V1? | Sim / Não | +80-120h se sim |
| CRM Intelligence em V1? | Sim / Não | +40-60h se sim |
| Criar Phase 4 file? | Sim / Não | Organização do backlog |

---

> **Este arquivo é temporário para análise. Após decisões, mover itens relevantes para milestones e excluir.**
