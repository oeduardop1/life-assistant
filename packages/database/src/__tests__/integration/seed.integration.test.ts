// src/__tests__/integration/seed.integration.test.ts
// Integration tests for seed data
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../schema';
import {
  seed,
  TEST_USER_ID,
  TEST_CONVERSATION_ID,
  TEST_NOTE_1_ID,
  TEST_NOTE_2_ID,
  TEST_HABIT_ID,
  TEST_GOAL_ID,
} from '../../seed';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/life_assistant';

describe('Seed Data Integration Tests', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool, { schema });

    // Clean up any existing test data first
    await pool.query('DELETE FROM habit_completions WHERE habit_id = $1', [TEST_HABIT_ID]);
    await pool.query('DELETE FROM goal_milestones WHERE goal_id = $1', [TEST_GOAL_ID]);
    await pool.query('DELETE FROM habits WHERE id = $1', [TEST_HABIT_ID]);
    await pool.query('DELETE FROM goals WHERE id = $1', [TEST_GOAL_ID]);
    await pool.query('DELETE FROM notes WHERE id IN ($1, $2)', [TEST_NOTE_1_ID, TEST_NOTE_2_ID]);
    await pool.query('DELETE FROM tracking_entries WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM messages WHERE conversation_id = $1', [TEST_CONVERSATION_ID]);
    await pool.query('DELETE FROM conversations WHERE id = $1', [TEST_CONVERSATION_ID]);
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);

    // Run seed
    await seed();
  });

  afterAll(async () => {
    // Clean up seed data
    await pool.query('DELETE FROM habit_completions WHERE habit_id = $1', [TEST_HABIT_ID]);
    await pool.query('DELETE FROM goal_milestones WHERE goal_id = $1', [TEST_GOAL_ID]);
    await pool.query('DELETE FROM habits WHERE id = $1', [TEST_HABIT_ID]);
    await pool.query('DELETE FROM goals WHERE id = $1', [TEST_GOAL_ID]);
    await pool.query('DELETE FROM notes WHERE id IN ($1, $2)', [TEST_NOTE_1_ID, TEST_NOTE_2_ID]);
    await pool.query('DELETE FROM tracking_entries WHERE user_id = $1', [TEST_USER_ID]);
    await pool.query('DELETE FROM messages WHERE conversation_id = $1', [TEST_CONVERSATION_ID]);
    await pool.query('DELETE FROM conversations WHERE id = $1', [TEST_CONVERSATION_ID]);
    await pool.query('DELETE FROM users WHERE id = $1', [TEST_USER_ID]);
    await pool.end();
  });

  describe('Test user', () => {
    it('should create test user with correct data', async () => {
      const users = await db.select().from(schema.users).where(eq(schema.users.id, TEST_USER_ID));

      expect(users.length).toBe(1);
      expect(users[0].email).toBe('test@example.com');
      expect(users[0].name).toBe('Usuário Teste');
      expect(users[0].status).toBe('active');
      expect(users[0].plan).toBe('pro');
    });

    it('should have valid preferences', async () => {
      const users = await db.select().from(schema.users).where(eq(schema.users.id, TEST_USER_ID));

      const prefs = users[0].preferences as Record<string, unknown>;
      expect(prefs).toBeDefined();
      expect(prefs.areaWeights).toBeDefined();
    });
  });

  describe('Test conversation and messages', () => {
    it('should create test conversation', async () => {
      const conversations = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, TEST_CONVERSATION_ID));

      expect(conversations.length).toBe(1);
      expect(conversations[0].userId).toBe(TEST_USER_ID);
      expect(conversations[0].type).toBe('general');
      expect(conversations[0].title).toBe('Primeira conversa');
    });

    it('should create test messages', async () => {
      const messages = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, TEST_CONVERSATION_ID));

      expect(messages.length).toBe(2);

      const userMessage = messages.find((m) => m.role === 'user');
      const assistantMessage = messages.find((m) => m.role === 'assistant');

      expect(userMessage).toBeDefined();
      expect(userMessage?.content).toContain('Olá');

      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toContain('assistente pessoal');
    });
  });

  describe('Test tracking entries', () => {
    it('should create tracking entries', async () => {
      const entries = await db
        .select()
        .from(schema.trackingEntries)
        .where(eq(schema.trackingEntries.userId, TEST_USER_ID));

      expect(entries.length).toBeGreaterThanOrEqual(3);

      const weightEntry = entries.find((e) => e.type === 'weight');
      const waterEntry = entries.find((e) => e.type === 'water');
      const moodEntry = entries.find((e) => e.type === 'mood');

      expect(weightEntry).toBeDefined();
      expect(weightEntry?.value).toBe('82.50');
      expect(weightEntry?.unit).toBe('kg');

      expect(waterEntry).toBeDefined();
      expect(waterEntry?.value).toBe('2000.00');

      expect(moodEntry).toBeDefined();
      expect(moodEntry?.value).toBe('7.00');
    });
  });

  describe('Test notes', () => {
    it('should create test notes', async () => {
      const notes = await db
        .select()
        .from(schema.notes)
        .where(eq(schema.notes.userId, TEST_USER_ID));

      expect(notes.length).toBeGreaterThanOrEqual(2);

      const welcomeNote = notes.find((n) => n.id === TEST_NOTE_1_ID);
      const goalsNote = notes.find((n) => n.id === TEST_NOTE_2_ID);

      expect(welcomeNote).toBeDefined();
      expect(welcomeNote?.title).toBe('Bem-vindo ao Segundo Cérebro');
      expect(welcomeNote?.tags).toContain('tutorial');

      expect(goalsNote).toBeDefined();
      expect(goalsNote?.title).toBe('Metas 2026');
      expect(goalsNote?.folder).toBe('Planejamento');
    });
  });

  describe('Test habit', () => {
    it('should create test habit', async () => {
      const habits = await db.select().from(schema.habits).where(eq(schema.habits.id, TEST_HABIT_ID));

      expect(habits.length).toBe(1);
      expect(habits[0].title).toBe('Beber água');
      expect(habits[0].area).toBe('health');
      expect(habits[0].frequency).toBe('daily');
      expect(habits[0].isActive).toBe(true);
    });
  });

  describe('Test goal', () => {
    it('should create test goal', async () => {
      const goals = await db.select().from(schema.goals).where(eq(schema.goals.id, TEST_GOAL_ID));

      expect(goals.length).toBe(1);
      expect(goals[0].title).toBe('Perder 5kg');
      expect(goals[0].area).toBe('health');
      expect(goals[0].targetValue).toBe('77.50');
      expect(goals[0].currentValue).toBe('82.50');
      expect(goals[0].status).toBe('in_progress');
    });
  });

  describe('Idempotency', () => {
    it('should not create duplicate data when seed is run twice', async () => {
      // Run seed again
      await seed();

      // Verify only one user exists
      const users = await db.select().from(schema.users).where(eq(schema.users.id, TEST_USER_ID));
      expect(users.length).toBe(1);

      // Verify only one conversation exists
      const conversations = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, TEST_CONVERSATION_ID));
      expect(conversations.length).toBe(1);

      // Verify only one habit exists
      const habits = await db.select().from(schema.habits).where(eq(schema.habits.id, TEST_HABIT_ID));
      expect(habits.length).toBe(1);

      // Verify only one goal exists
      const goals = await db.select().from(schema.goals).where(eq(schema.goals.id, TEST_GOAL_ID));
      expect(goals.length).toBe(1);
    });
  });
});
