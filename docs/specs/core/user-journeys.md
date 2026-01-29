# User Journeys

> Detailed user journey scenarios showing how the system works in practice.

---

## 1. Primeiro Uso / First Use (Onboarding)

```
1. Usuário acessa o site e faz cadastro
2. Escolhe plano (ou inicia trial)
3. Wizard de onboarding:
   a. Nome e informações básicas
   b. Conectar Telegram ou WhatsApp
   c. Conectar Google Calendar (opcional)
   d. Tutorial interativo
4. IA inicia conversa de conhecimento:
   - "Me conta um pouco sobre você..."
   - "Quais são suas principais prioridades agora?"
   - "Tem algum problema ou decisão te preocupando?"
5. Dashboard inicial mostra estrutura (ainda vazia)
6. IA sugere primeiras ações:
   - "Que tal registrar seu peso atual?"
   - "Você tem algum compromisso essa semana?"
```

---

## 2. Dia Típico / Typical Day

> **Nota (ADR-015):** Esta jornada reflete a filosofia de baixo atrito. Tracking via conversa sempre pede confirmação. Finanças são gerenciadas via M2.2 (planejamento mensal), não micro-tracking de gastos.

### Morning (Telegram/WhatsApp)

```
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
```

### During the Day (Telegram)

```
10:30 - "A call foi ótima, acho que vamos fechar o contrato"
        → IA registra no contexto do cliente (Memória)

12:00 - "O almoço estava ótimo hoje, fui naquele restaurante novo"
        → IA registra na Memória (contexto), NÃO como tracking financeiro
        → Finanças são gerenciadas via M2.2 (planejamento mensal)

14:00 - "Marca revisão do carro pra próxima segunda 9h"
        → "Agendado: Revisão do carro - Segunda, 13/01 às 9h"

16:00 - "Estou pensando em aceitar aquele projeto freelancer..."
        → IA inicia modo conselheira, traz contexto relevante
```

### Evening (Web App - optional)

```
21:00 - Abre dashboard (quando quiser):
        - Score geral baseado nos dados registrados
        - Destaques: devocional, reunião produtiva
        - Métricas que você registrou esta semana

21:15 - Revisa histórico de métricas (se houver)

21:30 - Lê insight (quando há dados suficientes):
        "Baseado no que você compartilhou, percebi que você
         mencionou cansaço algumas vezes nas últimas semanas."
```

---

## 3. Making an Important Decision

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

5. IA oferece próximos passos:
   - "Posso montar uma lista de perguntas para fazer à empresa?"
   - "Quer que eu resuma os pontos principais para você pensar?"

6. Usuário decide e comunica: "Decidi recusar"
   → IA salva via add_knowledge: "[DECISÃO] Título: Recusar proposta empresa X.
      Escolha: Recusar. Motivo: Priorizar família e estabilidade atual."
   → Fatos e aprendizados salvos na Memória

7. Quando usuário quiser refletir, inicia nova conversa:
   "Como você está em relação àquela decisão da empresa X?"
   → IA busca contexto via search_knowledge
   → Conexões feitas naturalmente
```

---

## 4. Explorando a Memória / Exploring Memory

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

---

## 5. Preparação para Consulta Médica / Medical Appointment

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

---

## 6. Revisão Semanal / Weekly Review

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

## 7. Key Journey Principles

### Low Friction (ADR-015)

- Tracking sempre pergunta antes de registrar
- Nunca cobra métricas não registradas
- Sistema funciona sem nenhum tracking ativo

### Contextual Memory (ADR-012)

- IA traz contexto relevante do histórico
- Usuário pode ver e corrigir o que a IA sabe
- Knowledge items são transparentes

### Decision Support (ADR-016)

- Decisões importantes são salvas via `add_knowledge` com formato consistente
- Usuário pode iniciar conversa para refletir sobre decisões passadas
- IA consulta histórico via `search_knowledge` e faz conexões naturalmente

---

*Última atualização: 29 Janeiro 2026*
