import { Controller, Post, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppConfigService } from '../../config/config.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/request.types';

/**
 * AdminJobsController - Manual job triggering for development
 *
 * This controller is only available when NODE_ENV=development.
 * Provides endpoints to manually trigger background jobs for testing.
 *
 * Note: Memory consolidation is now managed by the Python AI service.
 * This endpoint proxies the trigger to the Python service.
 *
 * @see docs/specs/engineering.md §7.6 for usage documentation
 */
@ApiTags('Admin - Jobs')
@Controller('admin/jobs')
export class AdminJobsController {
  private readonly logger = new Logger(AdminJobsController.name);

  constructor(
    private readonly appConfig: AppConfigService
  ) {}

  /**
   * Trigger memory consolidation job manually via Python AI service
   */
  @Post('memory-consolidation/trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Trigger memory consolidation job manually (dev only)',
    description:
      'Triggers memory consolidation for the authenticated user via the Python AI service. ' +
      'Use this to test memory consolidation during development without waiting for the scheduled execution.',
  })
  @ApiResponse({
    status: 202,
    description: 'Job triggered successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'triggered' },
        message: { type: 'string', example: 'Memory consolidation triggered for user user-123' },
      },
    },
  })
  async triggerMemoryConsolidation(@CurrentUser() user: AuthenticatedUser) {
    const pythonUrl = this.appConfig.pythonAiUrl;
    const serviceSecret = this.appConfig.serviceSecret;

    const response = await fetch(`${pythonUrl}/workers/consolidation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: user.id }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      this.logger.error(`Python consolidation trigger error (${String(response.status)}): ${errorText}`);
      return {
        status: 'error',
        message: `Failed to trigger consolidation: ${errorText}`,
      };
    }

    return {
      status: 'triggered',
      message: `Memory consolidation triggered for user ${user.id}`,
    };
  }
}
