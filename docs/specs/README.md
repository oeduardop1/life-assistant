# Life Assistant AI - Especificações

> Documentação técnica e funcional do produto.
> Para tarefas de desenvolvimento, ver `docs/milestones/`.

---

## Precedência em caso de conflito

- Escopo/features: `docs/specs/README.md`
- Regras/fluxos/DoD: `docs/specs/domains/*` e `docs/specs/core/*`
- Tech/infra: `docs/specs/core/architecture.md`
- Modelo de dados: `docs/specs/core/data-conventions.md`
- IA/Prompts: `docs/specs/core/ai-personality.md`
- Integrações: `docs/specs/integrations/*`
- Priorização: `docs/milestones/`
- Pendências: `TBD_TRACKER.md`

---

## Visão Geral

### O que é

Uma plataforma SaaS com IA integrada que funciona como:

- **Memória** — Armazena e organiza automaticamente tudo sobre a vida do usuário
- **Conselheira** — Ajuda a pensar, analisar situações e tomar decisões
- **Assistente Pessoal** — Executa tarefas, agenda compromissos, organiza informações
- **Tracker de Evolução** — Mede progresso em todas as áreas da vida

A IA conhece profundamente o usuário: seu passado, presente, objetivos futuros, valores, problemas atuais e histórico de decisões. Toda interação é contextualizada por essa memória.

### Problema que resolve

**Sem um sistema integrado, o usuário:**

- Usa ferramentas fragmentadas (planilhas, apps de hábitos, agendas)
- Perde contexto entre conversas com IAs genéricas
- Não consegue ver padrões na própria vida ao longo do tempo
- Toma decisões sem considerar todo o contexto disponível
- Não tem quem o ajude a pensar com profundidade sobre problemas complexos
- Esquece compromissos, metas e aprendizados passados

**Dor específica com gestão de conhecimento pessoal:**

- IAs genéricas não lembram de conversas anteriores
- Precisa repetir contexto toda vez que conversa
- Não há aprendizado contínuo sobre o usuário
- Informações importantes ficam perdidas no histórico

### Proposta de valor

**"Você só conversa. A IA organiza, lembra, aconselha e age."**

| Antes (Manual) | Depois (Life Assistant) |
|----------------|-------------------------|
| Você repete contexto toda conversa | IA lembra tudo sobre você |
| Você precisa organizar | IA organiza automaticamente |
| Você lembra de registrar | IA extrai informações das conversas |
| Você busca informações | IA traz contexto relevante |
| Você analisa sozinho | IA ajuda a pensar |
| Você gerencia agenda manualmente | IA agenda por comando natural |
| Você usa múltiplos apps | Tudo em um só lugar |

### Diferenciais

1. **Memória Persistente** — A IA lembra de TUDO sobre o usuário
2. **Zero Atrito** — Interação natural por chat (Telegram/WhatsApp) e dashboard (Web)
3. **Perspectiva Cristã** — Princípios bíblicos integrados ao aconselhamento (opcional)
4. **Visão Holística** — Todas as áreas da vida conectadas e visíveis
5. **Transparência** — Você vê o que a IA sabe sobre você e pode corrigir
6. **Rastreabilidade** — Todo número e insight é explicável e rastreável
7. **Histórico de Decisões** — Acompanhamento de decisões importantes com follow-up e aprendizado

### North Star

**"Em qualquer momento, você consegue ver exatamente onde está na vida, como chegou aqui, e ter ajuda inteligente para decidir os próximos passos."**

---

## Os Três Modos da IA

A IA opera em três modos que compartilham a mesma memória e contexto.

### Modo Conselheira

**Propósito:** Ajudar o usuário a pensar melhor e tomar decisões com mais clareza.

**Comportamentos:**
- Escuta ativamente e faz perguntas reflexivas
- Traz contexto relevante do histórico do usuário
- Apresenta múltiplas perspectivas sobre uma situação
- Organiza prós e contras de forma estruturada
- Identifica padrões de comportamento e decisões passadas
- Aplica princípios bíblicos quando relevante (se habilitado)
- Nunca decide pelo usuário; ilumina a decisão
- **Oferece salvar decisões importantes** para acompanhamento futuro (ADR-016)
- **Consulta histórico de decisões** similares para contextualizar conselhos
- **Agenda follow-up** automático para avaliar resultados (30 dias default)

**Exemplos de uso:**
- "Me ajuda a decidir se aceito essa proposta de emprego"
- "Estou em dúvida sobre mudar de cidade"
- "Tive um conflito com meu sócio, como devo abordar?"
- "Como foi aquela decisão que tomei mês passado?"

### Modo Assistente

**Propósito:** Executar tarefas práticas e organizar informações.

**Comportamentos:**
- Agenda compromissos por comando natural
- Busca informações no histórico do usuário
- Prepara resumos (ex: histórico médico para consulta)
- Cria lembretes inteligentes (simples, recorrentes, contextuais)
- Planeja roteiros de viagem personalizados
- Organiza informações pessoais (Vault)
- Responde perguntas sobre a própria vida do usuário
- Gerencia checklists e projetos

**Exemplos de uso:**
- "Marca dentista quarta às 15h"
- "Quanto gastei com alimentação esse mês?"
- "Prepara um resumo do meu histórico médico para a consulta de amanhã"
- "Monta um roteiro de 5 dias em Portugal considerando que viajo com crianças"

### Modo Tracker

**Propósito:** Medir, acompanhar e visualizar a evolução do usuário em todas as áreas.

**Filosofia:** Baixo atrito (ADR-015). O tracking acontece naturalmente via conversa quando o usuário menciona métricas. Dashboard manual disponível para quem prefere controle direto.

**Comportamentos:**
- **Captura conversacional:** Detecta métricas mencionadas naturalmente e pede confirmação antes de registrar
- **Dashboard opcional:** Permite registro manual por formulários (para quem prefere)
- Calcula scores por área da vida (quando há dados)
- Gera relatórios periódicos (semanal, mensal, trimestral, anual)
- Identifica tendências e padrões (quando há dados suficientes)
- Celebra conquistas e marcos
- Sistema funciona normalmente sem nenhum tracking ativo

**Fluxo de captura conversacional:**
```
Usuário: "Voltei da academia, fiz 45 minutos de musculação"
IA: "Ótimo treino! Quer que eu registre: 45min de musculação?"
Usuário: "Sim"
IA: "Registrado! Você já treinou 3x essa semana"
```

**Exemplos de uso:**
- "Fui ao médico, estou com 82kg" → IA oferece registrar peso (com confirmação)
- "Treinei peito e tríceps hoje, 45 minutos" → IA oferece registrar exercício
- "Como estou evoluindo na área financeira?" → Dashboard/relatórios
- Dashboard opcional para registro manual e visualização

---

## Áreas da Vida

| Área | Código | Ícone | Sub-áreas | Métricas (quando registradas) |
|------|--------|-------|-----------|-------------------------------|
| **Saúde** | `health` | 💪 | physical, mental, leisure | Peso, treinos, sono, humor, lazer |
| **Finanças** | `finance` | 💰 | budget, savings, debts, investments | Orçamento, patrimônio, investimentos |
| **Profissional** | `professional` | 🏢 | career, business | Faturamento, clientes, metas |
| **Aprendizado** | `learning` | 📚 | formal, informal | Livros lidos, horas de estudo, cursos |
| **Espiritual** | `spiritual` | ⛪ | practice, community | Leitura bíblica, reflexões, comunidade |
| **Relacionamentos** | `relationships` | 👥 | family, romantic, social | Tempo de qualidade (auto-reportado) |

> **Nota (ADR-015):** Nenhuma métrica é obrigatória. O sistema funciona sem tracking ativo.
> Quando o usuário menciona métricas em conversa, a IA oferece registrar com confirmação.
> Dashboard manual disponível para usuários que preferem registrar ativamente.

### Conexões entre Áreas

As áreas são interconectadas. A IA identifica e destaca essas conexões:

- "Nas semanas com menos de 7h de sono (Saúde), seus gastos impulsivos (Financeiro) aumentam 30%"
- "Quando você mantém o devocional diário (Espiritual) acima de 80%, seu score de bem-estar sobe"
- "Decisões profissionais afetando tempo familiar detectadas 3x este mês"

### Pesos Configuráveis

O usuário pode ajustar a importância de cada área para seu contexto. Os pesos influenciam o cálculo do score geral de vida.

---

## Personas

### Persona Primária: Profissional que Busca Crescimento

**Perfil:**
- 25-45 anos, profissional ou empreendedor
- Busca desenvolvimento pessoal e organização
- Valoriza dados e métricas
- Quer tomar decisões melhores
- Usa tecnologia no dia a dia

**Jobs-to-be-done:**
- "Quero ter clareza sobre todas as áreas da minha vida em um só lugar"
- "Quero ajuda para tomar decisões importantes"
- "Quero trackear minha evolução sem esforço"
- "Quero uma IA que me conhece e lembra de tudo"

**Dores:**
- Ferramentas de organização geram atrito
- IAs genéricas não conhecem seu contexto
- Informações fragmentadas em vários apps
- Não consegue ver padrões na própria vida

### Persona Secundária: Cristão Praticante

**Perfil adicional:**
- Quer integrar fé e vida prática
- Valoriza princípios bíblicos nas decisões
- Quer crescer espiritualmente de forma consistente

**Jobs-to-be-done adicionais:**
- "Quero princípios bíblicos integrados ao meu dia a dia"
- "Quero manter consistência no devocional"
- "Quero que minha fé influencie minhas decisões"

### Segmentos de Mercado

| Segmento | Características | Features Prioritárias |
|----------|-----------------|----------------------|
| **Empreendedor** | Foco em negócio, múltiplos projetos | Métricas de empresa, clientes, financeiro |
| **CLT Executivo** | Carreira corporativa, família | Agenda, decisões de carreira, família |
| **Estudante/Jovem** | Aprendizado, início de carreira | Estudos, hábitos, metas |
| **Cristão** | Integração fé-vida | Devocional, perspectiva bíblica |

---

## Interfaces

### Web App (Dashboard)

**Propósito:** Visualização, análise, configurações e conversas.

**Uso típico:** 1-2x por dia (manhã para planejar, noite para revisar)

**Telas principais:**

| Tela | Função |
|------|--------|
| **Dashboard** | Visão geral: scores, destaques, pendências, alertas |
| **Chat** | Conversas com a IA (todos os modos) |
| **Memória** | O que a IA sabe sobre você (fatos, preferências, insights) |
| **Áreas** | Dashboard detalhado por área da vida |
| **Tracking** | Registro manual e visualização de métricas |
| **Decisões** | Histórico de decisões importantes com follow-up e aprendizados |
| **Pessoas** | CRM pessoal (contatos, relacionamentos) |
| **Vault** | Informações pessoais seguras |
| **Relatórios** | Semanais, mensais, trimestrais, anuais |
| **Metas** | Objetivos e hábitos com progresso |
| **Configurações** | Preferências, integrações, plano, exportação |

**Responsividade:** Funciona em desktop, tablet e mobile (PWA).

### Telegram Bot

**Propósito:** Interação rápida e frequente no dia a dia.

**Uso típico:** Várias vezes ao dia

**Tipos de interação:**
- **Comandos rápidos** — Registrar métricas (peso, gastos, treino)
- **Consultas** — Verificar agenda, gastos, metas
- **Ações** — Agendar eventos, criar lembretes
- **Conversas** — Modo conselheira para discussões mais longas

> Detalhes de comandos e sintaxe em `docs/specs/integrations/telegram.md`.

### WhatsApp Business

**Propósito:** Alternativa ao Telegram para usuários que preferem WhatsApp.

**Funcionalidade:** Mesmas capacidades do Telegram Bot.

### Notificações Proativas

**Canais:** Push (Web/PWA), Telegram/WhatsApp, Email

**Tipos:**
- Resumo da manhã (agenda + lembretes)
- Alertas de métricas fora do padrão
- Lembretes configurados
- Check-ins proativos da IA
- Celebração de conquistas

---

## Perspectiva Cristã

### Configuração

A perspectiva cristã é **opt-in** nas configurações:
- **Desabilitado** — IA não menciona aspectos religiosos
- **Habilitado** — IA integra princípios bíblicos quando relevante

**Quando habilitado, aplica-se em:**
- Momentos de dificuldade
- Celebração de conquistas (gratidão)

### Como a IA Aplica

A IA não apenas cita versículos, mas aplica sabedoria bíblica contextualmente:
- Traz o **princípio**, não só o versículo
- **Contextualiza** para a situação específica
- **Nunca impõe**; oferece perspectiva
- Respeita a **liberdade de decisão** do usuário
- Não é "pregação", é sabedoria aplicada

### Exemplos de Aplicação

**Decisão financeira:**
> "Você está considerando esse investimento de alto risco com todo seu capital. Provérbios 21:5 fala que 'os planos bem pensados levam à prosperidade, mas a pressa leva à pobreza'. Talvez valha diversificar e ir aos poucos?"

**Conflito profissional:**
> "Antes de responder ao email do Fulano, lembra de Provérbios 15:1: 'a resposta calma desvia a fúria'. Como você poderia abordar isso de forma que resolva sem escalar?"

**Sobrecarga de trabalho:**
> "Você mencionou trabalhar até tarde pela terceira vez essa semana. Até Jesus se retirava para descansar (Marcos 6:31). Seu corpo e família precisam de você presente e inteiro."

**Ansiedade com o futuro:**
> "Entendo a preocupação com essa incerteza. Filipenses 4:6-7 nos lembra de apresentar nossos pedidos a Deus com gratidão. Isso não significa ignorar o problema, mas não carregar o peso sozinho."

### Features Espirituais

- Tracking de devocional com streak
- Plano de leitura bíblica
- Reflexões espirituais (integradas à Memória)
- Registro de orações (pedidos e respostas)
- Dízimos e ofertas
- Frequência na igreja

---

## Sistema de Scores

### Conceito

Cada área da vida recebe um **score de 0 a 10** que indica o estado atual baseado em:
- **Consistência** — % de dias com tracking ativo
- **Metas** — Progresso em metas da área
- **Tendência** — Melhorando ou piorando
- **Baseline** — Comparativo com média histórica

### Score Geral

O **Score Geral de Vida** é uma média ponderada das áreas. Os pesos são configuráveis pelo usuário.

### Interpretação

| Faixa | Significado | Cor |
|-------|-------------|-----|
| 9.0 - 10.0 | Excelente | 🟢 Verde |
| 7.5 - 8.9 | Bom | 🟢 Verde claro |
| 6.0 - 7.4 | Adequado | 🟡 Amarelo |
| 4.0 - 5.9 | Atenção | 🟠 Laranja |
| 0.0 - 3.9 | Crítico | 🔴 Vermelho |

> Regras detalhadas de cálculo em `docs/specs/domains/tracking.md`.

---

## Navegação

### Core (Documentos Transversais)

| Documento | Descrição |
|-----------|-----------|
| [architecture.md](core/architecture.md) | Stack, padrões de código, testes, Docker |
| [api-contract.md](core/api-contract.md) | Inventário de endpoints, auth, paginação, envelopes |
| [errors.md](core/errors.md) | Padrão de erros e códigos HTTP |
| [frontend-architecture.md](core/frontend-architecture.md) | Arquitetura frontend + design system |
| [auth-security.md](core/auth-security.md) | Autenticação, RLS, LGPD, criptografia |
| [data-conventions.md](core/data-conventions.md) | Convenções de banco, naming, migrations |
| [ai-personality.md](core/ai-personality.md) | Persona da IA, prompts base, Tool Use (ADR-012) |
| [user-journeys.md](core/user-journeys.md) | Jornadas de usuário detalhadas |
| [ux-states.md](core/ux-states.md) | Empty/loading/error states, confirmações |
| [realtime.md](core/realtime.md) | SSE/Realtime, eventos, reconexão |
| [observability.md](core/observability.md) | Logs, tracing, runbooks, incidentes |
| [data-import.md](core/data-import.md) | Importação CSV/JSON, validação, fluxo |

### Domains (Módulos Funcionais)

| Documento | Milestone | Descrição |
|-----------|-----------|-----------|
| [finance.md](domains/finance.md) | M2.2 | Rendas, contas, despesas, dívidas, investimentos |
| [memory.md](domains/memory.md) | M1.7 | Knowledge Items, Memory Consolidation (ADR-012) |
| [notes.md](domains/notes.md) | M1.x | Notas estruturadas, resumos e relatórios |
| [tracking.md](domains/tracking.md) | M1.3 | Life Balance Score, métricas (ADR-015, ADR-017) |
| [decisions.md](domains/decisions.md) | M1.11 | Suporte a decisões, follow-up (ADR-016) |
| [people.md](domains/people.md) | M1.6 | CRM pessoal, relacionamentos |
| [vault.md](domains/vault.md) | M1.8 | Informações sensíveis, criptografia |
| [goals-habits.md](domains/goals-habits.md) | M1.9 | Metas, hábitos, streaks |
| [notifications.md](domains/notifications.md) | M1.10 | Alertas, relatórios, lembretes |
| [chat.md](domains/chat.md) | M1.2 | Conversação com IA, histórico |
| [assistant-agenda.md](domains/assistant-agenda.md) | M3.x | Calendário, lembretes, planejamento |
| [health.md](domains/health.md) | M2.x | Métricas corporais, exercício, sono, saúde mental |
| [professional.md](domains/professional.md) | M2.x | Carreira, projetos, networking, OKRs |
| [family.md](domains/family.md) | M2.x | Membros, árvore familiar, tempo de qualidade |
| [spiritual.md](domains/spiritual.md) | M2.x | Devocional, leitura bíblica, orações |
| [learning.md](domains/learning.md) | M2.x | Livros, cursos, certificações, horas de estudo |
| [wellbeing.md](domains/wellbeing.md) | M2.x | Estresse, satisfação, hobbies, gratidão |
| [dashboard.md](domains/dashboard.md) | M2.x | Widgets, visualizações, Life Balance Score |
| [reports.md](domains/reports.md) | M2.x | Morning summary, relatórios periódicos |
| [saas.md](domains/saas.md) | M3.x | Registro, planos, billing, suporte |

### Integrations (APIs Externas)

| Documento | Status | Descrição |
|-----------|--------|-----------|
| [README.md](integrations/README.md) | - | Overview, padrões comuns |
| [supabase-auth.md](integrations/supabase-auth.md) | ✅ Produção | Autenticação OAuth |
| [google-calendar.md](integrations/google-calendar.md) | ✅ Produção | Sincronização de agenda |
| [telegram.md](integrations/telegram.md) | ✅ Produção | Bot para interação |
| [whatsapp.md](integrations/whatsapp.md) | ⚪ Futuro | WhatsApp Business (Cloud API) |
| [stripe.md](integrations/stripe.md) | 🟡 Em dev | Pagamentos e assinaturas |
| [gemini.md](integrations/gemini.md) | ✅ Produção | LLM provider |
| [cloudflare-r2.md](integrations/cloudflare-r2.md) | ✅ Produção | Armazenamento de arquivos |
| [resend.md](integrations/resend.md) | 🟡 Planejado | Email transacional |
| [web-push.md](integrations/web-push.md) | 🟡 Planejado | Push notifications (Web) |
| [apple-calendar.md](integrations/apple-calendar.md) | ⚪ Futuro | Apple Calendar (ICS/CalDAV) |

### Legacy (Arquivos Originais)

Arquivos originais mantidos para referência histórica:

- [product.md](legacy/product.md) — Especificação funcional original
- [system.md](legacy/system.md) — Regras de negócio original
- [engineering.md](legacy/engineering.md) — Especificação técnica original
- [data-model.md](legacy/data-model.md) — Modelo de dados original
- [ai.md](legacy/ai.md) — Especificação de IA original
- [integrations.md](legacy/integrations.md) — Integrações original

---

## Planos e Monetização

### Estrutura de Planos

| Recurso | Free | Pro | Premium |
|---------|------|-----|---------|
| Mensagens/mês | 100 | Ilimitado | Ilimitado |
| Histórico | 30 dias | 1 ano | Ilimitado |
| Áreas da vida | 3 | Todas | Todas |
| Telegram/WhatsApp | ✓ | ✓ | ✓ |
| Dashboard básico | ✓ | ✓ | ✓ |
| Dashboard completo | - | ✓ | ✓ |
| Memória | Limitado | Completo | Completo |
| Insights automáticos | - | ✓ | ✓ |
| Relatórios | Semanal | Todos | Todos |
| Integrações (Calendar) | - | ✓ | ✓ |
| Vault | - | ✓ | ✓ |
| CRM de pessoas | Limitado | Completo | Completo |
| Alertas proativos | - | Básico | Avançado |
| Modelo de IA | Básico | Avançado | Premium |
| Exportação | - | ✓ | ✓ |
| Suporte | Comunidade | Email | Prioritário |

### Métricas SaaS

| Métrica | Descrição |
|---------|-----------|
| MRR | Receita recorrente mensal |
| Churn | Taxa de cancelamento |
| LTV | Lifetime value do cliente |
| CAC | Custo de aquisição |
| DAU/MAU | Usuários ativos diários/mensais |
| Conversão Free→Pago | % que faz upgrade |
| NPS | Satisfação do cliente |

---

## Métricas de Sucesso do Produto

### Engajamento

| Métrica | Meta |
|---------|------|
| DAU/MAU | > 40% |
| Mensagens/dia por usuário | > 10 |
| Sessões web/semana | > 5 |
| Tracking rate | > 70% dos dias |
| Feature adoption | > 60% |

### Valor

| Métrica | Meta |
|---------|------|
| Time to value | < 5 min |
| Onboarding completion | > 80% |
| Itens na Memória | > 20/mês |
| Score improvement | Positivo |

### Qualidade

| Métrica | Meta |
|---------|------|
| Uptime | > 99.5% |
| Response time (IA) | < 3s |
| Response time (API) | < 500ms |
| Error rate | < 1% |
| Contexto relevante | > 90% |

---

## Glossário

### Conceitos de Produto

| Termo | Definição |
|-------|-----------|
| **Memória** | Sistema de conhecimento gerenciado automaticamente pela IA (ADR-012) |
| **Knowledge Item** | Fato, preferência, insight ou memória sobre o usuário |
| **Confidence** | Nível de certeza da IA sobre uma informação (alta/média/baixa) |
| **Memory Consolidation** | Job que extrai conhecimento das conversas a cada 24h |
| **Vault** | Área segura para informações sensíveis (documentos, credenciais) |
| **Score** | Pontuação de 0-10 que indica o estado de uma área da vida |
| **Streak** | Sequência de dias consecutivos realizando uma atividade |
| **Área da Vida** | 6 áreas principais (health, finance, professional, learning, spiritual, relationships) e sub-áreas; UI também expõe 8 categorias (Saúde, Financeiro, Profissional, Relacionamentos, Espiritual, Crescimento Pessoal, Saúde Mental, Lazer) |
| **Tracking** | Registro sistemático de métricas ao longo do tempo |
| **PR (Personal Record)** | Recorde pessoal em exercício físico |
| **Check-in Proativo** | Quando a IA inicia conversa para verificar status |
| **Perspectiva Cristã** | Feature opcional que integra princípios bíblicos |
| **Decision Follow-up** | Acompanhamento automático de decisões (ADR-016) |
| **Morning Summary** | Resumo matinal enviado pela IA com agenda e alertas |
| **Life Balance Score** | Score agregado que representa o equilíbrio geral da vida |

### Conceitos Técnicos

| Termo | Definição |
|-------|-----------|
| **Tool Use** | Arquitetura onde a IA decide quando buscar/atualizar dados |
| **Tool Loop** | Ciclo onde LLM chama tools iterativamente até completar a tarefa |
| **Context Builder** | Componente que monta o contexto para chamadas LLM |
| **Guardrails** | Regras que limitam o comportamento da IA para segurança |
| **RLS** | Row Level Security - políticas de segurança por linha no PostgreSQL |
| **Multi-tenant** | Arquitetura onde múltiplos usuários compartilham infraestrutura mas têm dados isolados |
| **Lazy Generation** | Padrão onde itens recorrentes são gerados sob demanda, não antecipadamente |

### Conceitos de Integração

| Termo | Definição |
|-------|-----------|
| **Webhook** | URL que recebe notificações de eventos externos |
| **OAuth** | Protocolo de autorização para acesso a APIs externas |
| **Refresh Token** | Token para obter novos access tokens sem re-autenticar |
| **Presigned URL** | URL temporária com permissão de acesso a arquivo |
| **Rate Limit** | Limite de requisições por período de tempo |
| **Backoff** | Estratégia de aumentar delay entre retries após falhas |
| **Idempotency** | Propriedade onde operação pode ser repetida sem efeitos colaterais |

### Conceitos de Negócio

| Termo | Definição |
|-------|-----------|
| **MRR** | Monthly Recurring Revenue - receita recorrente mensal |
| **Churn** | Taxa de cancelamento de assinaturas |
| **LTV** | Lifetime Value - valor do cliente ao longo do tempo |
| **CAC** | Customer Acquisition Cost - custo de aquisição |
| **DAU/MAU** | Daily/Monthly Active Users - usuários ativos |
| **NPS** | Net Promoter Score - métrica de satisfação |
| **Trial** | Período de teste gratuito do plano pago |

### ADRs (Architecture Decision Records)

| ADR | Título | Resumo |
|-----|--------|--------|
| ADR-012 | Tool Use + Memory Consolidation | IA usa tools ao invés de RAG para buscar dados |
| ADR-015 | Low-Friction Tracking | Tracking opcional, sistema funciona sem métricas |
| ADR-016 | Decision Support | Suporte a decisões importantes com follow-up |
| ADR-017 | Life Areas | 6 áreas principais, 17 sub-áreas |

---

*Última atualização: 26 Janeiro 2026*
