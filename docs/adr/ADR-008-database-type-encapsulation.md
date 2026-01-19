# ADR-008: Database Type Encapsulation

## Status

Accepted

## Data

2026-01-07

## Contexto

Durante a implementação do M0.6 (Next.js Web App), surgiu a necessidade de usar o cliente Drizzle ORM no serviço de database da API NestJS (`apps/api/src/database/database.service.ts`).

A questão era: como tipar o retorno do método `db` do `DatabaseService`?

### Opções consideradas:

1. Importar `NodePgDatabase` diretamente de `drizzle-orm/node-postgres` na API
2. Criar e exportar um tipo `Database` customizado do pacote `@life-assistant/database`

### Problema com a opção 1 (import direto):

```typescript
// apps/api/src/database/database.service.ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

get db(): NodePgDatabase<typeof schema> {
  return getDb();
}
```

**Erro TypeScript TS2742:**
```
The inferred type of 'db' cannot be named without a reference to
'../../../../packages/database/node_modules/@types/pg'.
This is likely not portable. A type annotation is necessary.
```

Além disso, ao tentar adicionar a importação, surge outro erro:
```
Cannot find module 'drizzle-orm/node-postgres' or its corresponding type declarations.
```

Isso acontece porque a API não tem (e não deveria ter) `drizzle-orm` como dependência direta.

## Decisão

Criar e exportar um tipo `Database` personalizado do pacote `@life-assistant/database`, encapsulando completamente os detalhes de implementação do Drizzle ORM.

## Justificativa

### Conformidade com Clean Architecture

Per docs/specs/engineering.md §1.1, seguimos Clean Architecture com camadas bem definidas:
- A API (presentation/application) não deveria depender de detalhes de infraestrutura (Drizzle ORM)
- O pacote `database` age como uma **Infrastructure Layer** que abstrai o ORM
- Consumidores do pacote devem depender de abstrações, não de implementações concretas

### Padrão Drizzle ORM

Conforme Context7 (Drizzle docs), o padrão comum é exportar a instância diretamente:

```typescript
// Padrão básico do Drizzle
export const db = drizzle({ client: pool, schema });
```

Nosso padrão melhora isso exportando também o tipo:

```typescript
// Nossa melhoria: singleton + tipo
export type Database = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): Database {
  db ??= drizzle(getPool(), { schema });
  return db;
}
```

### Benefícios da Encapsulação de Tipo

1. **Desacoplamento**: Apps não dependem de tipos do Drizzle diretamente
2. **Facilita Troca de ORM**: Se mudarmos de Drizzle para outro ORM, só atualizamos o pacote database
3. **Type Safety**: Mantém a segurança de tipos sem expor implementação
4. **Single Responsibility**: O pacote database é o único responsável por tipos de DB

### Vantagens sobre Alternativa 1

| Aspecto | Import Direto ❌ | Type Encapsulation ✅ |
|---------|------------------|----------------------|
| Acoplamento | Alto (depende de drizzle-orm) | Baixo (depende de @life-assistant/database) |
| Portabilidade | Baixa (TS2742 error) | Alta (tipo próprio) |
| Clean Architecture | Viola (infra vazando para app) | Respeita (abstração correta) |
| Manutenibilidade | Baixa (mudança de ORM afeta todos) | Alta (mudança isolada no pacote) |

## Consequências

### Positivas

- ✅ **Desacoplamento total**: API não conhece Drizzle, apenas o tipo `Database`
- ✅ **Facilita migração de ORM**: Trocar Drizzle por Prisma/TypeORM = mudar apenas `packages/database`
- ✅ **Type Safety mantida**: `Database` herda toda tipagem do Drizzle via `ReturnType`
- ✅ **Resolve erro TypeScript**: Sem mais TS2742 ou module not found
- ✅ **Consistente com docs/specs/engineering.md**: Segue padrão de encapsulação de packages

### Negativas

- ⚠️ **Indireção adicional**: Um nível a mais de abstração
- ⚠️ **Documentação necessária**: Devs precisam saber usar `Database` em vez de `NodePgDatabase`

As negativas são mínimas comparadas aos benefícios arquiteturais.

## Configuração Implementada

### packages/database/src/client.ts

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Tipo customizado que abstrai Drizzle
export type Database = ReturnType<typeof drizzle<typeof schema>>;

let db: Database | null = null;

export function getDb(): Database {
  db ??= drizzle(getPool(), { schema });
  return db;
}
```

### packages/database/src/index.ts

```typescript
// Exportar tipo junto com funções
export {
  getDb,
  getPool,
  closePool,
  withUserId,
  withTransaction,
  withUserTransaction,
  schema,
} from './client';

// Tipos exportados
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
export type { Database } from './client';
```

### apps/api/src/database/database.service.ts

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  getDb,
  getPool,
  closePool,
  withUserId,
  withTransaction,
  withUserTransaction,
  schema,
  type Database,  // Tipo encapsulado, não do Drizzle direto
} from '@life-assistant/database';
import type { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  get db(): Database {  // Tipo limpo, sem referências ao Drizzle
    return getDb();
  }

  // ... resto do código
}
```

## Alternativas Consideradas

### 1. Import Direto de NodePgDatabase

```typescript
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
get db(): NodePgDatabase<typeof schema> {
  return getDb();
}
```

**Por que não:**
- Viola Clean Architecture (camada app dependendo de infra)
- Erro TypeScript TS2742 (tipo não portável)
- Requer `drizzle-orm` como dependência na API
- Dificulta troca futura de ORM

### 2. Usar `any` ou `unknown`

```typescript
get db(): any {
  return getDb();
}
```

**Por que não:**
- Perde type safety completamente
- Vai contra TypeScript strict mode (docs/specs/engineering.md §10.1)
- Mascara problemas em vez de resolvê-los
- Não é uma solução arquitetural válida

### 3. Re-exportar NodePgDatabase do package database

```typescript
// packages/database/src/index.ts
export type { NodePgDatabase } from 'drizzle-orm/node-postgres';
```

**Por que não:**
- Ainda vaza detalhes de implementação (NodePgDatabase é específico do Drizzle)
- Não resolve o problema fundamental de acoplamento
- Se mudarmos de ORM, o nome do tipo vaza a tecnologia antiga
- Tipo customizado `Database` é mais semântico e agnóstico

## Aplicabilidade a Outros Packages

Este padrão deve ser replicado em:

- **`@life-assistant/ai`** (M1.1): Exportar tipo `LLM` em vez de tipos do Gemini/Claude SDK
- **`@life-assistant/config`**: Já usa tipo `EnvConfig` (correto ✅)
- **`@life-assistant/shared`**: Tipos são agnósticos (correto ✅)

Veja docs/specs/engineering.md §3.3 "Package Patterns and Conventions" para mais detalhes.

## Referências

- Clean Architecture Layers: docs/specs/engineering.md §1.1
- Package Dependency Rules: docs/specs/engineering.md §3.2
- Drizzle ORM Docs: https://orm.drizzle.team/docs/get-started-postgresql (Context7: /drizzle-team/drizzle-orm-docs)
- TypeScript Error TS2742: https://github.com/microsoft/TypeScript/issues/
- Pull Request: Resolve typecheck errors in M0.6 (2026-01-07)
