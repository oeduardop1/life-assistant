// scripts/push-schema.ts
// Script to push schema to database non-interactively

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../src/schema';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/life_assistant';

async function pushSchema() {
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('Connected successfully.');

    // Generate and apply schema using drizzle push
    // Since push is interactive, we'll use migrate instead
    console.log('Running migrations from src/migrations...');
    await migrate(db, { migrationsFolder: './src/migrations' });
    console.log('Schema pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

pushSchema().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
