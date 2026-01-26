# Reports Module

> Relatórios periódicos: diário (morning summary), semanal, mensal, trimestral e anual.

---

## 1. Overview

O módulo de Relatórios gera análises periódicas da vida do usuário, incluindo resumo da manhã, relatórios semanais, mensais, trimestrais e anuais.

---

## 2. Morning Summary

### 2.1 Schedule

| Campo | Valor |
|-------|-------|
| Horário padrão | 07:00 (configurável) |
| Distribuição | 20 minutos de janela |
| Canais | Push, Telegram, Email |

### 2.2 Distribution Strategy

Para evitar pico de processamento:
```
- Usuários são agrupados em buckets de 20 minutos
- Bucket = hash(userId) % 20
- Horário = morningSummaryTime - 10min + bucket
- Resultado: 07:00 até 07:20 (spread uniforme)
```

### 2.3 Content Template

```markdown
☀️ Bom dia, {nome}!

📅 AGENDA DE HOJE
{eventos_do_dia}

⏰ LEMBRETES
{lembretes_pendentes}

🎂 ANIVERSÁRIOS
{aniversarios_hoje}

📊 SEU ESTADO
- Score: {score}/10 ({variacao} vs ontem)
- Peso: {peso_ontem}kg
- Sono: {sono}h

💪 MOTIVAÇÃO
{mensagem_personalizada}

{versiculo_se_habilitado}
```

### 2.4 Geração

Via job `morning-summary`:
1. Buscar eventos do dia
2. Buscar lembretes pendentes
3. Buscar aniversários
4. Calcular métricas de ontem
5. Gerar mensagem motivacional (LLM)
6. Adicionar versículo (se perspectiva cristã)
7. Enviar por canais configurados

---

## 3. Weekly Report

### 3.1 Schedule

| Campo | Valor |
|-------|-------|
| Dia | Domingo |
| Horário | 20:00 (configurável) |
| Canais | Push, Email |

### 3.2 Content

```markdown
📊 RELATÓRIO SEMANAL
{data_inicio} a {data_fim}

🎯 SCORE GERAL: {score}/10 ({variacao} vs semana anterior)

📈 POR ÁREA
💪 Saúde:        {score} {emoji_variacao}
💰 Financeiro:   {score} {emoji_variacao}
🏢 Profissional: {score} {emoji_variacao}
📚 Aprendizado:  {score} {emoji_variacao}
⛪ Espiritual:   {score} {emoji_variacao}
👥 Relac.:       {score} {emoji_variacao}

🏆 DESTAQUES DA SEMANA
{lista_destaques}

📝 O QUE VOCÊ COMPARTILHOU
{resumo_conversas}

💡 INSIGHT DA SEMANA
{insight_personalizado}

📌 SUGESTÕES PARA PRÓXIMA SEMANA
{sugestoes}
```

### 3.3 Geração

Via job `weekly-report`:
1. Calcular scores do período
2. Comparar com semana anterior
3. Listar destaques (metas, hábitos, conquistas)
4. Resumir conversas principais
5. Gerar insight via LLM
6. Sugerir ações para próxima semana

---

## 4. Monthly Report

### 4.1 Schedule

| Campo | Valor |
|-------|-------|
| Dia | 1º dia do mês seguinte |
| Horário | 10:00 |
| Canais | Email |

### 4.2 Additional Content

Além do conteúdo semanal:
- Gráficos de evolução mensal
- Comparativo com mês anterior
- Comparativo YoY (mesmo período do ano anterior)
- Metas atingidas no mês
- Hábitos com melhor consistência
- Resumo financeiro do mês
- Análise de padrões do mês

---

## 5. Quarterly Report

### 5.1 Schedule

| Campo | Valor |
|-------|-------|
| Dia | 1º dia após trimestre |
| Horário | 10:00 |
| Canais | Email |

### 5.2 Content Focus

- Tendências de longo prazo
- Evolução por área (3 meses)
- Metas trimestrais: progresso
- Padrões identificados
- Recomendações estratégicas

---

## 6. Annual Report

### 6.1 Schedule

| Campo | Valor |
|-------|-------|
| Dia | 1º de Janeiro |
| Horário | 12:00 |
| Canais | Email |

### 6.2 Retrospectiva

```markdown
🎊 RETROSPECTIVA {ano}

📊 EVOLUÇÃO DO SEU SCORE
[Gráfico: Score por mês]

🏆 CONQUISTAS DO ANO
{lista_conquistas}

📈 EVOLUÇÃO POR ÁREA
{comparativo_jan_vs_dez}
Comparativo YoY (mesmo período do ano anterior) quando disponível

📚 APRENDIZADOS
- {livros_lidos} livros lidos
- {cursos_concluidos} cursos concluídos
- {certificacoes} certificações obtidas

💪 SAÚDE
- Peso: {variacao_ano}
- Treinos: {total_treinos}
- Sono médio: {sono_medio}

💰 FINANCEIRO
- Economia: {economia_ano}
- Metas financeiras: {atingidas}/{total}

🙏 GRATIDÃO
{top_3_gratidoes_do_ano}

🎯 METAS PARA {proximo_ano}
{sugestoes_baseadas_em_padroes}
```

---

## 7. Customization

### 7.1 Configurações

| Opção | Descrição |
|-------|-----------|
| Frequência | Quais relatórios receber |
| Horário | Quando receber |
| Canais | Push, Telegram, Email |
| Seções | Quais incluir |
| Idioma | pt-BR, en-US |

### 7.2 Opt-out

Cada relatório pode ser desabilitado individualmente.

---

## 8. Export (PDF, Markdown)

### 8.1 Formatos

| Formato | Uso |
|---------|-----|
| PDF | Impressão, arquivo formal |
| Markdown | Edição, integração |
| JSON | Dados brutos |

### 8.2 Download

- Via dashboard: botão "Exportar"
- Via API: endpoint `/reports/{id}/export`
- Via conversa: "Exporta meu relatório semanal"

---

## 9. Email Delivery

### 9.1 Provider

Resend para envio de emails transacionais.

### 9.2 Templates

```html
<!-- report-weekly.html -->
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>
          {conteudo_formatado}
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### 9.3 Fallback

Se email falhar:
- Retry 3x com backoff
- Salvar como nota no app
- Notificação push informando

---

## 10. Save as Note

### 10.1 Automático

Relatórios são salvos como notas automáticas:
- Tipo: auto_generated = true
- Tags: ['report', 'weekly'] ou ['report', 'monthly']
- Título: "Relatório Semanal - {data}"

### 10.2 Acesso

- Via módulo de Notas
- Via busca na Memória
- Via histórico de relatórios

---

## 11. AI Tools

```typescript
{
  name: 'generate_report',
  description: 'Gera relatório sob demanda',
  parameters: z.object({
    type: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    areas: z.array(z.string()).optional(),
  }),
  requiresConfirmation: false,
}

{
  name: 'get_past_reports',
  description: 'Obtém relatórios anteriores',
  parameters: z.object({
    type: z.enum(['weekly', 'monthly', 'quarterly', 'annual']),
    limit: z.number().default(5),
  }),
  requiresConfirmation: false,
}
```

---

## 12. Data Model

### 12.1 reports

```typescript
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),

  type: varchar('type', { length: 50 }).notNull(),
  // Types: morning, weekly, monthly, quarterly, annual, custom

  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),

  content: jsonb('content').notNull(), // Dados estruturados
  markdown: text('markdown'), // Versão em texto

  sentAt: timestamp('sent_at'),
  channels: jsonb('channels').default([]), // ['email', 'push', 'telegram']

  noteId: uuid('note_id').references(() => notes.id), // Se salvo como nota

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 13. Definition of Done

- [ ] Morning summary com horário configurável
- [ ] Relatório semanal automático
- [ ] Relatório mensal automático
- [ ] Relatório trimestral
- [ ] Relatório anual/retrospectiva
- [ ] Exportação PDF e Markdown
- [ ] Envio por email
- [ ] Salvamento automático como nota
- [ ] Configurações de frequência/canais
- [ ] Testes unitários
- [ ] Testes E2E

---

*Última atualização: 27 Janeiro 2026*
