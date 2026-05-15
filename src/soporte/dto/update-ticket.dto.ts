import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    description: 'Nuevo asunto del ticket (opcional)',
    example: 'Corrección: Error al cargar documento',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  asunto?: string;

  @ApiPropertyOptional({
    description: 'Nueva descripción detallada (opcional)',
    example: 'He revisado bien y el error 500 solo ocurre con archivos mayores a 5MB.',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
