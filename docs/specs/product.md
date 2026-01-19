# Product Specs — Life Assistant AI
> **Documento de especificação funcional (Produto).**
> Define **O QUE** a aplicação é, faz e para quem.
> Para **COMO** funciona tecnicamente, ver `system.md` e `engineering.md`.
> Para priorização de desenvolvimento, ver `docs/milestones/`.

---

## Precedência em caso de conflito
- Escopo/features: `product.md`
- Regras/fluxos/DoD: `system.md`
- Tech/infra: `engineering.md`
- Modelo de dados: `data-model.md`
- IA/Prompts: `ai.md`
- Integrações: `integrations.md`
- Priorização: `docs/milestones/`
- Pendências: `TBD_TRACKER.md`

---

## 1) Visão Geral

### 1.1 O que é

Uma plataforma SaaS com IA integrada que funciona como:

- **Memória** — Armazena e organiza automaticamente tudo sobre a vida do usuário
- **Conselheira** — Ajuda a pensar, analisar situações e tomar decisões
- **Assistente Pessoal** — Executa tarefas, agenda compromissos, organiza informações
- **Tracker de Evolução** — Mede progresso em todas as áreas da vida

A IA conhece profundamente o usuário: seu passado, presente, objetivos futuros, valores, problemas atuais e histórico de decisões. Toda interação é contextualizada por essa memória.

### 1.2 Problema que resolve

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

### 1.3 Proposta de valor

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

### 1.4 Diferenciais

1. **Memória Persistente** — A IA lembra de TUDO sobre o usuário
2. **Zero Atrito** — Interação natural por chat (Telegram/WhatsApp) e dashboard (Web)
3. **Perspectiva Cristã** — Princípios bíblicos integrados ao aconselhamento (opcional)
4. **Visão Holística** — Todas as áreas da vida conectadas e visíveis
5. **Transparência** — Você vê o que a IA sabe sobre você e pode corrigir
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

O sistema organiza a vida do usuário em **8 áreas principais** (alinhadas com data-model.md):

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
- "Quero uma IA que me conhece e lembra de tudo"

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

> Detalhes de comandos e sintaxe em `integrations.md`

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

### 6.2 Módulo: Memória (ADR-012)

A Memória é o sistema de conhecimento gerenciado automaticamente pela IA. Tudo o que a IA sabe sobre você fica visível e editável.

> **Arquitetura:** Tool Use + Memory Consolidation (ver ADR-012)

**Como Funciona:**

1. Você conversa naturalmente com a IA
2. A cada 24h, um job extrai fatos, preferências e insights das conversas
3. Os itens extraídos ficam visíveis na tela de Memória
4. Você pode confirmar, corrigir ou deletar qualquer item
5. A IA usa essa memória para contextualizar todas as respostas

**Tipos de Conhecimento:**

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **Fato** | Informação objetiva sobre você | "Mora em São Paulo" |
| **Preferência** | Escolhas e gostos pessoais | "Prefere reuniões pela manhã" |
| **Insight** | Padrão identificado pela IA | "Tende a gastar mais quando estressado" |
| **Pessoa** | Informação sobre alguém importante | "João é seu sócio desde 2020" |
| **Memória** | Evento ou experiência significativa | "Casou em 15/03/2018" |

**Visualização:**

| Feature | Descrição |
|---------|-----------|
| Lista de itens | Todos os fatos organizados por área da vida |
| Indicador de confiança | Mostra certeza da IA (alta/média/baixa) |
| Fonte do item | De onde a IA extraiu (conversa, inferência) |
| Filtros | Por área, tipo, confiança, data |
| Busca | Encontrar qualquer informação por texto |
| Relacionados | Ver itens conectados a um item específico |

**Iconografia:**

Cada área da vida tem um ícone Lucide React associado:

| Área | Ícone | Cor |
|------|-------|-----|
| Saúde | `Heart` | red-500 |
| Financeiro | `$` (texto) | green-500 |
| Relacionamentos | `Users` | pink-500 |
| Carreira | `Briefcase` | blue-500 |
| Crescimento Pessoal | `Target` | purple-500 |
| Lazer | `Sparkles` | yellow-500 |
| Espiritualidade | `Sun` | indigo-500 |
| Saúde Mental | `Brain` | teal-500 |

**Gestão:**

| Feature | Descrição |
|---------|-----------|
| Confirmar item | Confirmar que a informação está correta |
| Corrigir item | Editar informação incorreta |
| Deletar item | Remover informação que não quer que a IA use |
| Adicionar item | Informar algo que a IA não sabe |
| Ver histórico | Quando o item foi criado/atualizado |

**Raciocínio Inferencial:**

A IA analisa automaticamente a memória e fornece insights proativos:

| Feature | Descrição |
|---------|-----------|
| Conexões automáticas | Detecta relações entre itens de conhecimento (ex: "Seu stress financeiro correlaciona com gastos impulsivos") |
| Detecção de contradições | Identifica inconsistências na memória (ex: novo fato contradiz um antigo) |
| Resolução automática | Resolve contradições com regras de prioridade (item confirmado > maior confiança > mais recente) |
| Insights temporais | Analisa padrões ao longo do tempo |

> Detalhes técnicos em ai.md §6.6 (Raciocínio Inferencial)

**Notas Automáticas:**

| Feature | Descrição |
|---------|-----------|
| Nota de consulta | Resumo preparado para consultas médicas |
| Nota de relatório | Relatórios semanais/mensais salvos como nota |

**Exportação:**

| Feature | Descrição |
|---------|-----------|
| Exportar memória | Download de todos os itens em JSON ou Markdown |
| Exportar notas | Download de notas automáticas em .md |

### 6.3 Módulo: Assistente e Agenda

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

### 6.4 Módulo: Vault (Informações Pessoais)

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

### 6.5 Módulo: Pessoas (CRM Pessoal)

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
| Conhecimento automático | Informações sobre a pessoa vão para Memória |

### 6.6 Módulo: Saúde

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

### 6.7 Módulo: Financeiro

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

### 6.8 Módulo: Profissional

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

### 6.9 Módulo: Familiar

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

### 6.10 Módulo: Espiritual

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

### 6.11 Módulo: Estudos

| Feature | Descrição |
|---------|-----------|
| Livros lidos | Lista com data de conclusão |
| Livros em andamento | Com progresso (%) |
| Livros na fila | Want to read |
| Meta anual de livros | Com progresso |
| Resumos de livros | Notas e aprendizados (integrado à Memória) |
| Cursos em andamento | Com progresso |
| Cursos concluídos | Histórico |
| Certificações obtidas | Com datas |
| Horas de estudo | Tracking semanal/mensal |
| Meta de horas | Por semana/mês |
| Áreas de estudo | Categorização |
| Aprendizados | Insights extraídos |
| Flashcards | Revisão espaçada |

### 6.12 Módulo: Bem-estar

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

### 6.13 Módulo: Dashboard e Visualização

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

> Regras de cálculo de scores em `system.md`

### 6.14 Módulo: Metas e Hábitos

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

### 6.15 Módulo: Alertas e Proatividade

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
| Sugestões de ação | Baseado em padrões |

### 6.16 Módulo: Relatórios

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
| Salvar como nota | Relatório fica disponível na Memória |

### 6.17 Módulo: SaaS e Multi-tenancy

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
   - "Posso montar uma lista de perguntas para fazer à empresa?"
   - "Quer que eu resuma os pontos principais para você pensar?"

7. Usuário decide e comunica: "Decidi recusar"
   → IA registra a conclusão com todo o contexto
   → Fatos e aprendizados salvos na Memória

8. Após 3 meses, IA faz check-in:
   "Faz 3 meses que você recusou a proposta da empresa X.
    Como está se sentindo sobre essa escolha?"
   → Usuário responde, IA registra aprendizados
   → Conhecimento atualizado na Memória
```

### 7.4 Jornada: Explorando a Memória

```
1. Usuário acessa "Memória" no menu

2. Vê lista de conhecimento organizada por área:
   💪 Saúde (12 itens)
   💰 Financeiro (8 itens)
   👥 Relacionamentos (15 itens)
   🏢 Profissional (10 itens)

3. Clica em "Financeiro":
   - Vê todos os fatos: "Orçamento mensal: R$8.000"
   - Vê preferências: "Prefere investimentos conservadores"
   - Vê insights: "Tende a gastar mais em semanas estressantes"
   - Cada item mostra indicador de confiança (alta/média)

4. Percebe um item incorreto:
   - "Salário: R$12.000" (era antes, agora é diferente)
   - Clica em "Corrigir" e atualiza para "R$15.000"
   - IA passa a usar o valor correto

5. Busca algo específico:
   - Digita "colesterol" na busca
   - Encontra: "Último exame colesterol: 195 mg/dL (Out/25)"

6. Vê um insight interessante:
   - "Suas semanas com devocional >80% têm
      gastos impulsivos 30% menores"
   - Clica em "Ver evidências" para entender
   - Valida o insight clicando em ✓

7. Adiciona informação manualmente:
   - Clica em "Adicionar"
   - "Alergia a dipirona" (fato de saúde)
   - IA passa a considerar em contextos relevantes
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
   → IA atualiza fatos de saúde na Memória
   → Nota da consulta disponível para referência
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

INSIGHT DA SEMANA 💡
"Suas semanas com devocional acima de 85% têm
score de bem-estar 20% maior. Continue assim!"

[Salvar na Memória] [Exportar PDF]
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
- Reflexões espirituais (integradas à Memória)
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

> Regras detalhadas de cálculo em `system.md`

---

## 10) Planos e Monetização

### 10.1 Estrutura de Planos

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
| Itens na Memória | > 20/mês |
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
| **Memória** | Sistema de conhecimento gerenciado automaticamente pela IA (ADR-012) |
| **Knowledge Item** | Fato, preferência, insight ou memória sobre o usuário |
| **Confidence** | Nível de certeza da IA sobre uma informação (alta/média/baixa) |
| **Memory Consolidation** | Job que extrai conhecimento das conversas a cada 24h |
| **Tool Use** | Arquitetura onde a IA decide quando buscar/atualizar dados |
| **Vault** | Área segura para informações sensíveis (documentos, credenciais) |
| **Score** | Pontuação de 0-10 que indica o estado de uma área da vida |
| **Streak** | Sequência de dias consecutivos realizando uma atividade |
| **Área da Vida** | Uma das 8 categorias principais (Saúde, Financeiro, Profissional, Relacionamentos, Espiritual, Crescimento Pessoal, Saúde Mental, Lazer) |
| **Tracking** | Registro sistemático de métricas ao longo do tempo |
| **PR (Personal Record)** | Recorde pessoal em exercício físico |
| **Check-in Proativo** | Quando a IA inicia conversa para verificar status |
| **Perspectiva Cristã** | Feature opcional que integra princípios bíblicos |

---

*Última atualização: 15 Janeiro 2026*
*Revisão: Removido Sistema de Decisões. Funcionalidade de aconselhamento mantida no modo Conselheira da IA, sem módulo formal de decisões.*
