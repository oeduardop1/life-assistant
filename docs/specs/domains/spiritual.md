# Spiritual Module

> Tracking espiritual com baixo atrito: devocional, leitura bíblica, orações e vida comunitária.

---

## 1. Overview

O módulo Espiritual permite acompanhar práticas espirituais de forma não-intrusiva. Segue a filosofia de baixo atrito (ADR-015): métricas são capturadas quando mencionadas em conversa, sem cobranças ou penalizações.

**Filosofia (ADR-015):** Não há "streak obrigatório". O sistema celebra consistência quando existe, mas não penaliza ausência de registros.

### Opt-in (Perspectiva Cristã)

A perspectiva cristã é **opt-in** nas configurações:
- **Desabilitado** — IA não menciona aspectos religiosos
- **Habilitado** — IA integra princípios bíblicos quando relevante

### Exemplos de Aplicação

- Decisão financeira: usar princípios de prudência e planejamento
- Conflito profissional: resposta calma e reconciliação
- Sobrecarga de trabalho: descanso e equilíbrio
- Ansiedade com o futuro: esperança e gratidão

---

## 2. Devotional Tracking

### 2.1 Registro

Via conversa:
```
"Fiz devocional hoje de manhã"
"Li Salmos 23 no devocional"
"Mediei em Filipenses 4 hoje"
```

Campos:
- Data
- Passagem (se mencionada)
- Notas/reflexões (opcional)

### 2.2 Consistência

Quando há dados suficientes:
- Frequência semanal
- Visualização de calendário
- Celebração de consistência (não streak obrigatório)

> "Percebi que você tem feito devocional com frequência esta semana!"

---

## 3. Bible Reading Plan

### 3.1 Planos Disponíveis

| Plano | Descrição | Duração |
|-------|-----------|---------|
| Bíblia em 1 ano | Leitura completa | 365 dias |
| Novo Testamento | Só NT | 90 dias |
| Salmos e Provérbios | Sabedoria | 60 dias |
| Personalizado | Usuário define | Variável |

### 3.2 Progresso

| Campo | Descrição |
|-------|-----------|
| Plano ativo | Qual está seguindo |
| Dia atual | Ex: Dia 45 de 365 |
| Progresso | 12.3% concluído |
| Última leitura | Data e passagem |
| Próxima leitura | Sugestão do dia |

### 3.3 Flexibilidade

- Pode pular dias sem penalização
- Pode ler à frente
- Pode pausar e retomar

---

## 4. Saved Verses

### 4.1 Versículos Importantes

| Campo | Descrição |
|-------|-----------|
| Referência | Ex: "João 3:16" |
| Texto | Conteúdo do versículo |
| Tradução | NVI, ARA, ACF, etc. |
| Contexto | Por que é importante |
| Data salvo | Quando adicionou |
| Tags | Categorização |

### 4.2 Uso pela IA

Versículos salvos podem ser sugeridos em contextos relevantes:
- "Você salvou Filipenses 4:6 sobre ansiedade. Lembra dele?"

---

## 5. Church Attendance

### 5.1 Registro

Via conversa:
```
"Fui à igreja domingo"
"Participei do culto online"
```

Campos:
- Data
- Tipo (presencial, online)
- Igreja/comunidade
- Notas (tema da pregação, etc.)

### 5.2 Frequência

Quando há dados:
- Frequência mensal
- Visualização de calendário
- Sem cobrança de frequência mínima

---

## 6. Groups & Ministries

### 6.1 Participação

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: "Célula Centro" |
| Tipo | Célula, ministério, escola bíblica |
| Frequência | Semanal, quinzenal, mensal |
| Dia/horário | Quando acontece |
| Líder | Quem lidera |

### 6.2 Registro de Presença

Via conversa:
```
"Fui na célula ontem"
"Servi no ministério de louvor domingo"
```

---

## 7. Tithes & Offerings

> Integrado com módulo Finance (M2.2)

### 7.1 Registro

Via Finance como despesa categoria "tithe_offering":
- Data
- Valor
- Tipo (dízimo, oferta, missões)
- Destino (igreja, instituição)

### 7.2 Resumo

- Total do mês
- Total do ano
- Comparativo com meses anteriores

---

## 8. Spiritual Reflections

### 8.1 Notas de Quiet Time

Armazenadas na Memória como knowledge_items tipo "memory":
- Reflexões durante devocional
- Insights espirituais
- Aprendizados

### 8.2 Acesso

- Busca por palavra-chave
- Filtro por data
- Relacionados a versículos

---

## 9. Prayers

### 9.1 Pedidos de Oração

| Campo | Descrição |
|-------|-----------|
| Título | Resumo do pedido |
| Descrição | Detalhes |
| Por quem | Se for por outra pessoa |
| Data pedido | Quando começou a orar |
| Status | Orando, respondido, em espera |

### 9.2 Respostas

| Campo | Descrição |
|-------|-----------|
| Data resposta | Quando foi respondido |
| Como foi respondido | Descrição |
| Reflexão | O que aprendeu |

### 9.3 Lista de Oração

- Pedidos ativos
- Respostas recentes
- Histórico de orações respondidas

---

## 10. Fasting

### 10.1 Registro

Via conversa:
```
"Estou jejuando hoje"
"Terminei o jejum de 24h"
```

Campos:
- Data início
- Data fim
- Tipo (parcial, completo)
- Propósito
- Notas

---

## 11. Verse of the Day

### 11.1 Personalização

O versículo do dia considera:
- Contexto atual do usuário (Memória)
- Desafios mencionados recentemente
- Preferências de livros/temas
- Perspectiva cristã habilitada

### 11.2 Entrega

- Morning summary
- Notificação matinal
- Widget no dashboard

---

## 12. AI Tools

```typescript
{
  name: 'get_spiritual_context',
  description: 'Obtém contexto espiritual do usuário',
  parameters: z.object({
    includePrayers: z.boolean().default(true),
    includeReadingPlan: z.boolean().default(true),
    days: z.number().default(30),
  }),
  requiresConfirmation: false,
}

{
  name: 'add_prayer_request',
  description: 'Adiciona pedido de oração',
  parameters: z.object({
    title: z.string(),
    description: z.string().optional(),
    forPerson: z.string().optional(),
  }),
  requiresConfirmation: true,
}

{
  name: 'mark_prayer_answered',
  description: 'Marca pedido como respondido',
  parameters: z.object({
    prayerId: z.string().uuid(),
    howAnswered: z.string(),
  }),
  requiresConfirmation: true,
}
```

---

## 13. Definition of Done

- [ ] Registro de devocional via conversa
- [ ] Plano de leitura bíblica com progresso
- [ ] Salvar versículos importantes
- [ ] Registro de frequência na igreja
- [ ] Pedidos de oração (CRUD)
- [ ] Respostas de oração
- [ ] Versículo do dia personalizado
- [ ] Integração com Finance para dízimos
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 27 Janeiro 2026*
