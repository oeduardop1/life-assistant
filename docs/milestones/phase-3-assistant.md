# Fase 3: Assistente (v3.x)

> **Objetivo:** Implementar integrações externas e funcionalidades de assistente pessoal.
> **Referências:** `docs/specs/domains/vault.md`, `docs/specs/domains/notifications.md`, `docs/specs/integrations/README.md`

---

## M3.1 — Integração Telegram 🔴

**Objetivo:** Implementar bot do Telegram para interação rápida.

**Referências:** `docs/specs/integrations/telegram.md`

**Tasks:**

**Backend:**
- [ ] Criar módulo `telegram`:
  - [ ] Webhook handler
  - [ ] Command handlers (/start, /peso, /agua, /gasto, etc)
  - [ ] Message handler (conversa com IA)
  - [ ] Voice handler (transcrição)
  - [ ] Photo handler (análise com vision)
- [ ] Implementar vinculação de conta
- [ ] Implementar envio de notificações:
  - [ ] Morning summary
  - [ ] Weekly report
  - [ ] Lembretes
  - [ ] Alertas
- [ ] Respeitar quiet hours
- [ ] Detectar bot bloqueado e desativar integração

**Frontend:**
- [ ] Página de configuração `/settings/telegram`:
  - [ ] Botão vincular/desvincular
  - [ ] Status da integração (conectado/desconectado/erro)
  - [ ] Configurar notificações por tipo
  - [ ] Configurar quiet hours
- [ ] Componentes:
  - [ ] TelegramLinkButton (gera link deep link)
  - [ ] TelegramStatus (badge de status com último sync)
  - [ ] NotificationPreferences (toggles por tipo)
  - [ ] QuietHoursConfig (horário início/fim)

**Testes:**
- [ ] Testes de integração:
  - [ ] Webhook handler processa mensagens corretamente
  - [ ] Command handlers (/peso, /agua, /gasto, etc.)
  - [ ] Message handler (conversa com IA)
  - [ ] Vinculação de conta
  - [ ] Envio de notificações
- [ ] Testes unitários:
  - [ ] Parser de comandos
  - [ ] Validação de quiet hours
  - [ ] Detecção de bot bloqueado
- [ ] Teste E2E: vincular Telegram → receber notificação

**Definition of Done:**
- [ ] Bot responde comandos
- [ ] Conversa com IA funciona
- [ ] Áudio é transcrito
- [ ] Vinculação funciona
- [ ] Notificações enviadas
- [ ] Quiet hours respeitado
- [ ] Bot bloqueado = integração desativada
- [ ] Testes passam

---

## M3.2 — Integração Google Calendar 🔴

**Objetivo:** Sincronizar eventos do Google Calendar.

**Referências:** `docs/specs/integrations/google-calendar.md`

**Tasks:**

**Backend:**
- [ ] Implementar OAuth flow com Google
- [ ] Criar serviço de sync:
  - [ ] Buscar calendários
  - [ ] Buscar eventos (próximos 30 dias)
  - [ ] Salvar localmente
- [ ] Criar job de sync a cada 15 min (com staggering)
- [ ] Implementar rate limiting e backoff
- [ ] Refresh token automático
- [ ] Desativar se token revogado

**Frontend:**
- [ ] Página `/settings/calendar`:
  - [ ] Botão conectar/desconectar Google
  - [ ] Selecionar calendários a sincronizar (checkboxes)
  - [ ] Status do sync (último sync, próximo sync)
  - [ ] Botão forçar sync manual
- [ ] Componentes:
  - [ ] GoogleConnectButton (inicia OAuth flow)
  - [ ] CalendarSelector (lista de calendários com checkboxes)
  - [ ] SyncStatus (timestamp do último sync + indicador)
  - [ ] CalendarEventCard (evento na agenda)

**Uso no sistema:**
- [ ] Eventos aparecem no morning summary
- [ ] IA considera agenda ao sugerir

**Testes:**
- [ ] Testes de integração:
  - [ ] OAuth flow completo
  - [ ] Busca de calendários
  - [ ] Busca de eventos
  - [ ] Salvamento local de eventos
  - [ ] Refresh token automático
- [ ] Testes unitários:
  - [ ] Rate limiting e backoff
  - [ ] Detecção de token revogado
  - [ ] Staggering de sync entre usuários
- [ ] Teste E2E: conectar Google → ver eventos no dashboard

**Definition of Done:**
- [ ] OAuth funciona
- [ ] Sync a cada 15 min
- [ ] Eventos aparecem no app
- [ ] Morning summary inclui eventos
- [ ] Desconectar remove tokens
- [ ] Testes passam

---

## M3.3 — Vault (Informações Sensíveis) 🔴

**Objetivo:** Implementar área segura para dados sensíveis.

**Referências:** `docs/specs/domains/vault.md`

**Tasks:**

**Backend:**
- [ ] Criar módulo `vault`:
  - [ ] CRUD de vault items
  - [ ] Criptografia AES-256-GCM + Argon2id
  - [ ] Re-autenticação para acesso
  - [ ] Timeout de 5 minutos
- [ ] Tipos de item: credential, document, card, note, file
- [ ] Categorias: personal, financial, work, health, legal
- [ ] Audit log de acessos
- [ ] NUNCA expor via tools de busca (segurança)

**Frontend:**
- [ ] Criar página `/vault`:
  - [ ] Lista de itens por categoria
  - [ ] Modal de re-autenticação
  - [ ] Formulários por tipo de item
  - [ ] Visualização com reveal de senha
- [ ] Componentes:
  - [ ] VaultItem (card com ícone por tipo)
  - [ ] VaultItemForm (formulário dinâmico por tipo)
  - [ ] ReauthModal (modal de re-autenticação)
  - [ ] PasswordReveal (botão de mostrar/ocultar)
  - [ ] SecureInput (input com máscara)
  - [ ] VaultCategoryTabs (filtro por categoria)
  - [ ] SessionTimer (countdown do timeout de 5 min)

**Testes:**
- [ ] Testes unitários:
  - [ ] Criptografia AES-256-GCM
  - [ ] Derivação de chave com Argon2id
  - [ ] Validação de tipos de item
  - [ ] Lógica de timeout (5 min)
- [ ] Testes de integração:
  - [ ] CRUD de vault items via API
  - [ ] Re-autenticação requerida para acesso
  - [ ] Audit log é criado em cada acesso
  - [ ] Vault items NÃO são acessíveis via search_knowledge tool
- [ ] Teste de segurança:
  - [ ] Dados estão criptografados no banco
  - [ ] Não é possível acessar sem re-auth após timeout
- [ ] Teste E2E: criar item → re-autenticar → visualizar → verificar audit log

**Definition of Done:**
- [ ] CRUD funciona
- [ ] Dados criptografados no banco
- [ ] Re-autenticação requerida
- [ ] Timeout funciona
- [ ] Audit log de acessos
- [ ] Vault não aparece em buscas (search_knowledge)
- [ ] Testes passam

---

## M3.4 — Notificações Proativas 🔴

**Objetivo:** Implementar sistema de notificações e check-ins proativos.

**Referências:** `docs/specs/domains/notifications.md`, `docs/specs/core/ai-personality.md`

**Tasks:**

**Backend:**
- [ ] Criar módulo `notifications`:
  - [ ] Tipos: reminder, alert, report, insight, milestone, social
  - [ ] Canais: push (web), telegram, email, in-app
  - [ ] Respeitar quiet hours
  - [ ] Preferências por tipo
- [ ] Implementar check-ins proativos (conforme `docs/specs/core/ai-personality.md`):
  - [ ] Dias sem tracking
  - [ ] Queda de humor
  - [ ] Evento próximo
- [ ] Implementar tool `suggest_action` para proatividade durante conversa (JARVIS-first):
  - [ ] Analisar contexto atual + memória + tracking
  - [ ] Retornar sugestões de ação baseadas em padrões detectados
  - [ ] Exemplos: "Você não registrou exercício há 5 dias", "Seu humor está baixo há 3 dias"
  - [ ] LLM decide quando chamar baseado no contexto da conversa
- [ ] Implementar sistema de follow-ups (JARVIS-first):
  - [ ] Data Model: Nova tabela `scheduled_followups` (topic, context, scheduledFor, sourceType, sourceId, status)
  - [ ] Tool `create_followup`: Input `{ topic, scheduledFor, context? }`, Output `{ id, scheduledFor }`
  - [ ] Job diário para verificar follow-ups pendentes e criar notificações
  - [ ] Integração: follow-ups aparecem na lista de check-ins do dia
- [ ] Criar jobs para envio
- [ ] Implementar job de notificações de onboarding abandonado (conforme `docs/specs/core/user-journeys.md`):
  - [ ] Dia 3: email "Complete seu cadastro para começar a usar o app!"
  - [ ] Dia 7: email "Falta pouco! Termine o cadastro."
  - [ ] Dia 14: email "Seus dados expiram em 16 dias. Complete agora!"
  - [ ] Dia 25: email "Última chance! Seus dados serão removidos em 5 dias."
- [ ] Criar template de email para lembretes de onboarding

**Backend - Data Retention & Purge Jobs (Per `docs/specs/core/auth-security.md`, `docs/adr/ADR-010-soft-delete-strategy.md`):**
- [ ] Criar job `purge-soft-deleted-users`:
  - [ ] Executar diariamente
  - [ ] Hard delete registros com `deletedAt > 30 dias`
  - [ ] Cascade delete de dados relacionados (conversations, messages, etc.)
- [ ] Criar job `purge-soft-deleted-conversations`:
  - [ ] Executar diariamente
  - [ ] Hard delete registros com `deletedAt > 90 dias`
  - [ ] Enviar email de aviso 5 dias antes (dia 85)
- [ ] Criar job `purge-soft-deleted-notes`:
  - [ ] Executar diariamente
  - [ ] Hard delete registros com `deletedAt > 30 dias`
  - [ ] Enviar email de aviso 5 dias antes (dia 25)
- [ ] Criar templates de email para avisos de purge:
  - [ ] "Suas conversas serão excluídas permanentemente em 5 dias"
  - [ ] "Suas notas serão excluídas permanentemente em 5 dias"

**Frontend:**
- [ ] Página `/settings/notifications`:
  - [ ] Configurar canais (push, telegram, email)
  - [ ] Configurar tipos de notificação
  - [ ] Configurar quiet hours
  - [ ] Configurar frequência de check-ins
- [ ] Página `/notifications`:
  - [ ] Histórico de notificações
  - [ ] Marcar como lida
  - [ ] Filtros por tipo
- [ ] Componentes:
  - [ ] NotificationBell (ícone no header com badge de não lidas)
  - [ ] NotificationDropdown (lista rápida de recentes)
  - [ ] NotificationCard (card individual)
  - [ ] NotificationPreferencesForm (configurações por tipo)
  - [ ] ChannelToggle (toggle por canal)
  - [ ] QuietHoursInput (horário início/fim)

**Testes:**
- [ ] Testes de integração:
  - [ ] Envio por cada canal (push, telegram, email)
  - [ ] Respeito ao quiet hours
  - [ ] Preferências por tipo
  - [ ] Job de notificação de onboarding abandonado envia emails nos dias corretos
  - [ ] Job de purge users (soft deleted > 30 dias)
  - [ ] Job de purge conversations (soft deleted > 90 dias)
  - [ ] Job de purge notes (soft deleted > 30 dias)
  - [ ] Email de aviso pré-purge enviado 5 dias antes
- [ ] Testes unitários:
  - [ ] Lógica de check-in proativo (dias sem tracking, queda de humor, etc.)
  - [ ] Validação de preferências
  - [ ] Cálculo de data de purge (30/90 dias)
- [ ] Teste E2E: configurar preferências → receber notificação do tipo configurado
- [ ] Teste E2E: verificar quiet hours bloqueia notificação

**Definition of Done:**
- [ ] Notificações enviadas por todos os canais
- [ ] Quiet hours respeitado
- [ ] Check-ins proativos funcionam
- [ ] Preferências configuráveis
- [ ] Notificações de onboarding abandonado enviadas nos dias corretos
- [ ] Jobs de purge executam corretamente (users 30d, conversations 90d, notes 30d)
- [ ] Emails de aviso pré-purge enviados 5 dias antes
- [ ] Testes passam

---

## M3.5 — Stripe (Pagamentos) 🔴

**Objetivo:** Implementar sistema de assinaturas e pagamentos.

**Referências:** `docs/specs/integrations/stripe.md`

**Tasks:**

**Backend:**
- [ ] Criar módulo `billing`:
  - [ ] Checkout session para upgrade
  - [ ] Webhook handlers (subscription events)
  - [ ] Portal de billing
- [ ] Implementar planos: Free, Pro, Premium
- [ ] Aplicar limites por plano:
  - [ ] Rate limiting de mensagens por plano (migrado de M1.2)
  - [ ] Usar Redis (Upstash) para storage distribuído
  - [ ] Implementar ThrottlerBehindProxyGuard para Railway/Vercel
  - [ ] Limites conforme `docs/specs/core/auth-security.md`
- [ ] Notificar falhas de pagamento

**Frontend:**
- [ ] Página `/settings/billing`:
  - [ ] Plano atual com features
  - [ ] Botões de upgrade/downgrade
  - [ ] Histórico de faturas
  - [ ] Link para portal Stripe
- [ ] Componentes:
  - [ ] PlanCard (nome, preço, features, botão de ação)
  - [ ] PlanComparison (tabela comparativa dos planos)
  - [ ] CurrentPlanBadge (badge do plano atual)
  - [ ] UsageMeter (uso vs limite por feature)
  - [ ] InvoiceList (lista de faturas)
  - [ ] PaymentMethodCard (último 4 dígitos do cartão)
  - [ ] UpgradeModal (confirmação de upgrade)

**Testes:**
- [ ] Testes de integração:
  - [ ] Checkout session é criada corretamente
  - [ ] Webhook handlers processam eventos (subscription.created, .updated, .deleted, invoice.paid, invoice.payment_failed)
  - [ ] Portal de billing redireciona corretamente
  - [ ] Limites são aplicados após upgrade/downgrade
- [ ] Testes unitários:
  - [ ] Verificação de limites por plano
  - [ ] Cálculo de uso vs limite
- [ ] Teste E2E: upgrade de plano → verificar novas features
- [ ] Teste E2E: verificar limite de mensagens no plano Free

**Definition of Done:**
- [ ] Upgrade funciona
- [ ] Limites aplicados por plano
- [ ] Cancelamento funciona
- [ ] Notificações de falha
- [ ] Testes passam

---

## M3.6 — Storage (Cloudflare R2) 🔴

**Objetivo:** Implementar upload e armazenamento de arquivos.

**Referências:** `docs/specs/integrations/cloudflare-r2.md`

**Tasks:**

**Backend:**
- [ ] Criar `StorageService` com integração R2:
  - [ ] `uploadFile(file, path)` - upload de arquivo
  - [ ] `getSignedUrl(path)` - URL temporária para download
  - [ ] `deleteFile(path)` - remover arquivo
- [ ] Implementar upload de avatar:
  - [ ] Validar tipo (jpg, png, webp)
  - [ ] Validar tamanho (max 2MB)
  - [ ] Redimensionar para 256x256
- [ ] Implementar upload de anexos (notas):
  - [ ] Validar tipos permitidos (imagens, PDFs)
  - [ ] Validar tamanho por plano
- [ ] Implementar export de dados:
  - [ ] Gerar arquivo ZIP com dados do usuário
  - [ ] Presigned URL para download (24h)
  - [ ] Job assíncrono para geração
- [ ] Presigned URLs para download seguro

**Frontend:**
- [ ] Componentes:
  - [ ] AvatarUpload (preview, crop, upload)
  - [ ] FileUpload (drag & drop, progress)
  - [ ] FilePreview (thumbnail, nome, tamanho)
  - [ ] ExportDataButton (solicitar export)
  - [ ] DownloadLink (link com expiração)

**Testes:**
- [ ] Testes de integração:
  - [ ] Upload de arquivo para R2
  - [ ] Download via presigned URL
  - [ ] Deleção de arquivo
  - [ ] Export de dados completo
- [ ] Testes unitários:
  - [ ] Validação de tipo de arquivo
  - [ ] Validação de tamanho
  - [ ] Geração de presigned URL
- [ ] Teste E2E: upload de avatar → ver avatar no perfil
- [ ] Teste E2E: anexar arquivo em nota → download do anexo

**Definition of Done:**
- [ ] Upload funciona
- [ ] Download funciona
- [ ] Avatars funcionam
- [ ] Exports funcionam
- [ ] Validações de tamanho/tipo aplicadas
- [ ] Testes passam

