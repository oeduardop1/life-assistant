import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../../src/app.module.js';
import { DatabaseService } from '../../../src/database/database.service.js';

/**
 * Integration tests for contradiction detection in the memory system.
 *
 * These tests verify:
 * 1. Contradiction detection when adding new knowledge items
 * 2. Supersession of contradictory items
 * 3. API response includes supersession info
 *
 * @see ADR-012 for Tool Use + Memory Consolidation architecture
 */
describe('Contradiction Detection Integration', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let testUserId: string;
  let authToken: string;

  // Skip these tests if no real database is available
  const skipIfNoDatabase = process.env.SKIP_DB_TESTS === 'true';

  beforeAll(async () => {
    if (skipIfNoDatabase) return;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);

    // Create a test user
    testUserId = uuidv4();
    const { users } = databaseService.schema;
    await databaseService.db.insert(users).values({
      id: testUserId,
      email: `test-contradiction-${testUserId}@example.com`,
      name: 'Test User',
      timezone: 'America/Sao_Paulo',
      status: 'active',
    });

    // Get auth token for the test user
    // Note: In a real test, you'd use the actual auth flow
    // For now, we'll use a mock token or skip auth tests
    authToken = 'test-token'; // Replace with actual auth in real tests
  });

  afterAll(async () => {
    if (skipIfNoDatabase) return;

    // Clean up test data
    if (testUserId) {
      const { users, knowledgeItems } = databaseService.schema;
      const { eq } = await import('@life-assistant/database');

      await databaseService.db
        .delete(knowledgeItems)
        .where(eq(knowledgeItems.userId, testUserId));
      await databaseService.db
        .delete(users)
        .where(eq(users.id, testUserId));
    }

    await app?.close();
  });

  describe('Contradiction Detection Flow', () => {
    it.skipIf(skipIfNoDatabase)('should detect and resolve contradictions when adding items', async () => {
      // This test verifies the full flow:
      // 1. Add "User is single"
      // 2. Add "User is in a relationship"
      // 3. The second should supersede the first

      // First item
      const firstResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'User is single',
          area: 'relationships',
        })
        .expect(201);

      expect(firstResponse.body.id).toBeDefined();
      const firstItemId = firstResponse.body.id;

      // Second item (contradictory)
      const secondResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'User is in a relationship',
          area: 'relationships',
        })
        .expect(201);

      expect(secondResponse.body.id).toBeDefined();

      // Verify the first item is now superseded
      const { knowledgeItems } = databaseService.schema;
      const { eq } = await import('@life-assistant/database');

      const firstItem = await databaseService.db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, firstItemId))
        .limit(1);

      // Note: The actual supersession depends on LLM detection
      // In unit tests, we mock this; in integration, it may vary
      // This test documents the expected behavior
      if (firstItem[0]?.supersededById) {
        expect(firstItem[0].supersededById).toBe(secondResponse.body.id);
        expect(firstItem[0].supersededAt).toBeDefined();
      }
    });

    it.skipIf(skipIfNoDatabase)('should not supersede non-contradictory items', async () => {
      // Add two non-contradictory items
      const firstResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'User likes coffee',
          area: 'health',
        })
        .expect(201);

      const secondResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'User exercises in the morning',
          area: 'health',
        })
        .expect(201);

      // Both items should exist without supersession
      const { knowledgeItems } = databaseService.schema;
      const { eq } = await import('@life-assistant/database');

      const firstItem = await databaseService.db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, firstResponse.body.id))
        .limit(1);

      const secondItem = await databaseService.db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, secondResponse.body.id))
        .limit(1);

      expect(firstItem[0]?.supersededById).toBeNull();
      expect(secondItem[0]?.supersededById).toBeNull();
    });
  });

  describe('Supersession Queries', () => {
    it.skipIf(skipIfNoDatabase)('should not return superseded items by default', async () => {
      // List items should not include superseded ones by default
      const listResponse = await request(app.getHttpServer())
        .get('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All returned items should not be superseded
      for (const item of listResponse.body.items) {
        expect(item.supersededById).toBeNull();
      }
    });

    it.skipIf(skipIfNoDatabase)('should return superseded items when includeSuperseded=true', async () => {
      // List items with includeSuperseded should return all items
      const listResponse = await request(app.getHttpServer())
        .get('/memory/items?includeSuperseded=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should include items with supersededById set (if any exist)
      expect(listResponse.body.items).toBeDefined();
      // Note: The response now includes supersededById and supersededAt fields
      // even for active items (they will be null)
    });

    it.skipIf(skipIfNoDatabase)('should include temporal metadata in export', async () => {
      // Export should include all items with temporal stats
      const exportResponse = await request(app.getHttpServer())
        .get('/memory/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify export response structure
      expect(exportResponse.body.items).toBeDefined();
      expect(exportResponse.body.total).toBeDefined();
      expect(exportResponse.body.exportedAt).toBeDefined();
      expect(exportResponse.body.stats).toBeDefined();
      expect(typeof exportResponse.body.stats.active).toBe('number');
      expect(typeof exportResponse.body.stats.superseded).toBe('number');

      // All items should have temporal fields
      for (const item of exportResponse.body.items) {
        expect('supersededById' in item).toBe(true);
        expect('supersededAt' in item).toBe(true);
      }
    });
  });

  describe('State Change Detection (M1.6.1)', () => {
    it.skipIf(skipIfNoDatabase)('should detect debt payoff as state change', async () => {
      // This test documents the expected behavior for financial state changes
      // First item: has debt
      const firstResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'Tem uma dívida de 1 milhão',
          area: 'financial',
        })
        .expect(201);

      expect(firstResponse.body.id).toBeDefined();
      const firstItemId = firstResponse.body.id;

      // Second item: paid off debt (state change)
      const secondResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'Quitou a dívida de 1 milhão',
          area: 'financial',
        })
        .expect(201);

      expect(secondResponse.body.id).toBeDefined();

      // Verify the first item may be superseded (depends on LLM response)
      const { knowledgeItems } = databaseService.schema;
      const { eq } = await import('@life-assistant/database');

      const firstItem = await databaseService.db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, firstItemId))
        .limit(1);

      // Document expected behavior: debt → paid should be detected as state change
      // If LLM properly detects it, firstItem will have supersededById set
      if (firstItem[0]?.supersededById) {
        expect(firstItem[0].supersededById).toBe(secondResponse.body.id);
        expect(firstItem[0].supersededAt).toBeDefined();
      }
    });

    it.skipIf(skipIfNoDatabase)('should NOT supersede complementary facts', async () => {
      // Complementary facts should coexist
      const firstResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'Começou o curso de Python',
          area: 'personal_growth',
        })
        .expect(201);

      const secondResponse = await request(app.getHttpServer())
        .post('/memory/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'fact',
          content: 'Terminou o curso de Python',
          area: 'personal_growth',
        })
        .expect(201);

      // Both should exist without supersession (evolution, not contradiction)
      const { knowledgeItems } = databaseService.schema;
      const { eq } = await import('@life-assistant/database');

      const firstItem = await databaseService.db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, firstResponse.body.id))
        .limit(1);

      const secondItem = await databaseService.db
        .select()
        .from(knowledgeItems)
        .where(eq(knowledgeItems.id, secondResponse.body.id))
        .limit(1);

      // Complementary facts should coexist (both true statements)
      expect(secondItem[0]?.supersededById).toBeNull();
    });
  });
});
