# Vault

> Secure storage for sensitive information: credentials, documents, cards.

---

## 1. Overview

O Vault é uma área segura para informações sensíveis:
- Credenciais (logins, senhas)
- Documentos (CPF, RG, passaporte)
- Cartões (crédito, débito)
- Notas seguras
- Arquivos criptografados
- Preferências pessoais (tamanhos de roupa/calçado, alergias, restrições)
- Contatos importantes (médicos, advogados, contador, prestadores)
- Planos e seguros (saúde, dental, seguro auto/vida/residencial)
- Endereços (residencial, trabalho, entrega)
- Veículos (placa, RENAVAM, vencimentos)
- Imóveis (informações de propriedades)
- Busca rápida: "Qual meu número do passaporte?"

### Security Principles

- **NÃO acessível** pela IA sem re-autenticação
- Criptografia AES-256 em repouso
- Timeout de sessão: 5 minutos
- Audit log obrigatório para todo acesso

---

## 2. Entity Structure

### Vault Item

```typescript
interface VaultItem {
  id: string;
  userId: string;
  type: VaultItemType;
  category: VaultCategory;
  name: string;
  encryptedData: Buffer;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Types

```typescript
enum VaultItemType {
  CREDENTIAL = 'credential',
  DOCUMENT = 'document',
  CARD = 'card',
  NOTE = 'note',
  FILE = 'file',
}

enum VaultCategory {
  PERSONAL = 'personal',
  FINANCIAL = 'financial',
  WORK = 'work',
  HEALTH = 'health',
  LEGAL = 'legal',
  OTHER = 'other',
}
```

---

## 3. Security Rules

| Regra | Implementação |
|-------|---------------|
| Re-autenticação | Senha ou biometria antes de acessar |
| Timeout | Sessão expira em 5 minutos |
| Criptografia | AES-256 por item |
| Audit log | Toda operação é logada |
| IA bloqueada | Tools de IA não acessam Vault |
| Export | Itens exportados permanecem criptografados |

### Especificação de Criptografia do Vault

| Componente | Especificação |
|------------|---------------|
| **Algoritmo** | AES-256-GCM (Galois/Counter Mode) |
| **IV (Initialization Vector)** | 12 bytes aleatórios, único por item, armazenado junto ao ciphertext |
| **KDF (Key Derivation)** | Argon2id para derivar chave a partir da senha do usuário |
| **Parâmetros Argon2id** | memory: 64MB, iterations: 3, parallelism: 4 |
| **Salt** | 16 bytes aleatórios, único por usuário |
| **Gerenciamento de chaves** | Supabase Vault ou AWS KMS (produção) |
| **Rotação de chaves** | Anual ou sob demanda (ex: suspeita de comprometimento) |

**Estrutura do dado criptografado:**
```
[salt (16 bytes)][iv (12 bytes)][ciphertext][auth_tag (16 bytes)]
```

**Processo de criptografia:**
1. Derivar chave AES a partir da senha do usuário usando Argon2id
2. Gerar IV aleatório de 12 bytes
3. Criptografar dados com AES-256-GCM
4. Concatenar: salt + iv + ciphertext + auth_tag
5. Armazenar no campo `encrypted_data` (bytea)

---

## 4. Export Behavior

Ao exportar dados do usuário (LGPD):
- Vault items são incluídos **criptografados**
- Usuário precisa da senha master para descriptografar
- Garante portabilidade sem comprometer segurança

---

## 5. Database Schema

```typescript
// packages/database/src/schema/vault.ts

import { pgTable, uuid, varchar, timestamp, jsonb, customType, index } from 'drizzle-orm/pg-core';
import { vaultItemTypeEnum, vaultCategoryEnum } from './enums';
import { users } from './users';

// Custom type for encrypted data (bytea)
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const vaultItems = pgTable('vault_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Type & Category
  type: vaultItemTypeEnum('type').notNull(),       // 'credential', 'document', 'card', 'note', 'file'
  category: vaultCategoryEnum('category').notNull(), // 'personal', 'financial', 'work', 'health', 'legal', 'other'

  // Name (not encrypted, for listing)
  name: varchar('name', { length: 255 }).notNull(),

  // Encrypted data (AES-256-GCM)
  // Structure: [salt (16 bytes)][iv (12 bytes)][ciphertext][auth_tag (16 bytes)]
  encryptedData: bytea('encrypted_data').notNull(),

  // Metadata (not sensitive, for search)
  metadata: jsonb('metadata').notNull().default({}),
  // credential: { url }
  // document: { documentType, expiresAt }
  // card: { cardType, lastFour }
  // file: { mimeType, size }

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('vault_items_user_id_idx').on(table.userId),
  categoryIdx: index('vault_items_category_idx').on(table.category),
}));

// Types
export type VaultItem = typeof vaultItems.$inferSelect;
export type NewVaultItem = typeof vaultItems.$inferInsert;
```

---

## 6. Definition of Done

- [ ] CRUD de itens funciona
- [ ] Re-autenticação obrigatória
- [ ] Timeout de sessão (5min)
- [ ] Criptografia AES-256 em repouso
- [ ] Não acessível via tools de IA
- [ ] Audit log de todo acesso

---

*Última atualização: 25 Janeiro 2026*
