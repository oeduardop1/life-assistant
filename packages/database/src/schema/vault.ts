// packages/database/src/schema/vault.ts
// Vault items table as defined in docs/specs/data-model.md §4.8

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  customType,
  index,
} from 'drizzle-orm/pg-core';
import { vaultItemTypeEnum, vaultCategoryEnum } from './enums';
import { users } from './users';

// Custom type for encrypted data (bytea)
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const vaultItems = pgTable(
  'vault_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Type & Category
    type: vaultItemTypeEnum('type').notNull(),
    category: vaultCategoryEnum('category').notNull(),

    // Name (not encrypted, for listing)
    name: varchar('name', { length: 255 }).notNull(),

    // Encrypted data (AES-256)
    encryptedData: bytea('encrypted_data').notNull(),

    // Metadata (not sensitive, for search)
    // credential: { url }
    // document: { documentType, expiresAt }
    // card: { cardType, lastFour }
    // file: { mimeType, size }
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('vault_items_user_id_idx').on(table.userId),
    index('vault_items_category_idx').on(table.category),
  ]
);

// Types
export type VaultItem = typeof vaultItems.$inferSelect;
export type NewVaultItem = typeof vaultItems.$inferInsert;
