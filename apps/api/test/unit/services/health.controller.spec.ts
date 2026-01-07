import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from '../../../src/health/health.controller.js';
import { DatabaseService } from '../../../src/database/database.service.js';
import { AppConfigService } from '../../../src/config/config.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealthCheckService: Partial<HealthCheckService>;
  let mockDatabaseService: Partial<DatabaseService>;
  let mockConfigService: Partial<AppConfigService>;

  beforeEach(() => {
    mockHealthCheckService = {
      check: vi.fn(),
    };

    mockDatabaseService = {
      isHealthy: vi.fn().mockResolvedValue(true),
    };

    mockConfigService = {
      appVersion: '1.0.0',
    };

    controller = new HealthController(
      mockHealthCheckService as HealthCheckService,
      mockDatabaseService as DatabaseService,
      mockConfigService as AppConfigService,
    );
  });

  describe('check (GET /health)', () => {
    it('should_return_ok_status', () => {
      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(result.version).toBe('1.0.0');
      expect(result.timestamp).toBeDefined();
    });

    it('should_include_valid_iso_timestamp', () => {
      const result = controller.check();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.toISOString()).toBe(result.timestamp);
    });

    it('should_include_app_version', () => {
      mockConfigService.appVersion = '2.0.0';
      controller = new HealthController(
        mockHealthCheckService as HealthCheckService,
        mockDatabaseService as DatabaseService,
        mockConfigService as AppConfigService,
      );

      const result = controller.check();

      expect(result.version).toBe('2.0.0');
    });
  });

  describe('ready (GET /health/ready)', () => {
    it('should_check_database_health', async () => {
      const healthResult: HealthCheckResult = {
        status: 'ok',
        details: {
          database: { status: 'up' },
        },
      };

      vi.mocked(mockHealthCheckService.check!).mockResolvedValue(healthResult);

      const result = await controller.ready();

      expect(result).toEqual(healthResult);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('should_use_database_health_indicator', async () => {
      const healthResult: HealthCheckResult = {
        status: 'ok',
        details: {
          database: { status: 'up' },
        },
      };

      vi.mocked(mockHealthCheckService.check!).mockImplementation(
        async (indicators) => {
          // Execute the indicator function to verify it works
          const indicatorFn = indicators[0] as () => Promise<unknown>;
          await indicatorFn();
          return healthResult;
        },
      );

      await controller.ready();

      expect(mockDatabaseService.isHealthy).toHaveBeenCalled();
    });

    it('should_return_up_when_database_healthy', async () => {
      mockDatabaseService.isHealthy = vi.fn().mockResolvedValue(true);

      vi.mocked(mockHealthCheckService.check!).mockImplementation(
        async (indicators) => {
          const indicatorFn = indicators[0] as () => Promise<{ database: { status: string } }>;
          const result = await indicatorFn();
          return {
            status: 'ok',
            details: result,
          };
        },
      );

      const result = await controller.ready();

      expect(result.details.database.status).toBe('up');
    });

    it('should_return_down_when_database_unhealthy', async () => {
      mockDatabaseService.isHealthy = vi.fn().mockResolvedValue(false);

      vi.mocked(mockHealthCheckService.check!).mockImplementation(
        async (indicators) => {
          const indicatorFn = indicators[0] as () => Promise<{ database: { status: string } }>;
          const result = await indicatorFn();
          return {
            status: 'error',
            details: result,
            error: result,
          };
        },
      );

      const result = await controller.ready();

      expect(result.details.database.status).toBe('down');
    });
  });
});
