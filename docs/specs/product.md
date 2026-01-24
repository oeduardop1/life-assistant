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
7. **Histórico de Decisões** — Acompanhamento de decisões importantes com follow-up e aprendizado (ADR-016)

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
- **Oferece salvar decisões importantes** para acompanhamento futuro (ADR-016)
- **Consulta histórico de decisões** similares para contextualizar conselhos
- **Agenda follow-up** automático para avaliar resultados (30 dias default)

**Exemplos de uso:**
- "Me ajuda a decidir se aceito essa proposta de emprego"
- "Estou em dúvida sobre mudar de cidade"
- "Tive um conflito com meu sócio, como devo abordar?"
- "Como foi aquela decisão que tomei mês passado?"

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

## 3) Áreas da Vida

O sistema organiza a vida do usuário em **6 áreas principais** com sub-áreas (conforme ADR-017):

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
| **Decisões** | Histórico de decisões importantes com follow-up e aprendizados (M1.11 + M3.7) |
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

> **Filosofia (ADR-015):** Tracking de baixo atrito. Métricas são capturadas via conversa natural com confirmação, ou registradas manualmente no dashboard por quem preferir. Nenhuma métrica é obrigatória.

**Métricas Corporais (quando registradas):**
- Peso, gordura corporal, medidas, IMC
- Meta de peso com progresso visual (opcional, definida pelo usuário)

**Exercícios (quando registrados):**
- Registro de treinos via conversa ("treinei 45min de musculação") ou dashboard
- Exercícios detalhados (séries, repetições, carga) — para quem quer detalhar
- PRs (recordes pessoais)
- Frequência semanal e volume total (calculados quando há dados)
- Integração com Google Fit e Strava (importação opcional)

**Nutrição (quando registrada):**
- Registro de refeições via conversa ou dashboard
- Calorias e macros (para quem quer acompanhar)
- Notas sobre alimentação
- Sem metas diárias impostas

**Sono (quando registrado):**
- Horas dormidas e qualidade (quando mencionado em conversa)
- Consistência de horários (quando há dados suficientes)
- Média calculada automaticamente

**Saúde Médica:**
- Histórico de consultas (data, médico, resultado)
- Cadastro de médicos
- Diagnósticos e tratamentos
- Exames com evolução de marcadores
- Medicamentos em uso e histórico
- Vacinas
- Alertas de exames periódicos
- Preparação automática para consultas

**Saúde Mental (quando registrada):**
- Registro de humor (quando mencionado: "estou me sentindo bem hoje")
- Níveis de ansiedade e estresse (quando reportados)
- Gatilhos identificados pela IA via conversas
- Registro de sessões de terapia

### 6.7 Módulo: Financeiro (M2.2)

> **Filosofia:** Planejamento financeiro mensal com baixo atrito. Usuário define orçamento no início do mês e marca contas como pagas ao longo do período. Não é micro-tracking de gastos diários.

**Rendas (Incomes):**
- Rendas do mês (salário, freelance, bônus, passiva, investimentos, presente, outros)
- Valor previsto vs valor real recebido
- Rendas recorrentes (geradas sob demanda ao visualizar o mês)
- Soma total de receitas do período

**Contas Fixas (Bills):**
- Contas com valor e dia de vencimento (1-31)
- Categorias: moradia, serviços, assinatura, outros
- Checkbox de "pago" com data de pagamento
- Status: pendente, pago, vencido, cancelado
- Contas recorrentes (geradas sob demanda ao visualizar o mês)
- Alerta 3 dias antes do vencimento

**Despesas Variáveis:**
- Despesas recorrentes (Alimentação, Transporte, Lazer) — geradas sob demanda
- Despesas pontuais — criadas manualmente, só naquele mês
- Valor previsto vs valor real gasto
- Categorias configuráveis

**Dívidas (Debts):**
- Nome, credor, valor total
- Dívidas negociadas: número de parcelas, valor da parcela, dia de vencimento
- Dívidas não negociadas: apenas valor total conhecido (aguardando negociação)
  - Campo de notas para contexto da negociação
  - Não entram no Total Orçado (sem parcelas definidas)
  - Podem ser marcadas como "negociada" quando parcelas forem definidas
- Progresso visual: parcela X de Y (barra de progresso)
- Overview por dívida: parcelas pagas, valor pago, valor restante, % conclusão
- Pagar parcela: incrementa contador, atualiza progresso automaticamente
- Quitação automática ao pagar última parcela
- Alerta 3 dias antes de parcela vencer (apenas dívidas negociadas)
- Status: ativa, quitada, renegociada, inadimplente

**Investimentos:**
- Nome livre (ex: "Reserva de Emergência", "Aposentadoria")
- Meta opcional (valor alvo + prazo)
- Valor atual e aporte mensal planejado
- Progresso: atual / meta × 100%
- Tipos: reserva, aposentadoria, curto prazo, longo prazo, educação, custom

**Dashboard Financeiro:**
- KPIs principais:
  - Renda do Mês (soma de receitas)
  - Total Orçado (compromissos previstos - exclui dívidas não negociadas)
  - Total Gasto (dinheiro que saiu)
  - Saldo (renda - gasto)
  - Total Investido (patrimônio em investimentos)
- KPIs de Dívidas:
  - Total de Dívidas (todas - negociadas + pendentes de negociação)
  - Parcela Mensal Total (soma das parcelas de dívidas ativas)
  - Total Já Pago (valor quitado em todas as dívidas)
  - Total Restante (quanto ainda falta pagar)
- Gráficos:
  - Orçado vs Real (barras comparativas)
  - Distribuição por categoria (pizza)
  - Evolução mensal (linha)
- Alertas de vencimento próximo
- Navegação entre meses (← Mês Anterior | Mês Atual | Próximo Mês →)

**Notificações:**
- 3 dias antes: conta fixa vencendo
- 3 dias antes: parcela de dívida vencendo
- Dia do vencimento: conta/parcela atrasada
- Dia 1 do mês: "Configure seu orçamento de [mês]"
- Último dia: "Resumo de [mês]: Gastou R$ X de R$ Y"

**Acesso via Conversa (IA):**

O usuário pode interagir com suas finanças através de conversa natural com a IA:

*Consultas:*
- "Qual meu resumo financeiro deste mês?" → get_finance_summary
- "Quais contas ainda preciso pagar?" → get_pending_bills
- "Como está o pagamento das minhas dívidas?" → get_debt_progress
- "Quanto já paguei do financiamento do carro?" → get_debt_progress

*Ações:*
- "Paguei a conta de luz" → mark_bill_paid (com confirmação)
- "Gastei R$150 no mercado ontem" → create_expense (com confirmação)
- "Acabei de pagar a parcela do cartão" → (futuro: pay_installment)

*Alertas Proativos:*
- IA lembra contas próximas do vencimento durante conversa
- IA alerta sobre contas vencidas ao iniciar chat
- IA pode sugerir resumo semanal de gastos vs orçamento

**Funcionalidades Futuras (não implementadas em M2.2):**
- Patrimônio líquido (ativos - passivos)
- Integração bancária (Open Finance)
- Carteira de investimentos com rentabilidade
- Empresa (para empreendedores)

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

> **Filosofia (ADR-015):** Tracking de baixo atrito. Métricas espirituais são capturadas quando o usuário menciona em conversa. Não há "streak obrigatório" — o sistema celebra consistência quando existe, mas não penaliza ausência de registros.

| Feature | Descrição |
|---------|-----------|
| Devocional | Registro quando usuário menciona (conversa ou dashboard) |
| Consistência | Visualização de frequência (quando há dados) |
| Plano de leitura bíblica | Com progresso (opcional) |
| Livro/capítulo atual | Onde parou |
| Versículos importantes | Salvos com contexto |
| Frequência na igreja | Registro quando mencionado |
| Participação em grupos | Célula, ministério, etc. |
| Dízimos e ofertas | Via M2.2 Finance |
| Reflexões espirituais | Notas de quiet time (armazenadas na Memória) |
| Orações | Pedidos e respostas |
| Jejum | Registro de períodos (quando mencionado) |
| Versículo do dia | Personalizado pelo contexto

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

### 6.18 Módulo: Decisões (ADR-016)

> **Milestone:** M1.11 Decision Support Core + M3.7 Decision Follow-up
> **Dependências:** M1.3 (Knowledge Items), M1.7 (Perspectiva Cristã), M3.4 (Notificações)

| Feature | Descrição |
|---------|-----------|
| **Registro de Decisão** | Salvar decisões importantes via chat (tool `save_decision`) |
| **Opções e Critérios** | Estruturar opções com prós/contras e critérios de avaliação |
| **Análise da IA** | IA analisa contexto, padrões passados, e gera recomendações |
| **Follow-up Pós-Decisão** | Acompanhamento automático após N dias (default 30) |
| **Avaliação de Resultado** | Registro de satisfação (1-5) e reflexão sobre a decisão |
| **Learning Loop** | Memory Consolidation extrai padrões de decisões para melhorar conselhos |
| **Dashboard /decisions** | Lista de decisões com filtros por área, status, período |
| **Histórico Contextual** | Modo Conselheira consulta decisões passadas similares |

**Ciclo de Vida:**
```
draft → analyzing → ready → decided → [postponed|canceled] → reviewed
```

**Valor do Módulo:**
- Histórico de decisões importantes não se perde
- Follow-up ajuda a avaliar qualidade das decisões
- IA aprende com outcomes reais para melhorar conselhos futuros
- Reduz ansiedade pós-decisão ("será que fiz certo?")

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

> **Nota (ADR-015):** Esta jornada reflete a filosofia de baixo atrito. Tracking via conversa sempre pede confirmação. Finanças são gerenciadas via M2.2 (planejamento mensal), não micro-tracking de gastos.

```
MANHÃ (Telegram/WhatsApp)
07:00 - Recebe resumo do dia:
        "Bom dia! Hoje você tem:
         - 10h: Call com cliente X
         - 15h: Dentista
         Lembretes: Pagar conta de luz"

07:15 - "Fui ao médico ontem, estou com 82.1kg"
        → "Legal que foi ao médico! Quer que eu registre seu peso de 82.1kg?"
        → "Sim"
        → "Registrado! Você está 0.3kg abaixo do último registro 📉"

07:30 - "Fiz devocional hoje de manhã, li Salmos 23"
        → "Que bom! Quer que eu anote o devocional de hoje?"
        → "Pode anotar"
        → "Anotado! Você tem feito devocional com frequência ultimamente"

DURANTE O DIA (Telegram)
10:30 - "A call foi ótima, acho que vamos fechar o contrato"
        → IA registra no contexto do cliente (Memória)

12:00 - "O almoço estava ótimo hoje, fui naquele restaurante novo"
        → IA registra na Memória (contexto), NÃO como tracking financeiro
        → Finanças são gerenciadas via M2.2 (planejamento mensal)

14:00 - "Marca revisão do carro pra próxima segunda 9h"
        → "Agendado: Revisão do carro - Segunda, 13/01 às 9h"

16:00 - "Estou pensando em aceitar aquele projeto freelancer..."
        → IA inicia modo conselheira, traz contexto relevante

NOITE (Web App - opcional)
21:00 - Abre dashboard (quando quiser):
        - Score geral baseado nos dados registrados
        - Destaques: devocional, reunião produtiva
        - Métricas que você registrou esta semana

21:15 - Revisa histórico de métricas (se houver)
21:30 - Lê insight (quando há dados suficientes):
        "Baseado no que você compartilhou, percebi que você
         mencionou cansaço algumas vezes nas últimas semanas."
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

> **Nota (ADR-015):** Relatórios são baseados apenas nas métricas que o usuário registrou. Áreas sem dados mostram score neutro (50) sem penalização.

```
DOMINGO, 20H - Notificação:
"Seu relatório semanal está pronto! 📊"

RELATÓRIO SEMANAL - 06 a 12 de Janeiro

SCORE GERAL: 7.4/10 (↑ +0.3 vs semana anterior)
> Baseado nas métricas que você registrou esta semana

POR ÁREA:
💪 Saúde:        7.8 ↑  Treinou 4x (registrado via conversa)
💰 Financeiro:   7.0 ↓  Orçamento 85% utilizado (M2.2)
🏢 Profissional: 8.2 ↑  Mencionou reunião produtiva
👨‍👩‍👧 Familiar:     --  --  Sem métricas registradas
⛪ Espiritual:   8.0 ↑  3 devocionais registrados
📚 Estudos:      --  --  Sem métricas registradas
😊 Bem-estar:    7.2 =  Humor bom (mencionado em conversa)

DESTAQUES DA SEMANA 🏆
- 3 devocionais registrados
- Fechou contrato com cliente X
- Peso estável (82kg)

O QUE VOCÊ COMPARTILHOU 📝
- Treinou 4x na academia
- Mencionou estar se sentindo bem
- Reunião produtiva com cliente

INSIGHT DA SEMANA 💡 (quando há dados suficientes)
"Nas semanas que você mencionou devocional,
também relatou estar se sentindo melhor!"

[Salvar na Memória] [Exportar PDF]

Quer registrar algo mais sobre essa semana?
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

*Última atualização: 21 Janeiro 2026*
*Revisão: Dívidas não negociadas, novos KPIs de dívidas (Total de Dívidas, Parcela Mensal Total, Total Já Pago, Total Restante), overview por dívida com progresso*
