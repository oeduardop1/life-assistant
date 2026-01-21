import { IsArray, ArrayMinSize, ArrayMaxSize, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LifeArea } from '@life-assistant/shared';

export class AreasStepDto {
  @ApiProperty({
    description: 'Selected life areas (minimum 3, maximum 6) - ADR-017',
    example: [LifeArea.HEALTH, LifeArea.FINANCE, LifeArea.PROFESSIONAL],
    enum: LifeArea,
    isArray: true,
    minItems: 3,
    maxItems: 6,
  })
  @IsArray({ message: 'Areas must be an array' })
  @ArrayMinSize(3, { message: 'Please select at least 3 life areas' })
  @ArrayMaxSize(6, { message: 'You can select at most 6 life areas' })
  @IsEnum(LifeArea, {
    each: true,
    message: 'Each area must be a valid life area',
  })
  areas: LifeArea[];
}
