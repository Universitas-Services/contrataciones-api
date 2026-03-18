import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstatusProceso, TipoContratacion } from '@prisma/client';

export class QueryExpedienteDto {
  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad de registros por página', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Buscar por nomenclatura o descripción del objeto' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: EstatusProceso, description: 'Filtrar por estado del proceso' })
  @IsOptional()
  @IsEnum(EstatusProceso)
  estatus?: EstatusProceso;

  @ApiPropertyOptional({
    enum: TipoContratacion,
    description: 'Filtrar por tipo de contratación (obras, bienes, servicios)',
  })
  @IsOptional()
  @IsEnum(TipoContratacion)
  tipo?: TipoContratacion;
}
