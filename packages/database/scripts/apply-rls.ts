// scripts/apply-rls.ts
// Apply RLS policies to the database

import { config } from 'dotenv';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from monorepo root
config({ path: resolve(__dirname, '../../../.env') });

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/postgres';

async function applyRLS() {
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Read RLS policies SQL
    const rlsSql = readFileSync(join(__dirname, '../src/sql/rls-policies.sql'), 'utf-8');

    // Create auth schema if not exists
    await pool.query('CREATE SCHEMA IF NOT EXISTS auth');

    // Apply RLS policies - need to split by semicolon but handle function bodies
    console.log('Applying RLS policies...');

    // Split carefully - handle $$ blocks
    const statements: string[] = [];
    let current = '';
    let inDollarBlock = false;

    for (const line of rlsSql.split('\n')) {
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('--')) {
        continue;
      }

      // Handle $$ blocks (function bodies)
      if (trimmed.includes('$$')) {
        inDollarBlock = !inDollarBlock;
      }

      current += line + '\n';

      // End of statement (semicolon outside of $$ block)
      if (trimmed.endsWith(';') && !inDollarBlock) {
        const stmt = current.trim();
        if (stmt && !stmt.startsWith('--')) {
          statements.push(stmt);
        }
        current = '';
      }
    }

    // Execute each statement
    const total = statements.length;
    for (const [i, stmt] of statements.entries()) {
      const index = i + 1;
      try {
        await pool.query(stmt);
        console.log(`  [${String(index)}/${String(total)}] OK`);
      } catch (err: unknown) {
        // Ignore "already exists" errors for idempotency
        // 42710: duplicate_object (enum, policy, etc)
        // 42P07: duplicate_table
        // 42P17: duplicate policy name
        const error = err as { code?: string };
        if (error.code !== '42710' && error.code !== '42P07' && error.code !== '42P17') {
          console.error(`Failed statement [${String(index)}]:`, stmt.slice(0, 100));
          throw err;
        }
        console.log(`  [${String(index)}/${String(total)}] Skipped (already exists)`);
      }
    }

    console.log(`Applied ${String(total)} RLS statements successfully!`);
  } catch (error) {
    console.error('Error applying RLS:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyRLS().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
