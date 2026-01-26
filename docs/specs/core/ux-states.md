# UX States (Mandatory Behaviors)

> Comportamentos obrigatórios de UX para estados de interface.

---

## 1. Empty States

Estados exibidos quando não há dados para mostrar. Devem ser amigáveis e guiar o usuário para a próxima ação.

### 1.1 Mensagens por Contexto

| Contexto | Mensagem | CTA | Ícone |
|----------|----------|-----|-------|
| Sem tracking | "Comece a registrar seu dia!" | "Registrar primeiro peso" | `Activity` |
| Sem memória | "A IA ainda está aprendendo sobre você" | "Iniciar conversa" | `Brain` |
| Sem pessoas | "Adicione pessoas importantes" | "Adicionar pessoa" | `UserPlus` |
| Sem conversas | "Converse com sua assistente" | "Iniciar conversa" | `MessageSquare` |
| Sem pendências | "Tudo em dia!" | - | `CheckCircle` |
| Sem metas | "Defina objetivos para acompanhar seu progresso" | "Criar primeira meta" | `Target` |
| Sem hábitos | "Hábitos consistentes transformam a vida" | "Criar primeiro hábito" | `Repeat` |
| Sem notas | "Suas notas e reflexões aparecerão aqui" | "Criar nota" | `FileText` |
| Sem decisões | "Decisões importantes serão registradas aqui" | "Ver como funciona" | `GitBranch` |
| Vault vazio | "Suas informações sensíveis ficarão seguras aqui" | "Adicionar primeiro item" | `Lock` |
| Sem investimentos | "Acompanhe seus investimentos em um só lugar" | "Adicionar investimento" | `TrendingUp` |
| Sem dívidas | "Ótimo! Você não tem dívidas cadastradas" | - | `PartyPopper` |
| Filtro sem resultado | "Nenhum resultado encontrado" | "Limpar filtros" | `Search` |

### 1.2 Componente Empty State

```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### 1.3 Princípios de Design

| Princípio | Aplicação |
|-----------|-----------|
| **Tom positivo** | Nunca culpar o usuário por não ter dados |
| **Ação clara** | CTA específico para próximo passo |
| **Visual leve** | Ilustração ou ícone sutil, não agressivo |
| **Contexto** | Explicar brevemente o que aparecerá ali |

---

## 2. Loading States

Estados durante carregamento e processamento de dados.

### 2.1 Indicadores por Contexto

| Contexto | Indicador | Comportamento |
|----------|-----------|---------------|
| **Chat processando** | ThinkingIndicator | Spinner animado + "Pensando..." |
| **Chat respondendo** | StreamingMessage | Typewriter effect 5ms/char + cursor pulsante |
| **Gerando análise** | Progress bar | Barra + "Analisando..." |
| **Salvando dados** | Spinner discreto | Ícone pequeno no canto |
| **Carregando lista** | Skeleton loading | Placeholders animados |
| **Gerando relatório** | Progress + texto | Barra + "Gerando relatório..." |
| **Upload de arquivo** | Progress bar | Barra com % + nome do arquivo |
| **Sync em background** | Badge discreto | Ícone de sync no header |
| **Carregando página** | Page skeleton | Layout completo com placeholders |
| **Ação em botão** | Button loading | Spinner inline no botão |

### 2.2 ThinkingIndicator (Chat)

```typescript
// Exibido enquanto IA processa a mensagem
interface ThinkingIndicatorProps {
  variant?: 'default' | 'compact';
}

// Animação: 3 dots pulsantes
// Texto: "Pensando..." (default) ou apenas dots (compact)
// Timeout: Se > 30s, mostrar "Ainda processando..."
```

### 2.3 StreamingMessage (Chat)

```typescript
// Exibido durante streaming da resposta
interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
}

// Comportamentos:
// - Typewriter effect: 5ms por caractere
// - Cursor pulsante no final
// - Auto-scroll a cada 50 caracteres
// - Markdown renderizado incrementalmente
```

### 2.4 Skeleton Loading

```typescript
// Placeholders animados durante carregamento
// Usar para listas, cards, dashboards

// Padrões:
// - Pulse animation: opacity 0.5 → 1.0 (1.5s)
// - Manter proporções do conteúdo real
// - Limitar a 5-8 itens skeleton
```

### 2.5 Timeouts

| Operação | Timeout | Ação após timeout |
|----------|---------|-------------------|
| LLM Response | 60s | Retry ou erro amigável |
| API Call | 30s | Retry automático + erro |
| File Upload | 5min | Erro + sugerir arquivo menor |
| Export | 10min | Notificação quando pronto |
| Sync | 15s | Silent retry em background |

---

## 3. Error States

Estados de erro com mensagens claras e ações de recuperação.

### 3.1 Erros por Tipo

| Tipo | Código | Mensagem | Ação | Ícone |
|------|--------|----------|------|-------|
| **Rede** | NETWORK | "Sem conexão. Verifique sua internet." | Retry | `WifiOff` |
| **Servidor** | SERVER | "Algo deu errado. Tente novamente." | Retry | `ServerOff` |
| **Validação** | VALIDATION | "[Campo] inválido: [motivo específico]" | Corrigir campo | `AlertCircle` |
| **Rate limit** | RATE_LIMIT | "Limite atingido. Aguarde 1 minuto." | Aguardar | `Clock` |
| **Auth expirada** | AUTH_EXPIRED | "Sessão expirada. Faça login novamente." | Login | `LogOut` |
| **Permissão** | FORBIDDEN | "Você não tem permissão para isso." | - | `ShieldOff` |
| **Not found** | NOT_FOUND | "Item não encontrado ou foi removido." | Voltar | `FileQuestion` |
| **Conflito** | CONFLICT | "Dados foram alterados. Recarregue a página." | Reload | `RefreshCw` |
| **Payload** | PAYLOAD_TOO_LARGE | "Arquivo muito grande. Máximo: {size}MB" | Escolher outro | `FileWarning` |
| **LLM** | LLM_ERROR | "Não consegui processar sua mensagem. Tente de novo." | Retry | `Bot` |

### 3.2 Formato de Erro

```typescript
interface ErrorState {
  type: ErrorType;
  code: string;
  message: string;        // Mensagem amigável
  technicalMessage?: string; // Debug (só dev)
  action?: {
    label: string;
    type: 'retry' | 'redirect' | 'dismiss';
    onClick?: () => void;
    href?: string;
  };
  dismissable?: boolean;
}
```

### 3.3 Erros de Validação

Para erros de validação de formulário:

```typescript
// Exibir inline no campo
interface FieldError {
  field: string;
  message: string;
}

// Exemplos de mensagens:
// - "Email inválido: verifique o formato"
// - "Senha muito curta: mínimo 8 caracteres"
// - "Data inválida: não pode ser no futuro"
// - "Valor inválido: deve ser maior que zero"
```

### 3.4 Error Boundaries (React)

```typescript
// Componente para capturar erros de renderização
// Exibir fallback amigável + botão de reload
// Logar erro no Sentry automaticamente
```

### 3.5 Regras de Exibição

| Regra | Descrição |
|-------|-----------|
| **Nunca jargão técnico** | "500 Internal Server Error" → "Algo deu errado" |
| **Sempre ação** | Todo erro deve ter próximo passo claro |
| **Não culpar usuário** | "Você errou" → "Não conseguimos" |
| **Retry automático** | Erros de rede: retry 3x antes de mostrar |
| **Contexto preservado** | Não perder dados do formulário no erro |

---

## 4. Partial Data States

Estados quando há dados parciais ou insuficientes.

### 4.1 Indicadores

| Contexto | Indicador | Mensagem |
|----------|-----------|----------|
| **Score incompleto** | Banner info | "Score baseado nos dados que você compartilhou" |
| **Área sem dados** | Badge + ícone ⚠️ | "Sem dados suficientes" |
| **Histórico limitado** | Texto info | "Mostrando últimos 30 dias" |
| **Cálculo aproximado** | Tooltip | "Valor aproximado com base em {n} registros" |
| **Gráfico esparso** | Linha pontilhada | Gaps visuais onde faltam dados |
| **Tendência incerta** | Indicador neutro | "↔" ao invés de "↑" ou "↓" |

### 4.2 Filosofia (ADR-015)

> O sistema NÃO penaliza ou cobra tracking não realizado.

**Mensagens que DEVEM aparecer:**
- "Score baseado nas métricas que você compartilhou"
- "Área [X] calculada com os dados disponíveis"
- "Para análise mais precisa, mais registros ajudam"

**Mensagens que NÃO devem aparecer:**
- ~~"Dados insuficientes - continue registrando!"~~
- ~~"Registre mais para ver resultados"~~
- ~~"Você não registrou hoje"~~

### 4.3 Threshold de Dados

| Contexto | Threshold | Comportamento |
|----------|-----------|---------------|
| Life Balance Score | < 3 dias | Não exibir, mostrar onboarding |
| Area Score | 0 registros | Retornar 50 (neutro) |
| Trend Analysis | < 30% density | Warning + confidence='low' |
| Gráficos | < 3 pontos | Não exibir gráfico, mostrar lista |

---

## 5. Success States

Feedback positivo após ações bem-sucedidas.

### 5.1 Toasts de Sucesso

| Ação | Toast | Duração |
|------|-------|---------|
| **Tracking salvo** | "Peso registrado! 82.5kg" | 3s |
| **Nota criada** | "Nota criada" | 3s |
| **Configuração salva** | "Preferências atualizadas" | 3s |
| **Conta paga** | "Conta marcada como paga!" | 3s |
| **Meta atingida** | "Parabéns! Meta concluída!" | 5s |
| **Hábito completado** | "Hábito registrado! Streak: 5 dias" | 4s |
| **Export pronto** | "Download pronto!" | 5s |
| **Integração conectada** | "Google Calendar conectado!" | 4s |

### 5.2 Componente Toast

```typescript
interface ToastProps {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
  duration?: number; // ms, default 3000
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### 5.3 Animações de Sucesso

| Contexto | Animação |
|----------|----------|
| Checkbox marcado | Checkmark com bounce |
| Meta atingida | Confetti sutil |
| Streak milestone | Flame icon com pulse |
| Upload completo | Progress bar → checkmark |
| Sync completo | Rotate → checkmark |

---

## 6. Confirmation Dialogs

Confirmações antes de ações destrutivas ou importantes.

### 6.1 Ações que Requerem Confirmação

| Ação | Tipo | Confirmação |
|------|------|-------------|
| **Deletar nota** | Soft delete | Modal simples |
| **Deletar vault item** | Hard delete | Modal com warning |
| **Deletar conta** | Irreversível | Modal + redigitar email |
| **Cancelar assinatura** | Importante | Modal + motivo (opcional) |
| **Deletar pessoa** | Soft delete | Modal simples |
| **Resetar dados** | Irreversível | Modal + confirmação texto |
| **Desvincular integração** | Importante | Modal com consequências |
| **Deletar recorrência (all)** | Múltiplos itens | Modal com quantidade |

### 6.2 Componente Confirmation Modal

```typescript
interface ConfirmationModalProps {
  title: string;
  description: string;
  confirmLabel: string;       // "Deletar", "Confirmar", etc.
  confirmVariant: 'danger' | 'warning' | 'default';
  requiresInput?: {
    label: string;
    expectedValue: string;    // Para confirmar digitando
  };
  consequences?: string[];    // Lista de consequências
  onConfirm: () => void;
  onCancel: () => void;
}
```

### 6.3 Exemplos de Modais

**Deletar nota (simples):**
```
Título: "Deletar nota?"
Descrição: "A nota irá para a lixeira por 30 dias."
Botões: [Cancelar] [Deletar]
```

**Deletar vault item (danger):**
```
Título: "Deletar permanentemente?"
Descrição: "Esta ação é irreversível. O item será removido permanentemente."
Botões: [Cancelar] [Deletar Permanentemente]
```

**Deletar conta (input required):**
```
Título: "Excluir sua conta?"
Descrição: "Todos os seus dados serão permanentemente removidos após 30 dias."
Consequências:
  - Conversas e memória serão perdidas
  - Tracking e histórico serão deletados
  - Assinatura será cancelada
Input: "Digite seu email para confirmar: [____]"
Botões: [Cancelar] [Excluir Conta]
```

---

## 7. Chat Response Typography

Renderização de respostas da IA com suporte a Markdown.

### 7.1 Elementos Suportados

| Markdown | Elemento | Estilo |
|----------|----------|--------|
| `**bold**` | Texto em negrito | `font-weight: 600` |
| `*italic*` | Texto em itálico | `font-style: italic` |
| `> quote` | Blockquote | Borda esquerda + padding + bg sutil |
| `- item` | Lista não ordenada | Bullet + indent |
| `1. item` | Lista ordenada | Número + indent |
| `` `code` `` | Inline code | Monospace + bg |
| ` ```code``` ` | Code block | Monospace + syntax + bg |
| `# heading` | Headings (h1-h6) | Tamanhos progressivos |
| `[link](url)` | Link | Azul + underline on hover |
| `![alt](url)` | Imagem | Renderizada inline |

### 7.2 Comportamento Durante Streaming

```typescript
// Usar biblioteca streamdown para parsing incremental
interface StreamingBehavior {
  // Markdown incompleto é auto-completado
  parseIncompleteMarkdown: true;

  // Cursor pulsante indica resposta em progresso
  showCursor: true;
  cursorBlinkRate: 500; // ms

  // Auto-scroll durante streaming
  autoScroll: true;
  autoScrollThreshold: 50; // chars

  // Typewriter effect
  typewriterSpeed: 5; // ms per char
}
```

### 7.3 Code Blocks

```typescript
interface CodeBlockProps {
  language?: string;
  code: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
}

// Syntax highlighting via Shiki ou Prism
// Copiar para clipboard com feedback
```

### 7.4 Links e Ações

- Links externos: abrem em nova aba
- Links internos: navegação SPA
- Menções (@pessoa): link para perfil
- Hashtags (#tag): link para busca

---

## 8. Form States

Estados de formulários e campos de input.

### 8.1 Estados de Campo

| Estado | Visual | Feedback |
|--------|--------|----------|
| **Default** | Borda neutra | - |
| **Focus** | Borda azul + ring | - |
| **Filled** | Borda sutil | Label flutuante (se aplicável) |
| **Error** | Borda vermelha | Mensagem de erro abaixo |
| **Success** | Borda verde + check | Mensagem de sucesso (opcional) |
| **Disabled** | Opacidade reduzida | Cursor not-allowed |
| **Loading** | Spinner interno | - |

### 8.2 Validação em Tempo Real

```typescript
interface FieldValidation {
  // Quando validar
  validateOn: 'blur' | 'change' | 'submit';

  // Debounce para change (evitar validar a cada tecla)
  debounceMs?: number; // default 300

  // Mostrar sucesso quando válido?
  showSuccessState?: boolean;
}
```

### 8.3 Formulários Multi-Step

```typescript
interface MultiStepFormState {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];

  // Visual: stepper ou progress bar
  indicatorType: 'stepper' | 'progress';

  // Navegação: permite voltar?
  allowBackNavigation: boolean;

  // Salvar progresso parcial?
  saveProgress: boolean;
}
```

---

## 9. Accessibility States

Estados para garantir acessibilidade.

### 9.1 Focus Management

| Contexto | Comportamento |
|----------|---------------|
| Modal aberto | Focus trap dentro do modal |
| Modal fechado | Retornar focus ao elemento que abriu |
| Form error | Focus no primeiro campo com erro |
| Toast | Anunciado por screen reader |
| Confirmação | Focus no botão de cancel (mais seguro) |

### 9.2 ARIA States

```typescript
// Estados ARIA obrigatórios
interface AriaStates {
  'aria-busy': boolean;      // Loading
  'aria-disabled': boolean;  // Disabled
  'aria-invalid': boolean;   // Error
  'aria-expanded': boolean;  // Collapsible
  'aria-selected': boolean;  // Selection
  'aria-live': 'polite' | 'assertive'; // Updates
}
```

### 9.3 Screen Reader Announcements

| Evento | Anúncio |
|--------|---------|
| Loading início | "Carregando..." |
| Loading fim | "Carregamento concluído" |
| Erro | "[Mensagem de erro]" |
| Sucesso | "[Mensagem de sucesso]" |
| Notificação | "[Conteúdo da notificação]" |

---

## 10. Responsive States

Adaptações por tamanho de tela.

### 10.1 Breakpoints

| Nome | Largura | Uso típico |
|------|---------|------------|
| `sm` | < 640px | Mobile |
| `md` | 640-768px | Tablet portrait |
| `lg` | 768-1024px | Tablet landscape |
| `xl` | 1024-1280px | Desktop pequeno |
| `2xl` | > 1280px | Desktop grande |

### 10.2 Adaptações Mobile

| Componente | Adaptação |
|------------|-----------|
| Sidebar | Drawer (hamburger menu) |
| Modal | Bottom sheet |
| Table | Cards empilhados |
| Dashboard | Layout single column |
| Charts | Scroll horizontal |
| Actions | Bottom bar fixed |

---

## Definition of Done

- [ ] Todos os empty states definidos e implementados
- [ ] Loading states com skeletons apropriados
- [ ] Error states com mensagens amigáveis e ações
- [ ] Confirmations para ações destrutivas
- [ ] Toasts de feedback funcionando
- [ ] Markdown renderizado corretamente no chat
- [ ] Streaming com cursor e auto-scroll
- [ ] Focus management para acessibilidade
- [ ] Responsive em todos os breakpoints

---

*Última atualização: 26 Janeiro 2026*
