/**
 * Memory Consolidation Job Integration Tests
 *
 * Tests BullMQ job execution patterns with real Redis.
 * Uses QueueEvents to wait for job completion (Arrange-Act-Wait-Assert pattern).
 *
 * These tests validate the BullMQ infrastructure and patterns used by the
 * Memory Consolidation Job, without importing the actual processor to avoid
 * database dependencies.
 *
 * @see docs/specs/engineering.md §7.5 for job testing patterns
 * @see ADR-012 for Memory Consolidation architecture
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Queue, QueueEvents, Job, Worker } from 'bullmq';

// Use a unique queue name for tests to avoid conflicts with other workers
const TEST_QUEUE_NAME = 'memory-consolidation-test';

// Redis connection config (matches docker-compose)
const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

// Job data type (matches real processor)
interface ConsolidationJobData {
  timezone: string;
  userId?: string;
  date: string;
}

// Job result type (matches real processor)
interface ConsolidationJobResult {
  usersProcessed: number;
  usersConsolidated: number;
  usersSkipped: number;
  errors: number;
  completedAt: string;
}

// Mock data
const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  timezone: 'America/Sao_Paulo',
};

describe('Memory Consolidation Job (Integration)', () => {
  let queue: Queue<ConsolidationJobData, ConsolidationJobResult>;
  let queueEvents: QueueEvents;
  let worker: Worker<ConsolidationJobData, ConsolidationJobResult> | null = null;

  beforeAll(async () => {
    // Create queue with test-specific name
    queue = new Queue(TEST_QUEUE_NAME, { connection: redisConnection });

    // Create QueueEvents for listening to job completion
    queueEvents = new QueueEvents(TEST_QUEUE_NAME, { connection: redisConnection });
    await queueEvents.waitUntilReady();
  });

  afterAll(async () => {
    // Close all connections
    if (worker) await worker.close();
    await queueEvents.close();
    await queue.close();
  });

  beforeEach(async () => {
    // Clean queue before each test
    await queue.obliterate({ force: true });
  });

  afterEach(async () => {
    // Close worker if exists (prevent lingering connections)
    if (worker) {
      await worker.close();
      worker = null;
    }
  });

  describe('Job Queue Operations', () => {
    it('should_add_job_to_queue_successfully', async () => {
      const job = await queue.add('consolidate-user-manual', {
        userId: 'test-user-123',
        timezone: 'manual',
        date: new Date().toISOString().split('T')[0],
      });

      expect(job.id).toBeDefined();
      expect(job.name).toBe('consolidate-user-manual');
      expect(job.data.userId).toBe('test-user-123');
    });

    it('should_process_job_with_worker', async () => {
      // Track processed jobs
      const processedJobs: string[] = [];

      // Create worker for test queue
      worker = new Worker<ConsolidationJobData, ConsolidationJobResult>(
        TEST_QUEUE_NAME,
        (job) => {
          processedJobs.push(job.id ?? 'unknown');
          return {
            usersProcessed: 1,
            usersConsolidated: 1,
            usersSkipped: 0,
            errors: 0,
            completedAt: new Date().toISOString(),
          };
        },
        { connection: redisConnection }
      );

      await worker.waitUntilReady();

      // Add job
      const job = await queue.add('consolidate-user-test', {
        userId: 'test-user-123',
        timezone: 'manual',
        date: new Date().toISOString().split('T')[0],
      });

      // Wait for completion using QueueEvents
      const result = await job.waitUntilFinished(queueEvents, 10000);

      expect(processedJobs).toContain(job.id);
      expect(result.usersProcessed).toBe(1);
      expect(result.usersConsolidated).toBe(1);
    });

    it('should_handle_job_failure_gracefully', async () => {
      // Create a worker that throws an error
      const errorMessage = 'Simulated processing error';

      worker = new Worker<ConsolidationJobData, ConsolidationJobResult>(
        TEST_QUEUE_NAME,
        () => {
          throw new Error(errorMessage);
        },
        { connection: redisConnection }
      );

      await worker.waitUntilReady();

      // Add job
      const job = await queue.add('consolidate-fail-test', {
        userId: 'test-user-123',
        timezone: 'manual',
        date: new Date().toISOString().split('T')[0],
      });

      // Wait for failure
      try {
        await job.waitUntilFinished(queueEvents, 10000);
        expect.fail('Job should have failed');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(errorMessage);
      }

      // Verify job is in failed state
      const failedJob = await Job.fromId(queue, job.id ?? '');
      expect(await failedJob?.isFailed()).toBe(true);
    });
  });

  describe('Consolidation Job Logic', () => {
    it('should_return_correct_stats_for_user_with_no_messages', async () => {
      // Create worker that simulates processor logic
      worker = new Worker<ConsolidationJobData, ConsolidationJobResult>(
        TEST_QUEUE_NAME,
        (job) => {
          const { userId } = job.data;

          // Simulate processor logic: check user, no messages = skip
          const users = userId ? [mockUser] : [];
          let usersConsolidated = 0;
          let usersSkipped = 0;

          for (const _user of users) {
            // Simulate: no messages to process
            const messages: unknown[] = [];
            if (messages.length === 0) {
              usersSkipped++;
            } else {
              usersConsolidated++;
            }
          }

          return {
            usersProcessed: users.length,
            usersConsolidated,
            usersSkipped,
            errors: 0,
            completedAt: new Date().toISOString(),
          };
        },
        { connection: redisConnection }
      );

      await worker.waitUntilReady();

      const job = await queue.add('consolidate-no-messages', {
        userId: 'test-user-123',
        timezone: 'manual',
        date: new Date().toISOString().split('T')[0],
      });

      const result = await job.waitUntilFinished(queueEvents, 10000);

      expect(result.usersProcessed).toBe(1);
      expect(result.usersSkipped).toBe(1);
      expect(result.usersConsolidated).toBe(0);
    });

    it('should_process_timezone_based_consolidation', async () => {
      // Setup: Multiple users in same timezone
      const usersInTimezone = [
        { id: 'user-1', name: 'User 1', timezone: 'America/Sao_Paulo' },
        { id: 'user-2', name: 'User 2', timezone: 'America/Sao_Paulo' },
      ];

      worker = new Worker<ConsolidationJobData, ConsolidationJobResult>(
        TEST_QUEUE_NAME,
        (job) => {
          const { userId } = job.data;

          // If userId specified, process single user
          // If timezone specified, process all users in timezone
          const users = userId ? [mockUser] : usersInTimezone;

          return {
            usersProcessed: users.length,
            usersConsolidated: users.length, // Assume all consolidated
            usersSkipped: 0,
            errors: 0,
            completedAt: new Date().toISOString(),
          };
        },
        { connection: redisConnection }
      );

      await worker.waitUntilReady();

      const job = await queue.add('consolidate-timezone', {
        timezone: 'America/Sao_Paulo',
        date: new Date().toISOString().split('T')[0],
      });

      const result = await job.waitUntilFinished(queueEvents, 10000);

      expect(result.usersProcessed).toBe(2);
      expect(result.usersConsolidated).toBe(2);
    });

    it('should_include_completion_timestamp_in_result', async () => {
      const beforeTime = new Date();

      worker = new Worker<ConsolidationJobData, ConsolidationJobResult>(
        TEST_QUEUE_NAME,
        () => ({
          usersProcessed: 1,
          usersConsolidated: 1,
          usersSkipped: 0,
          errors: 0,
          completedAt: new Date().toISOString(),
        }),
        { connection: redisConnection }
      );

      await worker.waitUntilReady();

      const job = await queue.add('consolidate-timestamp', {
        userId: 'test-user-123',
        timezone: 'manual',
        date: new Date().toISOString().split('T')[0],
      });

      const result = await job.waitUntilFinished(queueEvents, 10000);
      const completedAt = new Date(result.completedAt);

      expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(completedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('QueueEvents Pattern', () => {
    it('should_wait_for_job_completion_with_queueEvents', async () => {
      // This test validates the recommended testing pattern

      worker = new Worker<ConsolidationJobData, ConsolidationJobResult>(
        TEST_QUEUE_NAME,
        async () => {
          // Simulate some async work
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            usersProcessed: 1,
            usersConsolidated: 1,
            usersSkipped: 0,
            errors: 0,
            completedAt: new Date().toISOString(),
          };
        },
        { connection: redisConnection }
      );

      await worker.waitUntilReady();

      // Add multiple jobs in parallel
      const jobs = await Promise.all([
        queue.add('job-1', { userId: 'user-1', timezone: 'manual', date: '2024-01-15' }),
        queue.add('job-2', { userId: 'user-2', timezone: 'manual', date: '2024-01-15' }),
        queue.add('job-3', { userId: 'user-3', timezone: 'manual', date: '2024-01-15' }),
      ]);

      // Wait for all jobs to complete
      const results = await Promise.all(
        jobs.map((job) => job.waitUntilFinished(queueEvents, 10000))
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.usersProcessed).toBe(1);
      });
    });
  });
});
