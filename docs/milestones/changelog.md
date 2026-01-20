# Changelog

> Histórico de progresso dos milestones.

---

## 2026

### Janeiro

| Data | Milestone | Ação | Notas |
|------|-----------|------|-------|
| 2026-01-20 | M2.1 | Concluído | Testes completos (243 total): 42 unit backend, 9 integration, 22 component, 8 hooks, 162 E2E. Tasks expandidas de 10 para 25. Fixes E2E: sidebar toggle, mobile-chrome skips, memory search debounce |
| 2026-01-19 | M3.8 | Criado | Decision Support Framework (ADR-016): persistência de decisões, tool `save_decision`, follow-up job, learning loop via Memory Consolidation. Tabelas já existem no banco (M0.4), milestone cria schema TypeScript e implementação completa |
| 2026-01-19 | Docs | Atualizado | Documentação completa de Decision Support: product.md (§1.4, §2.1, §5.1, §6.18), system.md (§1.9, §3.12), ai.md (§4.1, §6.2, §6.5.2, §6.9), data-model.md (§4.18), engineering.md (§2.4, §7.1). TBD-206 resolvido |
| 2026-01-19 | M2.6 | Criado | Módulo Finance: planejamento financeiro mensal com rendas, contas fixas, despesas variáveis (recorrentes + pontuais), dívidas com parcelas, investimentos. Dashboard com KPIs, gráficos, notificações de vencimento, integração com IA |
| 2026-01-16 | M0.8 | Migração | `middleware.ts` → `proxy.ts` (Next.js 16 convention). Corrigido technical debt marcado incorretamente como N/A. Atualizados comentários em server.ts e callback-recovery/route.ts |
| 2026-01-16 | Backlog | Adicionado | Seção "Segurança e RLS" no Backlog Técnico. 14 tabelas precisam de RLS nas migrations Supabase. Nota adicionada no M0.4 sobre gap identificado |
| 2026-01-15 | M1.3 | Bug fix | Corrigido bug crítico no Memory Consolidation (Zod null handling) que impedia criação de knowledge items. Melhorado script trigger (`--wait` flag). 6 novos testes. Docs atualizados (AI_SPECS §6.5, ENGINEERING §7.6) |
| 2026-01-15 | M1.9 | Chat UX | Markdown rendering com Streamdown + @tailwindcss/typography. Bug fixes: typing indicator (ThinkingIndicator + typewriter + auto-scroll), Memory area cards (ícones Lucide, truncate texto) |
| 2026-01-15 | M1.9 | UI Impl. | 14 tasks de UI implementadas: ErrorBoundary support link, empty states (Chat/Memory), error states com retry, toasts CRUD (Chat), dashboard skeleton, responsividade (sidebar mobile overlay, layouts responsive). Testes pendentes |
| 2026-01-15 | M1.9 | Reestruturado | Removidas tasks já implementadas em M0.6/M1.2/M1.4. Mantidas apenas: ajustes de texto (SYSTEM_SPECS §4.1), toasts Chat, responsividade, testes E2E. Tasks: 25→16 |
| 2026-01-15 | M1.8 | Movido | Confirmação de Tracking via Chat incorporado ao M2.1 — depende de infraestrutura de tracking. M1.9→M1.8, M1.10→M1.9, M1.11→M1.10 |
| 2026-01-15 | Docs | Atualizado | Gap Analysis: documentados fallbacks (AI_SPECS §10.4), tool loop limits (§6.8), conflict resolution (SYSTEM_SPECS §3.5, AI_SPECS §6.5.5), tool call logging (ENGINEERING §5.5), Raciocínio Inferencial (PRODUCT_SPECS §6.2). Tasks adicionadas: M1.9 (Logging Seguro), Backlog (stale memory) |
| 2026-01-15 | M1.5 | Removido | Conflita com filosofia Jarvis-first; knowledge_items cobre funcionalidade |
| 2026-01-15 | M1.4 | Removido | Intent Classification redundante com Tool Use (ADR-012). Seção 5 do docs/specs/ai.md removida. Diagrama e comandos no docs/specs/system.md atualizados. |
| 2026-01-14 | M1.6.1 | Concluído | Temporal Knowledge Management: detecção de mudanças de estado, UI toggle "Ver histórico", export com metadados temporais |
| 2026-01-14 | M1.6 | Concluído | Memory View completo: endpoints, filtros, UI /memory, testes unit/integration (E2E pendentes) |
| 2026-01-14 | M1.3 | Correções | Segurança: removido userId do admin endpoint. Bug fix: refreshSchedulers() no onboarding. Testes e docs atualizados |
| 2026-01-14 | M1.3 | DevTools | Admin endpoint para disparo manual do Memory Consolidation Job: AdminModule, POST /admin/jobs/memory-consolidation/trigger (NODE_ENV=development only) |
| 2026-01-14 | M1.3 | Testes Int. | Testes de integração: memory-endpoints (14), memory-tool-executor (14), memory-consolidation (18). Total 46 novos testes, 116 integration tests passando |
| 2026-01-13 | M1.7 | Concluído | Raciocínio Inferencial Real-time: tool analyze_context, executor com busca de fatos/padrões, system prompt com instruções de raciocínio, ADR-014, 8 novos testes unitários (total 294) |
| 2026-01-13 | M1.3 | Concluído | Sistema de Memória: UserMemoryService, KnowledgeItemsService, MemoryToolExecutor, Memory Consolidation Job (BullMQ timezone-aware), Context Builder, 106 novos testes (total 294) |
| 2026-01-13 | M1.2 | Concluído | Chat básico com SSE streaming, 6 endpoints REST, @SseAuth decorator, @SkipTransform decorator, persistência URL, dialog de confirmação de exclusão, 193 testes. Rate limiting → M3.6, data purge jobs → M3.5 |
| 2026-01-12 | M1.1 | Concluído | Package AI com LLM abstraction + Tool Use: GeminiAdapter, ClaudeAdapter, LLMFactory, rate limiting, retry, tool loop, 162 testes |
| 2026-01-08 | M0.7 | Concluído | Auth completo com Supabase: 8 endpoints, AuthProvider, middleware, 31 integration tests, 16 E2E specs, Page Objects, scripts infra |
| 2026-01-07 | M0.6 | Concluído | App web Next.js 16 com Turbopack, Tailwind v4, shadcn/ui, React Query, Zustand, Playwright E2E (12 testes), ADR-008 (Database Type Encapsulation) |
| 2026-01-07 | M0.5 | Concluído | App API NestJS com guards, interceptors, filters, decorators, health endpoints, Swagger, 150 testes (137 unit + 13 integration) |
| 2026-01-07 | M0.4 | Concluído | Package database com 28 tabelas, 21 enums, RLS policies, 230 testes (unit + integration) |
| 2026-01-07 | M0.3 | Concluído | Package config com validação Zod, 67 testes (100% coverage) |
| 2026-01-07 | M0.1 | Concluído | Setup completo do monorepo com Turborepo, pnpm workspaces, TypeScript, ESLint 9, Prettier, Docker Compose |
| 2026-01-06 | M0.2 | Concluído | Package shared com 8 enums, constantes, utilitários e 77 testes (100% coverage) |

---

*Última atualização: 20 Janeiro 2026*
