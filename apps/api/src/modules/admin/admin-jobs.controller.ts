import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MemoryConsolidationScheduler } from '../../jobs/memory-consolidation/memory-consolidation.scheduler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/request.types';

/**
 * AdminJobsController - Manual job triggering for development
 *
 * This controller is only available when NODE_ENV=development.
 * Provides endpoints to manually trigger background jobs for testing.
 *
 * @see docs/specs/engineering.md §7.6 for usage documentation
 */
@ApiTags('Admin - Jobs')
@Controller('admin/jobs')
export class AdminJobsController {
  constructor(
    private readonly consolidationScheduler: MemoryConsolidationScheduler
  ) {}

  /**
   * Trigger memory consolidation job manually
   *
   * This allows developers to test the memory consolidation process
   * without waiting for the scheduled 3AM execution.
   */
  @Post('memory-consolidation/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger memory consolidation job manually (dev only)',
    description:
      'Queues a memory consolidation job for the authenticated user. ' +
      'Use this to test memory consolidation during development without waiting for the 3AM schedule.',
  })
  @ApiResponse({
    status: 202,
    description: 'Job queued successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'queued' },
        jobId: { type: 'string', example: 'consolidation_user-123_manual_1705123456789' },
        message: { type: 'string', example: 'Memory consolidation job queued for user user-123' },
      },
    },
  })
  async triggerMemoryConsolidation(@CurrentUser() user: AuthenticatedUser) {
    const jobId = await this.consolidationScheduler.triggerForUser(user.id);

    return {
      status: 'queued',
      jobId,
      message: `Memory consolidation job queued for user ${user.id}`,
    };
  }
}
