import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database package before importing
vi.mock('@life-assistant/database', () => ({
  getDb: vi.fn().mockReturnValue({}),
  getPool: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  }),
  closePool: vi.fn().mockResolvedValue(undefined),
  withUserId: vi.fn(),
  withTransaction: vi.fn(),
  withUserTransaction: vi.fn(),
  schema: { users: {} },
}));

import { DatabaseService } from '../../../src/database/database.service.js';
import * as database from '@life-assistant/database';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    databaseService = new DatabaseService();
  });

  describe('db getter', () => {
    it('should_return_drizzle_db_instance', () => {
      const db = databaseService.db;

      expect(db).toBeDefined();
      expect(database.getDb).toHaveBeenCalled();
    });
  });

  describe('pool getter', () => {
    it('should_return_pg_pool', () => {
      const pool = databaseService.pool;

      expect(pool).toBeDefined();
      expect(database.getPool).toHaveBeenCalled();
    });
  });

  describe('schema getter', () => {
    it('should_return_schema', () => {
      const schema = databaseService.schema;

      expect(schema).toBeDefined();
    });
  });

  describe('RLS helpers', () => {
    it('should_expose_withUserId', () => {
      expect(databaseService.withUserId).toBeDefined();
      expect(databaseService.withUserId).toBe(database.withUserId);
    });

    it('should_expose_withTransaction', () => {
      expect(databaseService.withTransaction).toBeDefined();
      expect(databaseService.withTransaction).toBe(database.withTransaction);
    });

    it('should_expose_withUserTransaction', () => {
      expect(databaseService.withUserTransaction).toBeDefined();
      expect(databaseService.withUserTransaction).toBe(database.withUserTransaction);
    });
  });

  describe('isHealthy', () => {
    it('should_return_true_when_db_is_connected', async () => {
      const result = await databaseService.isHealthy();

      expect(result).toBe(true);
    });

    it('should_execute_select_1_query', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
      vi.mocked(database.getPool).mockReturnValue({
        query: mockQuery,
      } as unknown as ReturnType<typeof database.getPool>);

      await databaseService.isHealthy();

      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    });

    it('should_return_false_when_db_query_fails', async () => {
      vi.mocked(database.getPool).mockReturnValue({
        query: vi.fn().mockRejectedValue(new Error('Connection failed')),
      } as unknown as ReturnType<typeof database.getPool>);

      const result = await databaseService.isHealthy();

      expect(result).toBe(false);
    });

    it('should_return_false_when_no_rows_returned', async () => {
      vi.mocked(database.getPool).mockReturnValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
      } as unknown as ReturnType<typeof database.getPool>);

      const result = await databaseService.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should_close_database_pool', async () => {
      await databaseService.onModuleDestroy();

      expect(database.closePool).toHaveBeenCalled();
    });
  });
});
