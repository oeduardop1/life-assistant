import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OnboardingService } from '../../application/services/onboarding.service';
import {
  ProfileStepDto,
  TelegramStepDto,
  OnboardingStatusDto,
  StepSaveResponseDto,
  OnboardingCompleteResponseDto,
  type OnboardingStep,
} from '../dtos';
import { CurrentUser } from '../../../../common/decorators';
import type { AuthenticatedUser } from '../../../../common/types/request.types';

@ApiTags('onboarding')
@Controller('onboarding')
@ApiBearerAuth()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current onboarding status' })
  @ApiResponse({
    status: 200,
    description: 'Returns current onboarding step and progress',
    type: OnboardingStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getStatus(@CurrentUser() user: AuthenticatedUser): Promise<OnboardingStatusDto> {
    return this.onboardingService.getOnboardingStatus(user.id);
  }

  @Patch('step/:step')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save progress for a specific onboarding step' })
  @ApiParam({
    name: 'step',
    enum: ['profile', 'telegram'],
    description: 'The step to save',
  })
  @ApiResponse({
    status: 200,
    description: 'Step saved successfully',
    type: StepSaveResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid step or validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async saveStep(
    @CurrentUser() user: AuthenticatedUser,
    @Param('step') step: OnboardingStep,
    @Body() body: ProfileStepDto | TelegramStepDto,
  ): Promise<StepSaveResponseDto> {
    switch (step) {
      case 'profile':
        return this.onboardingService.saveProfileStep(user.id, body as ProfileStepDto);

      case 'telegram':
        return this.onboardingService.saveTelegramStep(user.id, body as TelegramStepDto);

      case 'tutorial':
        // Tutorial step doesn't have data to save, just skip to complete
        return {
          success: true,
          nextStep: 'complete',
        };

      default:
        throw new BadRequestException(`Invalid step: ${step as string}`);
    }
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete the onboarding process' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding completed successfully',
    type: OnboardingCompleteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Required steps not completed' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: { tutorialSkipped?: boolean },
  ): Promise<OnboardingCompleteResponseDto> {
    return this.onboardingService.completeOnboarding(user.id, body?.tutorialSkipped ?? false);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if onboarding is complete' })
  @ApiResponse({
    status: 200,
    description: 'Returns whether onboarding is complete',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async checkComplete(@CurrentUser() user: AuthenticatedUser): Promise<{ isComplete: boolean }> {
    const isComplete = await this.onboardingService.isOnboardingComplete(user.id);
    return { isComplete };
  }
}
