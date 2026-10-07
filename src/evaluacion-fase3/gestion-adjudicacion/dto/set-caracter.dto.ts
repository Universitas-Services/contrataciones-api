import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class SetCaracterAdjudicacionDto {
  @ApiProperty({ enum: ['TOTAL', 'PARCIAL'], example: 'TOTAL' })
  @IsString()
  @IsIn(['TOTAL', 'PARCIAL'])
  caracterAdjudicacion: 'TOTAL' | 'PARCIAL';
}
