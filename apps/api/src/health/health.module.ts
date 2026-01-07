import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

/**
 * HealthModule - Health check endpoints
 *
 * Provides:
 * - GET /health - Basic liveness check
 * - GET /health/ready - Readiness check with dependencies
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HealthModule {}
