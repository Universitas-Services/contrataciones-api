import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerarPliegoDto {
  @ApiProperty({ description: 'ID del expediente de contratación', example: 'uuid-expediente' })
  @IsUUID()
  expedienteId: string;

  @ApiPropertyOptional({ description: 'Descripción del pliego a generar' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
