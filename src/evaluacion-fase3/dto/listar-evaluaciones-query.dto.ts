import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum EstatusEvaluacion {
  CALIFICADO = 'CALIFICADO',
  DESCALIFICADO = 'DESCALIFICADO',
  PENDIENTE = 'PENDIENTE',
}

export class ListarEvaluacionesQueryDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Registros por página', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filtrar por RIF del proveedor' })
  @IsOptional()
  @IsString()
  rif?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estatus de evaluación',
    enum: EstatusEvaluacion,
  })
  @IsOptional()
  @IsEnum(EstatusEvaluacion)
  estatus?: EstatusEvaluacion;
}
