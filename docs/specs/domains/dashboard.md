# Dashboard & Visualization Module

> Dashboard principal com Life Balance Score, widgets e visualizações.

---

## 1. Overview

O Dashboard é a visão central do Life Assistant, mostrando o estado geral da vida do usuário através do Life Balance Score, métricas por área, tendências e insights da IA.

---

## 2. Life Balance Score Widget

### 2.1 Score Principal

```
┌─────────────────────────────────────┐
│        Life Balance Score           │
│                                     │
│              7.4                    │
│              ───                    │
│              /10                    │
│                                     │
│        ↑ +0.3 vs semana passada     │
│                                     │
│  "Baseado no que você compartilhou" │
└─────────────────────────────────────┘
```

### 2.2 Componentes Visuais

| Elemento | Descrição |
|----------|-----------|
| Score numérico | 0.0 - 10.0 |
| Cor | Verde (>7.5), Amarelo (>5), Vermelho (<5) |
| Variação | Comparativo com período anterior |
| Tooltip | Explicação do cálculo |

> **Nota:** Score interno é 0-100, exibido como 0-10 na UI (ver `domains/tracking.md`).

---

## 3. Area Scores Widget

### 3.1 Visão por Área

```
┌─────────────────────────────────────┐
│          Scores por Área            │
│                                     │
│  💪 Saúde        7.8  ████████░░ ↑  │
│  💰 Financeiro   7.0  ███████░░░ ↓  │
│  🏢 Profissional 8.2  ████████░░ ↑  │
│  📚 Aprendizado  6.5  ██████░░░░ =  │
│  ⛪ Espiritual   8.0  ████████░░ ↑  │
│  👥 Relac.       7.2  ███████░░░ =  │
│                                     │
└─────────────────────────────────────┘
```

### 3.2 Comportamento

| Estado | Visual |
|--------|--------|
| Com dados | Score + barra + tendência |
| Sem dados | "—" ou "Sem dados" |
| Poucos dados | Score + "Dados limitados" |

---

## 4. Temporal Comparison

### 4.1 Períodos Disponíveis

| Comparação | Descrição |
|------------|-----------|
| vs Semana passada | 7 dias anteriores |
| vs Mês passado | 30 dias anteriores |
| vs Trimestre passado | 90 dias anteriores |
| vs Ano passado | 365 dias anteriores |

### 4.2 Visualização

Seletor de período com variação exibida:
- ↑ Verde: Melhorou
- ↓ Vermelho: Piorou
- = Cinza: Estável (variação < 5%)

---

## 5. Trends & Indicators

### 5.1 Widget de Tendências

```
┌─────────────────────────────────────┐
│           Tendências                │
│                                     │
│  📈 Peso         -1.2kg (30 dias)   │
│  📈 Exercício    +15% frequência    │
│  📉 Sono         -0.5h média        │
│  📈 Orçamento    85% utilizado      │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 Cálculo de Tendência

- Regressão linear simples
- Direção: subindo, descendo, estável
- Magnitude: quanto mudou
- Período: últimos 7, 30, 90 dias

---

## 6. Positive Highlights

### 6.1 Widget de Destaques

```
┌─────────────────────────────────────┐
│        Destaques da Semana 🏆       │
│                                     │
│  ✓ 4 treinos registrados            │
│  ✓ Devocional 5x esta semana        │
│  ✓ Peso estável (meta mantida)      │
│  ✓ Reunião produtiva com cliente    │
│                                     │
└─────────────────────────────────────┘
```

### 6.2 Fontes de Destaques

- Metas atingidas
- Hábitos com alta consistência
- Métricas que melhoraram
- Conquistas mencionadas em conversas

---

## 7. Attention Points

### 7.1 Widget de Alertas

```
┌─────────────────────────────────────┐
│        Pontos de Atenção ⚠️         │
│                                     │
│  ! Conta de luz vence em 3 dias     │
│  ! Sono abaixo da média (5.2h)      │
│  ! Consulta médica agendada amanhã  │
│                                     │
└─────────────────────────────────────┘
```

### 7.2 Tipos de Alertas

| Tipo | Trigger |
|------|---------|
| Financeiro | Contas vencendo |
| Saúde | Métricas fora do padrão |
| Agenda | Compromissos próximos |
| Metas | Em risco de não atingir |
| Pessoas | Contato atrasado |

---

## 8. Evolution Charts

### 8.1 Gráfico de Evolução

```
┌─────────────────────────────────────┐
│        Evolução - Peso              │
│                                     │
│    84 ┤           ╭─╮               │
│    83 ┤      ╭───╯  ╰───╮           │
│    82 ┤╭────╯            ╰──        │
│    81 ┤                             │
│       └─────────────────────────    │
│        Jan   Fev   Mar   Abr        │
│                                     │
└─────────────────────────────────────┘
```

### 8.2 Métricas Disponíveis

- Peso
- Sono (média semanal)
- Exercício (frequência)
- Humor (média)
- Gastos (por categoria)
- Score geral

---

## 9. Correlations

### 9.1 Widget de Correlações

```
┌─────────────────────────────────────┐
│        Padrões Identificados        │
│                                     │
│  📊 "Semanas com devocional >80%    │
│      têm gastos impulsivos 30%      │
│      menores"                       │
│                                     │
│  📊 "Seu humor é melhor em dias     │
│      que você treina pela manhã"    │
│                                     │
└─────────────────────────────────────┘
```

### 9.2 Detecção

- Memory Consolidation identifica padrões
- Correlações com confiança > 70% exibidas
- Usuário pode validar ou rejeitar

---

## 10. AI Insights Widget

### 10.1 Insights Personalizados

```
┌─────────────────────────────────────┐
│        Insight da IA 💡             │
│                                     │
│  "Percebi que você mencionou        │
│   cansaço várias vezes esta semana. │
│   Seu sono médio está em 5.8h,      │
│   abaixo da sua meta de 7h.         │
│   Que tal priorizar descanso?"      │
│                                     │
│           [Falar sobre isso]        │
└─────────────────────────────────────┘
```

### 10.2 Fonte de Insights

- Análise de conversas
- Correlações de métricas
- Padrões temporais
- Comparação com histórico

---

## 11. Customizable Widgets

### 11.1 Widgets Disponíveis

| Widget | Descrição |
|--------|-----------|
| Life Balance Score | Score principal |
| Scores por Área | 6 áreas com barras |
| Tendências | Métricas selecionadas |
| Destaques | Conquistas da semana |
| Alertas | Pontos de atenção |
| Gráfico | Evolução de métrica |
| Insight | Sugestão da IA |
| Agenda | Próximos eventos |
| Hábitos | Streak e consistência |
| Metas | Progresso de metas |

### 11.2 Personalização

- Arrastar e soltar
- Redimensionar
- Ocultar widgets
- Layouts salvos

---

## 12. Themes

### 12.1 Light Mode

```css
--background: #ffffff
--foreground: #0f172a
--primary: #3b82f6
--secondary: #64748b
```

### 12.2 Dark Mode

```css
--background: #0f172a
--foreground: #f8fafc
--primary: #60a5fa
--secondary: #94a3b8
```

### 12.3 Preferência

- Segue sistema operacional
- Override manual
- Persistido em preferências

---

## 13. Responsive Design

### 13.1 Desktop (>1024px)

- Grid de widgets 3-4 colunas
- Sidebar sempre visível
- Gráficos completos

### 13.2 Tablet (768-1024px)

- Grid 2 colunas
- Sidebar colapsável
- Gráficos adaptados

### 13.3 Mobile (<768px)

- Stack vertical
- Navegação bottom bar
- Widgets compactos
- Gráficos simplificados

---

## 14. Definition of Done

- [ ] Widget de Life Balance Score
- [ ] Widget de Scores por Área
- [ ] Comparativo temporal
- [ ] Widget de Tendências
- [ ] Widget de Destaques
- [ ] Widget de Alertas
- [ ] Gráficos de evolução
- [ ] Widget de Correlações
- [ ] Widget de Insights da IA
- [ ] Widgets customizáveis
- [ ] Dark mode
- [ ] Responsivo (mobile-first)
- [ ] Testes E2E

---

*Última atualização: 26 Janeiro 2026*
