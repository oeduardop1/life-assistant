import { IsArray, ArrayMinSize, ArrayMaxSize, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LifeArea } from '@life-assistant/shared';

export class AreasStepDto {
  @ApiProperty({
    description: 'Selected life areas (minimum 3, maximum 8)',
    example: [LifeArea.HEALTH, LifeArea.FINANCIAL, LifeArea.CAREER],
    enum: LifeArea,
    isArray: true,
    minItems: 3,
    maxItems: 8,
  })
  @IsArray({ message: 'Areas must be an array' })
  @ArrayMinSize(3, { message: 'Please select at least 3 life areas' })
  @ArrayMaxSize(8, { message: 'You can select at most 8 life areas' })
  @IsEnum(LifeArea, {
    each: true,
    message: 'Each area must be a valid life area',
  })
  areas: LifeArea[];
}
