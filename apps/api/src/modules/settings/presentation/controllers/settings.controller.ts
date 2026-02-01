import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SettingsService } from '../../application/services/settings.service';
import { UpdateProfileDto, UpdateEmailDto, UpdatePasswordDto } from '../dtos';
import { CurrentUser } from '../../../../common/decorators';
import type { AuthenticatedUser } from '../../../../common/types/request.types';

/**
 * SettingsController - User settings management endpoints
 *
 * Endpoints:
 * - GET /api/settings - Get current settings
 * - PATCH /api/settings/profile - Update profile (name)
 * - PATCH /api/settings/email - Update email (rate limited: 3/hour)
 * - PATCH /api/settings/password - Update password (rate limited: 5/hour)
 *
 * @see docs/specs/domains/settings.md for requirements
 */
@ApiTags('settings')
@Controller('settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns user settings (name, email)',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.settingsService.getUserSettings(user.id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(user.id, dto);
  }

  @Patch('email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { ttl: 3600000, limit: 3 } }) // 3 requests per hour
  @ApiOperation({ summary: 'Update user email (requires password verification)' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent to new address',
  })
  @ApiResponse({ status: 400, description: 'Validation error or email in use' })
  @ApiResponse({ status: 401, description: 'Invalid password or not authenticated' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (3/hour)' })
  async updateEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEmailDto,
    @Headers('authorization') authHeader: string,
  ) {
    // Extract access token from "Bearer <token>" header
    const accessToken = authHeader.replace('Bearer ', '');
    return this.settingsService.updateEmail(user.id, dto, accessToken);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { ttl: 3600000, limit: 5 } }) // 5 requests per hour
  @ApiOperation({ summary: 'Update user password (requires current password)' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error or weak password' })
  @ApiResponse({ status: 401, description: 'Invalid password or not authenticated' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded (5/hour)' })
  async updatePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.settingsService.updatePassword(user.id, dto);
  }
}
