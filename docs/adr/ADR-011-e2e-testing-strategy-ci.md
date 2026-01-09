# ADR-011: Estratégia de Testes E2E no CI

## Status

Accepted

## Data

2026-01-08

## Contexto

O projeto possui testes E2E (Playwright) que dependem de Supabase para autenticação e database. No CI (GitHub Actions), há duas abordagens possíveis:

1. Pular testes que dependem de auth (rodar apenas smoke tests)
2. Iniciar Supabase no CI usando `supabase start`

A escolha afeta:
- Cobertura de testes (auth testada ou não)
- Tempo de CI (Supabase adiciona ~2-3 minutos)
- Paridade entre desenvolvimento e produção

## Decisão

Usar **Supabase CLI no CI** (`supabase start`) para rodar todos os testes E2E com cobertura completa de autenticação.

## Justificativa

### Documentação Oficial

A [documentação oficial do Supabase](https://supabase.com/docs/guides/local-development/testing/overview) recomenda explicitamente rodar Supabase no CI:

```yaml
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v1
- name: Start Supabase
  run: supabase start
- name: Run Tests
  run: supabase test db
```

### Melhores Práticas do Playwright

Per [Playwright Best Practices](https://playwright.dev/docs/best-practices):
- Rodar testes em cada commit e PR
- Usar ambientes isolados (Docker) para evitar conflitos
- Preferir cobertura completa sobre velocidade

### Alta Paridade Dev/Prod

Alinhado com ADR-009 (Supabase CLI para Desenvolvimento Local), manter a mesma stack no CI garante que bugs de integração sejam detectados antes do deploy.

## Consequências

### Positivas

- Testes completos incluindo autenticação
- Paridade entre dev, CI e prod
- Bugs de integração detectados cedo
- Triggers e RLS policies testados
- Maior confiança nos deploys

### Negativas

- Tempo adicional de CI (~2-3 minutos para `supabase start`)
- Requer Docker no runner (disponível em `ubuntu-latest`)
- Mais recursos de CI consumidos

## Implementação

Ver `.github/workflows/ci.yml` job `e2e`:

```yaml
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v1
  with:
    version: latest

- name: Start Supabase
  run: supabase start

- name: Run E2E tests
  run: pnpm --filter web test:e2e
  env:
    SUPABASE_URL: http://localhost:54321
    NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321

- name: Stop Supabase
  if: always()
  run: supabase stop
```

## Alternativas Consideradas

### Pular Testes de Auth (SKIP_GLOBAL_SETUP)

Usar `SKIP_GLOBAL_SETUP=true` para rodar apenas smoke tests.

**Por que não:**
- Cobertura reduzida (auth não testada)
- Bugs de integração passam despercebidos
- Não segue recomendação oficial do Supabase

### Supabase Cloud para CI

Apontar testes para instância Supabase remota (staging).

**Por que não:**
- Requer secrets adicionais
- Dados de teste em ambiente cloud
- Testes mais lentos (latência de rede)
- Custos adicionais
- Isolamento de testes comprometido

### Mock de Auth

Mockar completamente a autenticação no CI.

**Por que não:**
- Perde testes de integração reais
- Triggers e RLS policies não testados
- Menor paridade dev/prod
- Mocks podem divergir da implementação real

## Referências

- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright CI Setup](https://playwright.dev/docs/ci-intro)
- [ADR-009: Supabase CLI para Desenvolvimento Local](./ADR-009-supabase-cli-local-development.md)
