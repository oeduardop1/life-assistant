import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryConsolidationScheduler } from '../../../../src/jobs/memory-consolidation/memory-consolidation.scheduler.js';

describe('MemoryConsolidationScheduler', () => {
  let scheduler: MemoryConsolidationScheduler;
  let mockQueue: {
    upsertJobScheduler: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
  };
  let mockDatabaseService: {
    db: {
      selectDistinct: ReturnType<typeof vi.fn>;
    };
    schema: { users: { timezone: string; status: string } };
  };
  let mockLogger: {
    setContext: ReturnType<typeof vi.fn>;
    log: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockQueue = {
      upsertJobScheduler: vi.fn(),
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    };

    mockDatabaseService = {
      db: {
        selectDistinct: vi.fn(),
      },
      schema: {
        users: { timezone: 'timezone-field', status: 'status-field' },
      },
    };

    mockLogger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    };

    scheduler = new MemoryConsolidationScheduler(
      mockQueue as unknown as ConstructorParameters<typeof MemoryConsolidationScheduler>[0],
      mockDatabaseService as unknown as ConstructorParameters<typeof MemoryConsolidationScheduler>[1],
      mockLogger as unknown as ConstructorParameters<typeof MemoryConsolidationScheduler>[2]
    );
  });

  describe('onModuleInit', () => {
    it('should_setup_schedulers_for_unique_timezones', async () => {
      // Mock selectDistinct chain
      mockDatabaseService.db.selectDistinct.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { timezone: 'America/Sao_Paulo' },
            { timezone: 'Europe/London' },
          ]),
        }),
      });

      await scheduler.onModuleInit();

      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledTimes(2);
      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        'consolidation:America/Sao_Paulo',
        { pattern: '0 3 * * *', tz: 'America/Sao_Paulo' },
        expect.objectContaining({
          name: 'consolidate-timezone',
          data: expect.objectContaining({ timezone: 'America/Sao_Paulo' }),
        })
      );
      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        'consolidation:Europe/London',
        { pattern: '0 3 * * *', tz: 'Europe/London' },
        expect.objectContaining({
          name: 'consolidate-timezone',
          data: expect.objectContaining({ timezone: 'Europe/London' }),
        })
      );
    });

    it('should_skip_setup_when_no_users', async () => {
      mockDatabaseService.db.selectDistinct.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await scheduler.onModuleInit();

      expect(mockQueue.upsertJobScheduler).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'No active users found, skipping scheduler setup'
      );
    });

    it('should_use_correct_cron_pattern', async () => {
      mockDatabaseService.db.selectDistinct.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ timezone: 'UTC' }]),
        }),
      });

      await scheduler.onModuleInit();

      expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ pattern: '0 3 * * *' }),
        expect.any(Object)
      );
    });
  });

  describe('triggerForUser', () => {
    it('should_add_manual_job_for_user', async () => {
      mockQueue.add.mockResolvedValue({ id: 'manual-job-123' });

      const jobId = await scheduler.triggerForUser('user-456');

      expect(jobId).toBe('manual-job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'consolidate-user-manual',
        expect.objectContaining({
          userId: 'user-456',
          timezone: 'manual',
        }),
        expect.objectContaining({
          jobId: expect.stringContaining('consolidation:user-456:manual:'),
        })
      );
    });

    it('should_return_unknown_when_job_id_is_undefined', async () => {
      mockQueue.add.mockResolvedValue({ id: undefined });

      const jobId = await scheduler.triggerForUser('user-456');

      expect(jobId).toBe('unknown');
    });
  });

  describe('triggerForTimezone', () => {
    it('should_add_manual_job_for_timezone', async () => {
      mockQueue.add.mockResolvedValue({ id: 'tz-job-123' });

      const jobId = await scheduler.triggerForTimezone('America/New_York');

      expect(jobId).toBe('tz-job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'consolidate-timezone-manual',
        expect.objectContaining({
          timezone: 'America/New_York',
        }),
        expect.objectContaining({
          jobId: expect.stringContaining('consolidation:America/New_York:manual:'),
        })
      );
    });
  });

  describe('refreshSchedulers', () => {
    it('should_call_setupScheduledJobs', async () => {
      mockDatabaseService.db.selectDistinct.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ timezone: 'Asia/Tokyo' }]),
        }),
      });

      await scheduler.refreshSchedulers();

      expect(mockQueue.upsertJobScheduler).toHaveBeenCalled();
    });
  });
});
