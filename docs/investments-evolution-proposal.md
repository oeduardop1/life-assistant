# Proposta: Evolução de Investimentos

> Documento de proposta para evolução da feature de Investimentos, habilitando histórico de valores, transações detalhadas, cotações automáticas e preparando o caminho para a página de Patrimônio.

---

## 1. Visão Geral

### Motivação

A feature atual de Investimentos é limitada a um registro estático de metas e valores atuais. Não há:
- Histórico de como o valor evoluiu ao longo do tempo
- Registro de transações (aportes, resgates)
- Atualização automática de cotações
- Base para calcular patrimônio histórico

### Objetivos

1. Permitir rastrear a evolução dos investimentos ao longo do tempo
2. Registrar transações individuais (aportes, resgates, rendimentos)
3. Automatizar atualização de valores para ativos com cotação pública
4. Habilitar visualizações e métricas de rentabilidade
5. Preparar base de dados para a futura página de Patrimônio

### Relação com Patrimônio

Esta evolução é **pré-requisito** para a página de Patrimônio. Com histórico de valores, será possível:
- Navegar por mês e ver patrimônio daquele período
- Mostrar evolução de Ativos vs Passivos ao longo do tempo
- Calcular crescimento patrimonial real

---

## 2. Situação Atual vs Proposta

| Aspecto | Hoje | Proposta |
|---------|------|----------|
| Valor do investimento | `currentAmount` único | Histórico mensal de valores |
| Transações | Não existe | Aportes, resgates, rendimentos, dividendos |
| Atualização de valor | Manual | Manual + automática via API |
| Tipos de ativo | Genéricos (emergency_fund, retirement...) | + Ativos com ticker (ETF, cripto, Tesouro) |
| Rentabilidade | Não calculada | Calculada por período |
| Visualização temporal | Sem filtro de data | Navegação por mês/período |
| Gráficos | Apenas progresso da meta | Evolução, composição, rentabilidade |

### Limitações Atuais Identificadas

1. **Sem histórico:** Impossível saber quanto valia o investimento em meses anteriores
2. **Atualização manual:** Usuário precisa lembrar de atualizar valores
3. **Sem transações:** Não há registro de quando/quanto foi aportado ou resgatado
4. **Cálculos limitados:** Apenas progresso (currentAmount / goalAmount)

---

## 3. Novas Funcionalidades

### 3.1 Transações de Investimento

Registro de movimentações financeiras em cada investimento.

| Tipo | Descrição | Impacto no Saldo |
|------|-----------|------------------|
| `deposit` | Aporte de capital | + valor |
| `withdrawal` | Resgate de capital | - valor |
| `yield` | Rendimento/juros | + valor |
| `dividend` | Dividendos recebidos | + valor (ou neutro se reinvestido) |

**Campos da transação:**
- Data da transação
- Valor
- Tipo
- Notas (opcional)
- Comprovante (opcional, futuro)

**Fluxo do usuário:**
1. Acessa investimento → clica em "Nova Transação"
2. Seleciona tipo (Aporte, Resgate, Rendimento, Dividendo)
3. Informa valor e data
4. Saldo é atualizado automaticamente

### 3.2 Histórico de Valores

Registro do valor do investimento ao longo do tempo.

**Abordagem:** Snapshot mensal automático + atualizações manuais

| Campo | Descrição |
|-------|-----------|
| `monthYear` | Mês de referência (YYYY-MM) |
| `balance` | Saldo no final do mês |
| `source` | `auto` (calculado) ou `manual` (informado) |
| `recordedAt` | Timestamp do registro |

**Geração de snapshots:**
- Ao final de cada mês (job automático)
- Quando usuário atualiza valor manualmente
- Quando transação é registrada

**Navegação temporal:**
- Usuário pode selecionar mês (como em Bills/Expenses)
- Visualiza valores históricos de cada investimento
- Compara evolução entre períodos

### 3.3 Cotações Automáticas

Para ativos com código/ticker público, buscar cotação automaticamente.

**Ativos suportados (V1):**

| Tipo | Fonte de Dados | Exemplo |
|------|----------------|---------|
| Criptomoedas | CoinGecko API | BTC, ETH, SOL |
| ETFs internacionais | Yahoo Finance | VOO, QQQ, VT |
| Ações internacionais | Yahoo Finance | AAPL, MSFT, GOOGL |
| Tesouro Direto | API Tesouro Nacional | Tesouro Selic, IPCA+ |

**Campos adicionais no investimento:**

| Campo | Descrição |
|-------|-----------|
| `assetCode` | Ticker ou código (ex: "BTC", "VOO") |
| `assetType` | `crypto`, `etf`, `stock`, `treasury`, `manual` |
| `quantity` | Quantidade de cotas/unidades |
| `lastQuote` | Última cotação obtida |
| `lastQuoteAt` | Timestamp da cotação |

**Cálculo automático:**
```
currentAmount = quantity × lastQuote
```

**Fluxo de cadastro:**
1. Usuário seleciona tipo: "Ativo com cotação automática"
2. Informa código (ex: "BTC" ou "VOO")
3. Sistema valida se código existe na API
4. Usuário informa quantidade de cotas
5. Valor é calculado automaticamente

**Frequência de atualização:**
- Sob demanda (quando usuário acessa a página)
- Cache de 15 minutos para evitar excesso de requisições

### 3.4 Visualizações e Gráficos

**Gráficos propostos:**

| Gráfico | Tipo | Dados |
|---------|------|-------|
| Evolução do patrimônio | Linha | Soma de todos investimentos por mês |
| Composição da carteira | Donut/Pizza | % por tipo de investimento |
| Rentabilidade mensal | Barras | Variação % mês a mês |
| Histórico de transações | Timeline | Lista cronológica de movimentações |

**Filtros disponíveis:**

| Filtro | Opções |
|--------|--------|
| Período | Mês específico, últimos 3/6/12 meses, ano, personalizado |
| Tipo de investimento | emergency_fund, retirement, crypto, etf, etc. |
| Ativo específico | Selecionar um investimento |

---

## 4. Métricas e Cálculos

### Rentabilidade

**Rentabilidade total:**
```
rentabilidade_total = (valor_atual - total_aportado) / total_aportado × 100
```

**Rentabilidade por período:**
```
rentabilidade_periodo = (valor_final - valor_inicial) / valor_inicial × 100
```

**Total aportado:**
```
total_aportado = SUM(transações do tipo 'deposit') - SUM(transações do tipo 'withdrawal')
```

### Métricas no Dashboard

| Métrica | Fórmula |
|---------|---------|
| Patrimônio Investido | SUM(currentAmount de todos investimentos) |
| Variação no mês | (valor_atual - valor_mês_anterior) / valor_mês_anterior |
| Total aportado (mês) | SUM(deposits do mês) |
| Total resgatado (mês) | SUM(withdrawals do mês) |
| Rendimentos (mês) | SUM(yields + dividends do mês) |

---

## 5. Integrações com APIs

### CoinGecko (Criptomoedas)

- **Endpoint:** `GET /simple/price?ids={coin}&vs_currencies=brl`
- **Limite:** 10-50 chamadas/minuto (free tier)
- **Moedas:** Bitcoin, Ethereum, Solana, etc.
- **Documentação:** https://www.coingecko.com/en/api

### Yahoo Finance (ETFs e Ações Internacionais)

- **Endpoint:** `GET /v8/finance/chart/{symbol}`
- **Limite:** Sem limite oficial, usar com moderação
- **Ativos:** VOO, QQQ, SPY, AAPL, etc.
- **Observação:** API não oficial, pode mudar

### Tesouro Direto (Títulos Públicos)

- **Endpoint:** API pública do Tesouro Nacional
- **URL:** https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json
- **Dados:** Preços de compra e venda, taxas

### Estratégia de Cache

| Ativo | TTL do Cache |
|-------|--------------|
| Criptomoedas | 5 minutos |
| ETFs/Ações | 15 minutos |
| Tesouro Direto | 1 hora |

---

## 6. Impacto em Outras Features

### Página de Patrimônio

Com histórico de valores, a página de Patrimônio poderá:
- Mostrar evolução de Ativos vs Passivos
- Navegar por mês como outras páginas
- Calcular patrimônio líquido histórico

### Dashboard de Finanças

Novos KPIs disponíveis:
- Variação do patrimônio investido no mês
- Rentabilidade acumulada
- Aportes vs Resgates do período

### AI Tools

Novas ferramentas para o assistente:
- `get_investment_history` — Histórico de um investimento
- `get_portfolio_evolution` — Evolução da carteira
- `get_investment_transactions` — Transações de um investimento
- `register_investment_transaction` — Registrar aporte/resgate via chat

---

## 7. Fora de Escopo (V1)

### Não incluído nesta fase

| Item | Motivo | Versão Futura |
|------|--------|---------------|
| Ações brasileiras (B3) | API não disponível para PF | V2 (se surgir solução) |
| FIIs brasileiros | Mesma limitação da B3 | V2 |
| Integração com corretoras | Requer agregador (custo) | V3 |
| Open Finance | Complexidade regulatória | V3+ |
| Projeções de rendimento | Depende de histórico consolidado | V2 |
| Comparativo com benchmarks | CDI, IBOV, S&P 500 | V2 |
| Import de extrato | Parsing complexo | V2 |

### Agregadores (Pluggy, Belvo)

Poderão ser considerados no futuro como feature premium:
- Custo: ~R$ 3-10 por usuário conectado/mês
- Vantagem: Sincronização automática com bancos e corretoras
- Requisito: Modelo de monetização definido

---

## 8. Próximos Passos

### Ordem de Implementação Sugerida

```
Fase 1: Transações
├── Tabela investment_transactions
├── CRUD de transações
├── Recalcular currentAmount baseado em transações
└── UI: Modal de nova transação

Fase 2: Histórico de Valores
├── Tabela investment_snapshots
├── Job de snapshot mensal
├── Navegação temporal na UI
└── Gráfico de evolução

Fase 3: Cotações Automáticas
├── Novo tipo de investimento "com ticker"
├── Integração CoinGecko
├── Integração Yahoo Finance
├── Integração Tesouro Direto
└── UI: Cadastro de ativo com cotação

Fase 4: Visualizações Avançadas
├── Gráfico de composição da carteira
├── Gráfico de rentabilidade
├── Filtros por período
└── Métricas no dashboard

Fase 5: Página de Patrimônio
├── Nova página /finance/net-worth
├── Ativos vs Passivos
├── Evolução histórica
└── KPIs de patrimônio
```

---

*Última atualização: 29 Janeiro 2026*
