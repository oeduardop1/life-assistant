# PRODUCT_SPECS.md — Life Assistant AI
> **Documento de especificação funcional (Produto).**  
> Define **O QUE** a aplicação é, faz e para quem.  
> Para **COMO** funciona tecnicamente, ver `SYSTEM_SPECS.md` e `ENGINEERING.md`.  
> Para priorização de desenvolvimento, ver `MILESTONES.md`.

---

## Precedência em caso de conflito
- Escopo/features: `PRODUCT_SPECS.md`
- Regras/fluxos/DoD: `SYSTEM_SPECS.md`
- Tech/infra: `ENGINEERING.md`
- Modelo de dados: `DATA_MODEL.md`
- IA/Prompts: `AI_SPECS.md`
- Integrações: `INTEGRATIONS_SPECS.md`
- Priorização: `MILESTONES.md`
- Pendências: `TBD_TRACKER.md`

---

## 1) Visão Geral

### 1.1 O que é

Uma plataforma SaaS com IA integrada que funciona como:

- **Segundo Cérebro** — Armazena e organiza automaticamente tudo sobre a vida do usuário
- **Conselheira** — Ajuda a pensar, analisar situações e tomar decisões
- **Assistente Pessoal** — Executa tarefas, agenda compromissos, organiza informações
- **Tracker de Evolução** — Mede progresso em todas as áreas da vida

A IA conhece profundamente o usuário: seu passado, presente, objetivos futuros, valores, problemas atuais e histórico de decisões. Toda interação é contextualizada por essa memória.

### 1.2 Problema que resolve

**Sem um sistema integrado, o usuário:**

- Usa ferramentas fragmentadas (Obsidian, planilhas, apps de hábitos, agendas)
- Perde contexto entre conversas com IAs genéricas
- Tem atrito para manter um "segundo cérebro" (criar notas, tags, links)
- Não consegue ver padrões na própria vida ao longo do tempo
- Toma decisões sem considerar todo o contexto disponível
- Não tem quem o ajude a pensar com profundidade sobre problemas complexos
- Esquece compromissos, metas e aprendizados passados

**Dor específica com ferramentas de notas (Obsidian, Notion, etc.):**
- Complexidade excessiva gera atrito
- Precisa pensar em estrutura, tags, links manualmente
- Acaba procrastinando e não registrando informações importantes
- Perde o benefício do segundo cérebro por falta de consistência
- Precisa alternar entre múltiplos apps

### 1.3 Proposta de valor

**"Você só conversa. A IA organiza, lembra, aconselha e age."**

| Antes (Manual) | Depois (Life Assistant) |
|----------------|-------------------------|
| Você cria notas | IA cria automaticamente |
| Você adiciona tags | IA categoriza |
| Você cria links | IA conecta contextos |
| Você lembra de registrar | IA captura das conversas |
| Você busca informações | IA traz contexto relevante |
| Você analisa sozinho | IA ajuda a pensar |
| Você gerencia agenda manualmente | IA agenda por comando natural |
| Você usa múltiplos apps | Tudo em um só lugar |

### 1.4 Diferenciais

1. **Memória Persistente** — A IA lembra de TUDO sobre o usuário
2. **Zero Atrito** — Interação natural por chat (Telegram/WhatsApp) e dashboard (Web)
3. **Perspectiva Cristã** — Princípios bíblicos integrados ao aconselhamento (opcional)
4. **Visão Holística** — Todas as áreas da vida conectadas e visíveis
5. **Segundo Cérebro Integrado** — Graph view, backlinks e notas sem precisar de app externo
6. **Rastreabilidade** — Todo número e insight é explicável e rastreável

### 1.5 North Star

**"Em qualquer momento, você consegue ver exatamente onde está na vida, como chegou aqui, e ter ajuda inteligente para decidir os próximos passos."**

---

## 2) Os Três Modos da IA

A IA opera em três modos que compartilham a mesma memória e contexto:

### 2.1 Modo Conselheira

**Propósito:** Ajudar o usuário a pensar melhor e tomar decisões com mais clareza.

**Comportamentos:**
- Escuta ativamente e faz perguntas reflexivas
- Traz contexto relevante do histórico do usuário
- Apresenta múltiplas perspectivas sobre uma situação
- Organiza prós e contras de forma estruturada
- Identifica padrões de comportamento e decisões passadas
- Aplica princípios bíblicos quando relevante (se habilitado)
- Nunca decide pelo usuário; ilumina a decisão

**Exemplos de uso:**
- "Me ajuda a decidir se aceito essa proposta de emprego"
- "Estou em dúvida sobre mudar de cidade"
- "Tive um conflito com meu sócio, como devo abordar?"

### 2.2 Modo Assistente

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

### 2.3 Modo Tracker

**Propósito:** Medir, acompanhar e visualizar a evolução do usuário em todas as áreas.

**Comportamentos:**
- Registra métricas de forma passiva (extraindo de conversas)
- Permite registro ativo por comandos rápidos
- Calcula scores por área da vida
- Gera relatórios periódicos (semanal, mensal, trimestral, anual)
- Identifica tendências e padrões
- Alerta sobre desvios e riscos
- Celebra conquistas e marcos
- Correlaciona métricas entre diferentes áreas

**Exemplos de uso:**
- "Peso 82.1" → Registra peso
- "Treinei peito e tríceps hoje, 45 minutos"
- "Como estou evoluindo na área financeira?"
- Dashboard mostrando scores e gráficos de evolução

---

## 3) Áreas da Vida

O sistema organiza a vida do usuário em **8 áreas principais** (alinhadas com DATA_MODEL):

| Área | Código | Ícone | Descrição | Métricas Principais |
|------|--------|-------|-----------|---------------------|
| **Saúde** | `health` | 💪 | Física, sono, alimentação, exercício | Peso, treinos, sono, água, exames |
| **Financeiro** | `financial` | 💰 | Renda, gastos, investimentos, patrimônio | Gastos, patrimônio, taxa poupança |
| **Profissional** | `career` | 🏢 | Carreira, negócio, projetos | Faturamento, clientes, metas |
| **Relacionamentos** | `relationships` | 👥 | Família, amigos, networking | Tempo de qualidade, interações |
| **Espiritual** | `spirituality` | ⛪ | Devocional, igreja, crescimento na fé | Consistência, leitura bíblica |
| **Crescimento Pessoal** | `personal_growth` | 📚 | Aprendizado, cursos, livros | Livros lidos, horas de estudo |
| **Saúde Mental** | `mental_health` | 🧠 | Humor, estresse, ansiedade, terapia | Humor, estresse, sessões |
| **Lazer** | `leisure` | 🎮 | Hobbies, férias, diversão, equilíbrio | Horas de lazer, satisfação |

### 3.1 Conexões entre Áreas

As áreas são interconectadas. A IA identifica e destaca essas conexões:

**Exemplos:**
- "Nas semanas com menos de 7h de sono (Saúde), seus gastos impulsivos (Financeiro) aumentam 30%"
- "Quando você mantém o devocional diário (Espiritual) acima de 80%, seu score de bem-estar sobe"
- "Decisões profissionais afetando tempo familiar detectadas 3x este mês"

### 3.2 Pesos Configuráveis

O usuário pode ajustar a importância de cada área para seu contexto. Os pesos influenciam o cálculo do score geral de vida.

---

## 4) Público e Personas

### 4.1 Persona Primária: Profissional que Busca Crescimento

**Perfil:**
- 25-45 anos
- Profissional ou empreendedor
- Busca desenvolvimento pessoal e organização
- Valoriza dados e métricas
- Quer tomar decisões melhores
- Usa tecnologia no dia a dia

**Jobs-to-be-done:**
- "Quero ter clareza sobre todas as áreas da minha vida em um só lugar"
- "Quero ajuda para tomar decisões importantes"
- "Quero trackear minha evolução sem esforço"
- "Quero que meu segundo cérebro se mantenha sozinho"

**Dores:**
- Ferramentas de organização geram atrito
- IAs genéricas não conhecem seu contexto
- Informações fragmentadas em vários apps
- Não consegue ver padrões na própria vida
- Toma decisões sem considerar todo o contexto

### 4.2 Persona Secundária: Cristão Praticante

**Perfil adicional:**
- Cristão que quer integrar fé e vida prática
- Valoriza princípios bíblicos nas decisões
- Quer crescer espiritualmente de forma consistente

**Jobs-to-be-done adicionais:**
- "Quero princípios bíblicos integrados ao meu dia a dia"
- "Quero manter consistência no devocional"
- "Quero que minha fé influencie minhas decisões"

### 4.3 Segmentos de Mercado

| Segmento | Características | Features Prioritárias |
|----------|-----------------|----------------------|
| **Empreendedor** | Foco em negócio, múltiplos projetos | Métricas de empresa, clientes, financeiro |
| **CLT Executivo** | Carreira corporativa, família | Agenda, decisões de carreira, família |
| **Estudante/Jovem** | Aprendizado, início de carreira | Estudos, hábitos, metas |
| **Cristão** | Integração fé-vida | Devocional, perspectiva bíblica |

---

## 5) Interfaces

### 5.1 Web App (Dashboard)

**Propósito:** Visualização, análise, configurações, conversas longas e Segundo Cérebro.

**Uso típico:** 1-2x por dia (manhã para planejar, noite para revisar)

**Telas principais:**

| Tela | Função |
|------|--------|
| **Dashboard** | Visão geral: scores, destaques, pendências, alertas |
| **Chat** | Conversas com a IA (todos os modos) |
| **Segundo Cérebro** | Notas, graph view, backlinks, busca semântica |
| **Decisões** | Lista e gestão de problemas/decisões em aberto |
| **Áreas** | Dashboard detalhado por área da vida |
| **Tracking** | Registro manual e visualização de métricas |
| **Pessoas** | CRM pessoal (contatos, relacionamentos) |
| **Vault** | Informações pessoais seguras |
| **Relatórios** | Semanais, mensais, trimestrais, anuais |
| **Metas** | Objetivos e hábitos com progresso |
| **Configurações** | Preferências, integrações, plano, exportação |

**Responsividade:** Funciona em desktop, tablet e mobile (PWA).

### 5.2 Telegram Bot

**Propósito:** Interação rápida e frequente no dia a dia.

**Uso típico:** Várias vezes ao dia

**Tipos de interação:**
- **Comandos rápidos** — Registrar métricas (peso, gastos, treino)
- **Consultas** — Verificar agenda, gastos, metas
- **Ações** — Agendar eventos, criar lembretes
- **Conversas** — Modo conselheira para discussões mais longas

> Detalhes de comandos e sintaxe em `INTEGRATIONS_SPECS.md`

### 5.3 WhatsApp Business

**Propósito:** Alternativa ao Telegram para usuários que preferem WhatsApp.

**Funcionalidade:** Mesmas capacidades do Telegram Bot.

### 5.4 Notificações Proativas

**Canais:** Push (Web/PWA), Telegram/WhatsApp, Email

**Tipos:**
- Resumo da manhã (agenda + lembretes)
- Alertas de métricas fora do padrão
- Lembretes configurados
- Check-ins proativos da IA
- Celebração de conquistas

---

## 6) Features Completas

### 6.1 Módulo: Chat e Memória

| Feature | Descrição |
|---------|-----------|
| Chat natural | Conversa em linguagem natural com a IA |
| Memória de longo prazo | IA lembra de todas as conversas passadas |
| Busca semântica | Encontra informações por significado, não só palavras |
| Contexto automático | IA traz informações relevantes sem pedir |
| Perfil do usuário | Armazena valores, preferências, estilo de decisão |
| Identificação de padrões | Detecta padrões de comportamento ao longo do tempo |
| Histórico de conversas | Acesso a todas as conversas anteriores |
| Exportação de conversas | Download em .md ou .pdf |

### 6.2 Módulo: Segundo Cérebro

O Segundo Cérebro é um sistema integrado de notas e conhecimento pessoal, inspirado no Obsidian mas totalmente dentro do app.

**Visualização e Navegação:**

| Feature | Descrição |
|---------|-----------|
| Árvore de notas | Navegação por pastas/categorias |
| Visualização de nota | Renderização de Markdown com formatação |
| Graph View | Visualização das conexões entre notas |
| Backlinks | Ver todas as notas que linkam para a nota atual |
| Quick Switcher | Busca rápida para abrir qualquer nota (Cmd+K) |
| Busca full-text | Encontrar texto em todas as notas |
| Busca semântica | Encontrar por significado ("aquela vez que pensei em mudar") |
| Filtros | Por área, período, tags, tipo de nota |

**Notas Automáticas:**

| Feature | Descrição |
|---------|-----------|
| Diário automático | Resumo do dia gerado pela IA |
| Notas de decisões | Criadas automaticamente no ciclo de decisões |
| Notas de pessoas | Atualizadas quando a pessoa é mencionada |
| Notas de áreas | Dashboards por área da vida |
| Notas de conversas | Conversas importantes salvas como nota |
| Aprendizados | Extraídos de livros, cursos, reflexões |

**Notas Manuais:**

| Feature | Descrição |
|---------|-----------|
| Criar nota | Usuário pode criar notas livres |
| Editor Markdown | Editor completo com preview |
| Wikilinks | Criar links entre notas com [[nome]] |
| Tags | Adicionar tags para categorização |
| Templates | Usar templates pré-definidos |

**IA Integrada nas Notas:**

| Feature | Descrição |
|---------|-----------|
| Expandir conteúdo | IA expande um parágrafo ou ideia |
| Resumir nota | IA gera resumo da nota |
| Sugerir links | IA sugere conexões com outras notas |
| Criar links automáticos | IA identifica e cria wikilinks |
| Perguntar sobre nota | "O que eu decidi sobre isso?" |
| Gerar nota de conversa | Transformar chat em nota estruturada |

**Exportação:**

| Feature | Descrição |
|---------|-----------|
| Exportar nota | Download individual em .md |
| Exportar todas | Download de todas as notas em .zip |
| Exportar seleção | Escolher período ou categoria |
| Formato compatível | Obsidian-compatible (frontmatter YAML, wikilinks) |

### 6.3 Módulo: Sistema de Decisões

| Feature | Descrição |
|---------|-----------|
| Registrar decisão/problema | Criar nova decisão a partir de conversa |
| Ciclo de vida | ABERTA → ANALISANDO → DECIDIDA → ARQUIVADA |
| Urgência e prazo | Definir nível de urgência e deadline |
| Associar áreas | Vincular decisão às áreas da vida afetadas |
| Análise estruturada | Prós/contras organizados automaticamente |
| Matriz de decisão | Critérios ponderados para decisões complexas |
| Contexto histórico | IA puxa decisões similares do passado |
| Perspectiva bíblica | Princípios relevantes para a situação (se habilitado) |
| Registro de resultado | Documentar como a decisão se desenrolou |
| Aprendizados | Extrair e armazenar lições aprendidas |
| Lista de pendentes | Ver todas as decisões em aberto com filtros |
| Lembretes de follow-up | IA pergunta sobre resultado após X tempo |
| Nota automática | Decisão vira nota no Segundo Cérebro |

### 6.4 Módulo: Assistente e Agenda

| Feature | Descrição |
|---------|-----------|
| Criar eventos | Agendar compromissos por comando natural |
| Consultar agenda | Ver compromissos de hoje/amanhã/semana/mês |
| Reagendar | Mover compromissos com comando natural |
| Cancelar eventos | Remover da agenda |
| Verificar conflitos | Alertar sobre sobreposições |
| Eventos recorrentes | Criar eventos que repetem |
| Lembretes simples | Criar lembretes por texto |
| Lembretes recorrentes | Lembretes que repetem (diário, semanal, etc.) |
| Lembretes contextuais | "Me lembra de perguntar X na consulta" |
| Lembretes por localização | "Me lembra quando chegar em casa" |
| Planejamento de viagem | Roteiro personalizado considerando preferências |
| Planejamento de projetos | Quebrar projeto em tarefas com prazos |
| Checklists | Listas de tarefas para eventos/projetos |
| Preparar resumos | Ex: histórico médico para consulta |
| Busca no histórico | Encontrar qualquer informação do passado |
| Integração Google Calendar | Sync bidirecional com agenda do Google |

### 6.5 Módulo: Vault (Informações Pessoais)

| Feature | Descrição |
|---------|-----------|
| Documentos pessoais | CPF, RG, passaporte, CNH, certidões |
| Credenciais | Logins e senhas (criptografados) |
| Preferências pessoais | Tamanhos de roupa/calçado, alergias, restrições |
| Contatos importantes | Médicos, advogados, contador, prestadores |
| Planos e seguros | Saúde, dental, seguro auto/vida/residencial |
| Cartões | Informações de cartões (últimos 4 dígitos) |
| Endereços | Residencial, trabalho, entrega |
| Veículos | Placa, RENAVAM, vencimentos |
| Imóveis | Informações de propriedades |
| Busca rápida | "Qual meu número do passaporte?" |

### 6.6 Módulo: Pessoas (CRM Pessoal)

| Feature | Descrição |
|---------|-----------|
| Cadastro de pessoas | Nome, apelido, relacionamento, foto |
| Informações de contato | Telefone, email, redes sociais |
| Aniversários | Data com lembretes automáticos |
| Datas importantes | Casamento, data que conheceu, etc. |
| Notas sobre pessoa | Informações relevantes, preferências |
| Família da pessoa | Cônjuge, filhos (para contexto) |
| Histórico de interações | Menções automáticas em conversas |
| Presentes dados/recebidos | Registro com datas |
| Tags e grupos | Família, trabalho, amigos, igreja, etc. |
| Última interação | Quando falou/viu por último |
| Sugestão de contato | "Faz 3 meses que você não fala com X" |
| Nota automática | Pessoa vira nota no Segundo Cérebro |

### 6.7 Módulo: Saúde

**Métricas Corporais:**
- Peso, gordura corporal, medidas, IMC
- Meta de peso com progresso visual

**Exercícios:**
- Registro de treinos (tipo, duração, exercícios)
- Exercícios detalhados (séries, repetições, carga)
- PRs (recordes pessoais)
- Frequência semanal e volume total
- Integração com Google Fit e Strava

**Nutrição:**
- Registro de refeições
- Calorias e macros (proteína, carboidrato, gordura)
- Consumo de água com meta
- Aderência ao plano alimentar

**Sono:**
- Horas dormidas e qualidade
- Consistência de horários
- Média semanal

**Saúde Médica:**
- Histórico de consultas (data, médico, resultado)
- Cadastro de médicos
- Diagnósticos e tratamentos
- Exames com evolução de marcadores
- Medicamentos em uso e histórico
- Vacinas
- Alertas de exames periódicos
- Preparação automática para consultas

**Saúde Mental:**
- Registro de humor
- Níveis de ansiedade e estresse
- Gatilhos identificados
- Registro de sessões de terapia

### 6.8 Módulo: Financeiro

**Fluxo de Caixa:**
- Registro de gastos e receitas por categoria
- Categorias personalizáveis
- Orçamento mensal com alertas
- Gastos recorrentes (assinaturas, contas fixas)
- Taxa de poupança
- Gráficos de evolução

**Patrimônio:**
- Patrimônio líquido (ativos - passivos)
- Evolução mensal

**Investimentos:**
- Carteira consolidada por classe de ativo
- Rentabilidade por ativo e consolidada
- Aportes mensais
- Diversificação e dividendos

**Dívidas:**
- Lista com credor, valor, juros
- Progresso de quitação
- Controle de parcelas
- Sugestão de priorização

**Metas Financeiras:**
- Reserva de emergência
- Objetivos específicos com prazo e valor
- Progresso visual

**Empresa (para empreendedores):**
- Faturamento e lucro líquido
- Clientes ativos e ticket médio
- Métricas customizadas
- Acompanhamento de impostos

### 6.9 Módulo: Profissional

**Carreira:**
- Cargo atual e histórico profissional
- Evolução salarial
- Conquistas e habilidades
- Certificações com validade

**Projetos:**
- Projetos ativos e concluídos
- Tarefas por projeto
- Deadlines com alertas

**Networking:**
- Contatos profissionais (integrado ao CRM)
- Histórico de interações
- Follow-ups

**Metas Profissionais:**
- OKRs pessoais
- Metas de carreira
- Plano de desenvolvimento

### 6.10 Módulo: Familiar

| Feature | Descrição |
|---------|-----------|
| Membros da família | Cadastro completo |
| Árvore familiar | Visualização de relacionamentos |
| Datas importantes | Aniversários, casamento, etc. |
| Tempo de qualidade | Registro de atividades em família |
| Informações dos filhos | Escola, saúde, marcos de desenvolvimento |
| Tarefas domésticas | Divisão e acompanhamento |
| Orçamento familiar | Separado do pessoal (se aplicável) |
| Calendário familiar | Eventos de todos os membros |
| Metas familiares | Viagens, conquistas juntos |

### 6.11 Módulo: Espiritual

| Feature | Descrição |
|---------|-----------|
| Devocional diário | Tracking de consistência |
| Streak de devocional | Dias consecutivos |
| Plano de leitura bíblica | Com progresso |
| Livro/capítulo atual | Onde parou |
| Versículos importantes | Salvos com contexto |
| Frequência na igreja | Registro de presença |
| Participação em grupos | Célula, ministério, etc. |
| Dízimos e ofertas | Registro com histórico anual |
| Reflexões espirituais | Notas e insights de quiet time |
| Orações | Pedidos e respostas |
| Jejum | Registro de períodos |
| Versículo do dia | Personalizado pelo contexto |

### 6.12 Módulo: Estudos

| Feature | Descrição |
|---------|-----------|
| Livros lidos | Lista com data de conclusão |
| Livros em andamento | Com progresso (%) |
| Livros na fila | Want to read |
| Meta anual de livros | Com progresso |
| Resumos de livros | Notas e aprendizados (integrado ao Segundo Cérebro) |
| Cursos em andamento | Com progresso |
| Cursos concluídos | Histórico |
| Certificações obtidas | Com datas |
| Horas de estudo | Tracking semanal/mensal |
| Meta de horas | Por semana/mês |
| Áreas de estudo | Categorização |
| Aprendizados | Insights extraídos |
| Flashcards | Revisão espaçada |

### 6.13 Módulo: Bem-estar

| Feature | Descrição |
|---------|-----------|
| Nível de estresse | Registro periódico |
| Satisfação geral | Check-in de bem-estar |
| Work-life balance | Avaliação |
| Hobbies | Lista com frequência de prática |
| Tempo de lazer | Tracking |
| Férias | Planejamento e registro |
| Conquistas pessoais | Celebrações |
| Gratidão | Registro diário (opcional) |
| Social | Encontros com amigos |

### 6.14 Módulo: Dashboard e Visualização

| Feature | Descrição |
|---------|-----------|
| Score geral de vida | Média ponderada das áreas (0-10) |
| Score por área | Cálculo individual |
| Comparativo temporal | vs semana/mês/ano anterior |
| Tendências | Indicadores de direção (subindo/descendo) |
| Destaques positivos | Vitórias do período |
| Pontos de atenção | Alertas e riscos |
| Gráficos de evolução | Por métrica selecionada |
| Correlações | Entre áreas diferentes |
| Insights da IA | Padrões identificados |
| Widgets customizáveis | Escolher o que ver |
| Temas | Light/dark mode |

> Regras de cálculo de scores em `SYSTEM_SPECS.md`

### 6.15 Módulo: Metas e Hábitos

**Metas:**
- Criar meta com descrição, valor alvo e prazo
- Tipos: numérica, sim/não, milestone
- Associar à área da vida
- Progresso visual (barra ou %)
- Sub-metas
- Celebração ao atingir
- Histórico de metas

**Hábitos:**
- Criar hábito com frequência (diário, 3x/semana, etc.)
- Check-in para marcar como feito
- Streak (dias consecutivos)
- Melhor streak (recorde)
- Consistência (% de aderência)
- Lembretes em horário específico
- Hábitos em cadeia
- Visualização em calendário

### 6.16 Módulo: Alertas e Proatividade

| Feature | Descrição |
|---------|-----------|
| Alertas de métricas | Quando sair do padrão |
| Alertas de metas | Em risco de não atingir |
| Alertas de orçamento | Gastos acima do limite |
| Alertas de saúde | Exames vencendo, etc. |
| Check-ins proativos | IA inicia conversa para verificar |
| Resumo da manhã | Agenda + lembretes + motivação |
| Resumo da noite | Recap do dia (opcional) |
| Aniversários | Lembrete de pessoas importantes |
| Follow-up de decisões | Perguntar sobre resultado |
| Sugestões de ação | Baseado em padrões |

### 6.17 Módulo: Relatórios

| Feature | Descrição |
|---------|-----------|
| Relatório semanal | Resumo + comparativo + destaques |
| Relatório mensal | Análise completa de todas as áreas |
| Relatório trimestral | Tendências e ajustes de rota |
| Relatório anual | Retrospectiva completa |
| Personalização | Escolher seções incluídas |
| Exportação | PDF, Markdown |
| Envio por email | Automático na frequência escolhida |
| Comparativo YoY | Mesmo período ano anterior |
| Salvar como nota | Relatório vira nota no Segundo Cérebro |

### 6.18 Módulo: SaaS e Multi-tenancy

| Feature | Descrição |
|---------|-----------|
| Cadastro de usuários | Sign-up com email ou social |
| Onboarding guiado | Wizard de configuração inicial |
| Planos de assinatura | Free, Pro, Premium |
| Billing | Integração com gateway de pagamento |
| Trial | Período de teste do plano pago |
| Limites por plano | Mensagens, histórico, features |
| Admin dashboard | Métricas de uso do SaaS |
| Suporte | Sistema de tickets/chat |
| Base de conhecimento | Help center |
| Perspectiva bíblica | Opt-in nas configurações |
| Templates por perfil | Empreendedor, CLT, estudante |
| Importação de dados | De outros apps |
| API pública | Para integrações de terceiros |

---

## 7) User Journeys

### 7.1 Jornada: Primeiro Uso (Onboarding)

```
1. Usuário acessa o site e faz cadastro
2. Escolhe plano (ou inicia trial)
3. Wizard de onboarding:
   a. Nome e informações básicas
   b. Quais áreas quer focar inicialmente
   c. Se quer perspectiva cristã habilitada
   d. Conectar Telegram ou WhatsApp
   e. Conectar Google Calendar (opcional)
4. IA inicia conversa de conhecimento:
   - "Me conta um pouco sobre você..."
   - "Quais são suas principais prioridades agora?"
   - "Tem algum problema ou decisão te preocupando?"
5. Dashboard inicial mostra estrutura (ainda vazia)
6. IA sugere primeiras ações:
   - "Que tal registrar seu peso atual?"
   - "Você tem algum compromisso essa semana?"
```

### 7.2 Jornada: Dia Típico

```
MANHÃ (Telegram/WhatsApp)
07:00 - Recebe resumo do dia:
        "Bom dia! Hoje você tem:
         - 10h: Call com cliente X
         - 15h: Dentista
         Lembretes: Pagar conta de luz
         Seu streak de devocional está em 12 dias 🔥"

07:15 - "Peso 82.1" → "Registrado! Você está 0.3kg abaixo da semana passada 📉"
07:30 - "Fiz devocional" → "Marcado! 13 dias seguidos 🔥"

DURANTE O DIA (Telegram)
10:30 - "A call foi ótima, acho que vamos fechar o contrato"
        → IA registra no contexto do cliente
        
12:00 - "Gastei 45 reais no almoço" → "Registrado em Alimentação. 
         Você está em R$890 de R$1.200 do orçamento do mês."
         
14:00 - "Marca revisão do carro pra próxima segunda 9h"
        → "Agendado: Revisão do carro - Segunda, 13/01 às 9h"
        
16:00 - "Estou pensando em aceitar aquele projeto freelancer..."
        → IA inicia modo conselheira, traz contexto relevante

NOITE (Web App)
21:00 - Abre dashboard:
        - Score do dia: 7.8
        - Destaques: devocional, treino, reunião produtiva
        - Atenção: sono abaixo da média ontem
        
21:15 - Revisa métricas da semana
21:30 - Lê insight: "Você tem dormido em média 6.2h nas 
        últimas 2 semanas. Isso pode estar afetando
        sua produtividade - seus scores profissionais
        caíram 15% no mesmo período."
```

### 7.3 Jornada: Tomando uma Decisão Importante

```
1. Usuário inicia conversa:
   "Recebi uma proposta de emprego da empresa X. 
    Salário 40% maior, mas preciso mudar de cidade."

2. IA reconhece como decisão importante e faz perguntas:
   - "Interessante! Me conta mais sobre a posição?"
   - "O que te atrai além do salário?"
   - "Como sua família se sente sobre mudança?"

3. IA traz contexto do histórico:
   - "Em março você disse que queria mais tempo com a família.
      Como essa mudança afetaria isso?"
   - "Você recusou uma proposta similar em 2024. Na época, disse 
      que foi a decisão certa porque [contexto]. O que mudou?"
   - "Seu score de bem-estar está em 8.2, o maior dos últimos 
      6 meses. Vale considerar o que está contribuindo para isso."

4. IA organiza análise estruturada:
   PRÓS:
   - Salário 40% maior (impacto financeiro de +R$X/ano)
   - Cargo mais senior
   - Empresa maior, mais oportunidades
   
   CONTRAS:
   - Mudança de cidade (família estabelecida aqui)
   - Filhos teriam que trocar de escola
   - Distância da família estendida

5. Se perspectiva cristã habilitada:
   "Provérbios 15:22 diz que 'os planos fracassam por falta 
    de conselho, mas são bem-sucedidos quando há muitos 
    conselheiros.' Você já conversou com as pessoas importantes
    sobre isso? O que seu cônjuge pensa?"

6. IA oferece próximos passos:
   - "Quer que eu crie uma decisão formal para acompanhar?"
   - "Posso montar uma lista de perguntas para fazer à empresa?"
   
7. Usuário decide e comunica: "Decidi recusar"
   → IA registra decisão com todo o contexto
   → Nota criada automaticamente no Segundo Cérebro
   
8. Após 3 meses, IA faz check-in:
   "Faz 3 meses que você recusou a proposta da empresa X.
    Como está se sentindo sobre essa decisão?"
   → Usuário responde, IA registra aprendizados
   → Nota da decisão é atualizada com resultado
```

### 7.4 Jornada: Explorando o Segundo Cérebro

```
1. Usuário acessa "Segundo Cérebro" no menu

2. Vê a árvore de notas:
   📁 Diário
   📁 Decisões
   📁 Pessoas
   📁 Áreas
   📁 Aprendizados

3. Abre o Graph View:
   - Visualiza todas as conexões
   - Nota que "Proposta Empresa X" está conectada a:
     - [[João Silva]] (quem indicou)
     - [[Financeiro]] (impacto)
     - [[Família]] (consideração)
     - [[Decisão: Proposta 2024]] (similar anterior)

4. Clica em "Proposta Empresa X":
   - Vê a nota completa com toda a análise
   - Vê backlinks: 3 notas referenciam esta
   - Vê o resultado e aprendizados

5. Usa Quick Switcher (Cmd+K):
   - Digita "colesterol"
   - Encontra rapidamente a nota de exames

6. Faz busca semântica:
   - "aquela vez que pensei em mudar de carreira"
   - IA encontra conversas e decisões relacionadas

7. Cria nota manual:
   - "Nova ideia de negócio"
   - Adiciona tags e links para pessoas relacionadas
```

### 7.5 Jornada: Preparação para Consulta Médica

```
1. Usuário: "Tenho consulta no cardiologista amanhã, me prepara"

2. IA gera resumo automático:
   
   PREPARAÇÃO PARA CONSULTA - CARDIOLOGISTA
   Data: Amanhã, 15h - Dr. Ricardo
   
   ÚLTIMA CONSULTA
   - 15/07/2025 - Dr. Ricardo
   - Resultado: Ajuste na dosagem do Losartana
   
   MEDICAMENTOS EM USO
   - Losartana 50mg - 1x ao dia (manhã)
   - AAS 100mg - 1x ao dia (almoço)
   
   EXAMES RECENTES
   - Colesterol Total: 195 mg/dL (Out/25) ↓ era 210
   - LDL: 120 mg/dL (Out/25) ↓ era 135
   
   EVOLUÇÃO DO PESO
   - Atual: 82kg | Meta: 78kg | 6 meses atrás: 85kg
   
   SINTOMAS REGISTRADOS NO PERÍODO
   - 12/11: "Senti palpitação após café"
   
   PERGUNTAS PENDENTES
   - Posso fazer musculação mais pesada?
   - Preciso continuar com AAS?

3. "Quer que eu salve como nota ou envie por email?"

4. Após consulta:
   "Como foi a consulta com Dr. Ricardo?"
   → Usuário conta resultado
   → IA atualiza histórico médico
   → Nota da consulta criada no Segundo Cérebro
```

### 7.6 Jornada: Revisão Semanal

```
DOMINGO, 20H - Notificação:
"Seu relatório semanal está pronto! 📊"

RELATÓRIO SEMANAL - 06 a 12 de Janeiro

SCORE GERAL: 7.4/10 (↑ +0.3 vs semana anterior)

POR ÁREA:
💪 Saúde:        7.8 ↑  Treinou 4x, peso estável
💰 Financeiro:   7.0 ↓  Gastos extras com carro
🏢 Profissional: 8.2 ↑  Fechou projeto importante
👨‍👩‍👧 Familiar:     7.5 =  Tempo de qualidade OK
⛪ Espiritual:   9.0 ↑  Devocional 7/7 dias! 🔥
📚 Estudos:      6.0 ↓  Não leu esta semana
😊 Bem-estar:    7.2 =  Estresse moderado

DESTAQUES DA SEMANA 🏆
- Devocional perfeito (7/7 dias)
- Fechou contrato com cliente X
- Peso mais baixo dos últimos 2 meses

PONTOS DE ATENÇÃO ⚠️
- Sono abaixo de 7h em 4 dias
- Nenhuma leitura registrada
- Gasto não planejado: R$450 mecânico

DECISÕES EM ABERTO (2)
- Proposta de parceria com Y (prazo: 15/01)
- Trocar ou reformar o carro (sem prazo)

INSIGHT DA SEMANA 💡
"Suas semanas com devocional acima de 85% têm
score de bem-estar 20% maior. Continue assim!"

[Salvar no Segundo Cérebro] [Exportar PDF]
```

---

## 8) Perspectiva Cristã

### 8.1 Configuração

A perspectiva cristã é **opt-in** nas configurações:

- **Desabilitado** — IA não menciona aspectos religiosos
- **Habilitado** — IA integra princípios bíblicos quando relevante

**Quando habilitado, aplica-se em:**
- Decisões importantes
- Momentos de dificuldade
- Versículo do dia personalizado
- Celebração de conquistas (gratidão)

### 8.2 Como a IA Aplica

A IA não apenas cita versículos, mas aplica sabedoria bíblica contextualmente:

- Traz o **princípio**, não só o versículo
- **Contextualiza** para a situação específica
- **Nunca impõe**; oferece perspectiva
- Respeita a **liberdade de decisão** do usuário
- Não é "pregação", é sabedoria aplicada

### 8.3 Exemplos de Aplicação

**Decisão financeira:**
> "Você está considerando esse investimento de alto risco com todo seu capital. Provérbios 21:5 fala que 'os planos bem pensados levam à prosperidade, mas a pressa leva à pobreza'. Talvez valha diversificar e ir aos poucos?"

**Conflito profissional:**
> "Antes de responder ao email do Fulano, lembra de Provérbios 15:1: 'a resposta calma desvia a fúria'. Como você poderia abordar isso de forma que resolva sem escalar?"

**Sobrecarga de trabalho:**
> "Você mencionou trabalhar até tarde pela terceira vez essa semana. Até Jesus se retirava para descansar (Marcos 6:31). Seu corpo e família precisam de você presente e inteiro."

**Ansiedade com o futuro:**
> "Entendo a preocupação com essa incerteza. Filipenses 4:6-7 nos lembra de apresentar nossos pedidos a Deus com gratidão. Isso não significa ignorar o problema, mas não carregar o peso sozinho."

### 8.4 Features Espirituais

- Versículo do dia personalizado
- Tracking de devocional com streak
- Plano de leitura bíblica
- Reflexões espirituais (integradas ao Segundo Cérebro)
- Registro de orações (pedidos e respostas)
- Dízimos e ofertas
- Frequência na igreja

---

## 9) Sistema de Scores

### 9.1 Conceito

Cada área da vida recebe um **score de 0 a 10** que indica o estado atual baseado em:

- **Consistência** — % de dias com tracking ativo
- **Metas** — Progresso em metas da área
- **Tendência** — Melhorando ou piorando
- **Baseline** — Comparativo com média histórica

### 9.2 Score Geral

O **Score Geral de Vida** é uma média ponderada das áreas. Os pesos são configuráveis pelo usuário.

### 9.3 Interpretação

| Faixa | Significado | Cor |
|-------|-------------|-----|
| 9.0 - 10.0 | Excelente | 🟢 Verde |
| 7.5 - 8.9 | Bom | 🟢 Verde claro |
| 6.0 - 7.4 | Adequado | 🟡 Amarelo |
| 4.0 - 5.9 | Atenção | 🟠 Laranja |
| 0.0 - 3.9 | Crítico | 🔴 Vermelho |

> Regras detalhadas de cálculo em `SYSTEM_SPECS.md`

---

## 10) Planos e Monetização

### 10.1 Estrutura de Planos

| Recurso | Free | Pro | Premium |
|---------|------|-----|---------|
| **Preço** | R$ 0 | R$ 29/mês | R$ 59/mês |
| Mensagens/mês | 100 | Ilimitado | Ilimitado |
| Histórico | 30 dias | 1 ano | Ilimitado |
| Áreas da vida | 3 | Todas | Todas |
| Telegram/WhatsApp | ✓ | ✓ | ✓ |
| Dashboard básico | ✓ | ✓ | ✓ |
| Dashboard completo | - | ✓ | ✓ |
| Segundo Cérebro | Limitado | Completo | Completo |
| Graph View | - | ✓ | ✓ |
| Sistema de decisões | Limitado | Completo | Completo |
| Relatórios | Semanal | Todos | Todos |
| Integrações (Calendar) | - | ✓ | ✓ |
| Vault | - | ✓ | ✓ |
| CRM de pessoas | Limitado | Completo | Completo |
| Alertas proativos | - | Básico | Avançado |
| Modelo de IA | Básico | Avançado | Premium |
| Exportação | - | ✓ | ✓ |
| Suporte | Comunidade | Email | Prioritário |

### 10.2 Métricas SaaS

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

## 11) Métricas de Sucesso do Produto

### 11.1 Engajamento

| Métrica | Meta |
|---------|------|
| DAU/MAU | > 40% |
| Mensagens/dia por usuário | > 10 |
| Sessões web/semana | > 5 |
| Tracking rate | > 70% dos dias |
| Feature adoption | > 60% |

### 11.2 Valor

| Métrica | Meta |
|---------|------|
| Time to value | < 5 min |
| Onboarding completion | > 80% |
| Decisões documentadas | > 2/mês |
| Notas no Segundo Cérebro | > 10/mês |
| Score improvement | Positivo |

### 11.3 Qualidade

| Métrica | Meta |
|---------|------|
| Uptime | > 99.5% |
| Response time (IA) | < 3s |
| Response time (API) | < 500ms |
| Error rate | < 1% |
| Contexto relevante | > 90% |

---

## 12) Glossário

| Termo | Definição |
|-------|-----------|
| **Segundo Cérebro** | Sistema integrado de notas com graph view, backlinks e busca semântica |
| **Graph View** | Visualização das conexões entre notas como um grafo |
| **Backlinks** | Lista de notas que referenciam a nota atual |
| **Wikilink** | Link entre notas no formato [[nome da nota]] |
| **Vault** | Área segura para informações sensíveis (documentos, credenciais) |
| **Score** | Pontuação de 0-10 que indica o estado de uma área da vida |
| **Streak** | Sequência de dias consecutivos realizando uma atividade |
| **Decisão** | Problema ou escolha importante sendo analisada pelo sistema |
| **Área da Vida** | Uma das 8 categorias principais (Saúde, Financeiro, Profissional, Relacionamentos, Espiritual, Crescimento Pessoal, Saúde Mental, Lazer) |
| **Tracking** | Registro sistemático de métricas ao longo do tempo |
| **PR (Personal Record)** | Recorde pessoal em exercício físico |
| **Check-in Proativo** | Quando a IA inicia conversa para verificar status |
| **Perspectiva Cristã** | Feature opcional que integra princípios bíblicos |
| **Quick Switcher** | Atalho (Cmd+K) para buscar e abrir rapidamente qualquer nota |

---

*Última atualização: Janeiro 2026*
