import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerarPliegoDto {
  @ApiProperty({
    description: 'ID del expediente de contratación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  expedienteId: string;

  @ApiPropertyOptional({ description: 'Descripción del pliego a generar' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
