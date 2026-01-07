# TBD_TRACKER.md — Life Assistant AI
> **Documento vivo.** Registra **decisões pendentes, dúvidas e itens a definir** durante o desenvolvimento.  
> Deve ser atualizado pela IA (Claude Code) sempre que encontrar algo que precisa de decisão humana.

---

## 🤖 Instruções para Claude Code

### Quando adicionar um TBD

Adicione um item neste arquivo quando:
- Encontrar **ambiguidade** nas specs que impede implementação
- Precisar de **decisão de negócio** (não técnica)
- Identificar **conflito** entre documentos
- Encontrar **caso de borda** não especificado
- Precisar de **credenciais/configuração** que não possui
- Identificar **risco ou trade-off** que o humano deve decidir

### Quando NÃO adicionar um TBD

Não adicione TBD para:
- Decisões técnicas que você pode tomar (escolha de biblioteca, etc)
- Coisas já definidas nos documentos de specs
- Bugs ou erros de implementação (use issues)
- Melhorias futuras já no roadmap

### Como adicionar

1. Escolha a categoria correta
2. Use o template abaixo
3. Preencha todos os campos
4. Adicione ao final da categoria

### Template de Item

```markdown
### [TBD-XXX] Título curto e descritivo

| Campo | Valor |
|-------|-------|
| **Status** | 🔴 Pendente / 🟡 Em discussão / 🟢 Resolvido |
| **Prioridade** | 🔴 Bloqueante / 🟡 Alta / 🟢 Baixa |
| **Categoria** | Negócio / Técnico / UX / Segurança / Integração |
| **Origem** | Arquivo ou contexto onde surgiu |
| **Data** | YYYY-MM-DD |

**Contexto:**
Descrição do contexto e por que isso surgiu.

**Pergunta/Decisão necessária:**
O que precisa ser decidido?

**Opções consideradas:**
1. Opção A - prós e contras
2. Opção B - prós e contras

**Recomendação da IA (se houver):**
O que a IA sugere e por quê.

**Decisão (preencher depois):**
_Pendente_

**Implementação (preencher depois):**
_Pendente_
```

---

## 📊 Resumo

| Status | Quantidade |
|--------|------------|
| 🔴 Pendente | 0 |
| 🟡 Em discussão | 0 |
| 🟢 Resolvido | 0 |
| **Total** | **0** |

| Prioridade | Quantidade |
|------------|------------|
| 🔴 Bloqueante | 0 |
| 🟡 Alta | 0 |
| 🟢 Baixa | 0 |

---

## 🔴 Bloqueantes

_Nenhum item bloqueante no momento._

<!-- 
Adicionar aqui itens que IMPEDEM o desenvolvimento de continuar.
Exemplo: credenciais faltando, decisão crítica de arquitetura, etc.
-->

---

## 🟡 Decisões de Negócio

_Nenhum item pendente no momento._

<!-- 
Adicionar aqui itens que precisam de decisão do product owner.
Exemplo: regras de negócio, limites, comportamentos de UX, etc.
-->

---

## 🔵 Decisões Técnicas

_Nenhum item pendente no momento._

<!-- 
Adicionar aqui itens técnicos que precisam de input humano.
Exemplo: escolha entre abordagens com trade-offs significativos, etc.
-->

---

## 🟣 Integrações

_Nenhum item pendente no momento._

<!-- 
Adicionar aqui itens relacionados a integrações externas.
Exemplo: credenciais, configurações de terceiros, limites de API, etc.
-->

---

## ⚪ UX/Design

_Nenhum item pendente no momento._

<!-- 
Adicionar aqui itens que precisam de decisão de design.
Exemplo: fluxos não especificados, textos de UI, comportamentos visuais, etc.
-->

---

## 🟢 Resolvidos (Histórico)

_Nenhum item resolvido ainda._

<!-- 
Mover itens resolvidos para cá com a decisão tomada.
Manter como histórico para referência futura.
-->

---

## 📋 Exemplo de Item Preenchido

### [TBD-001] Limite de mensagens no plano Free

| Campo | Valor |
|-------|-------|
| **Status** | 🟢 Resolvido |
| **Prioridade** | 🟡 Alta |
| **Categoria** | Negócio |
| **Origem** | Implementação de rate limiting |
| **Data** | 2026-01-15 |

**Contexto:**
Ao implementar o rate limiting para o chat, percebi que SYSTEM_SPECS.md define 50 mensagens/dia para Free, mas não especifica se isso inclui mensagens da IA ou apenas do usuário.

**Pergunta/Decisão necessária:**
O limite de 50 mensagens/dia conta apenas mensagens do usuário ou o total (usuário + IA)?

**Opções consideradas:**
1. **Apenas usuário** - Mais generoso, usuário envia 50, recebe 50 = 100 msgs no histórico
2. **Total (usuário + IA)** - Mais restritivo, 25 trocas por dia efetivamente

**Recomendação da IA:**
Opção 1 (apenas usuário) - Mais intuitivo para o usuário e alinha com como outros produtos contam.

**Decisão:**
✅ Opção 1 - Contar apenas mensagens do usuário.

**Implementação:**
Atualizado `chat.service.ts` para contar apenas `role: 'user'` no rate limit.

---

## 🔗 Referências Rápidas

| Documento | Quando consultar |
|-----------|------------------|
| `PRODUCT_SPECS.md` | Features, roadmap, personas |
| `SYSTEM_SPECS.md` | Regras de negócio, fluxos, limites |
| `ENGINEERING.md` | Stack, arquitetura, padrões |
| `AI_SPECS.md` | Prompts, comportamentos de IA |
| `DATA_MODEL.md` | Schema, tabelas, relações |
| `INTEGRATIONS_SPECS.md` | APIs externas, webhooks |

---

## 💡 Convenções de Numeração

- **TBD-0XX**: Bloqueantes (001-099)
- **TBD-1XX**: Decisões de Negócio (100-199)
- **TBD-2XX**: Decisões Técnicas (200-299)
- **TBD-3XX**: Integrações (300-399)
- **TBD-4XX**: UX/Design (400-499)

---

*Última atualização: Janeiro 2026*
