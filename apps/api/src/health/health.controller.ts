import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/index.js';
import { DatabaseService } from '../database/database.service.js';
import { AppConfigService } from '../config/config.service.js';

/**
 * HealthController - Application health check endpoints
 *
 * Endpoints:
 * - GET /health - Basic liveness check
 * - GET /health/ready - Readiness check (includes DB)
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Basic liveness check
   * Returns immediately if the server is running
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Basic liveness check' })
  @ApiOkResponse({
    description: 'Server is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-01-07T10:00:00.000Z' },
        version: { type: 'string', example: '0.1.0' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: this.config.appVersion,
    };
  }

  /**
   * Readiness check
   * Verifies database connection is healthy
   */
  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check with dependencies' })
  @ApiOkResponse({
    description: 'All dependencies are ready',
  })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database health check
      async () => {
        const isHealthy = await this.database.isHealthy();
        return {
          database: {
            status: isHealthy ? 'up' : 'down',
          },
        };
      },
    ]);
  }
}
