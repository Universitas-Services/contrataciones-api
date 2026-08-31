import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Micromódulo "Actividades Previas".
 *
 * Todos los campos son opcionales porque el mismo DTO sirve para guardar
 * borradores parciales; las reglas estrictas se aplican al completar.
 */
export class ActividadesPreviasDto {
  @ApiPropertyOptional({ example: 'SNC-2026-000123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numReferenciaSnc?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  modifRequerimientoSnc?: boolean;

  @ApiPropertyOptional({ example: 'MOD-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroModifRequerimientoSnc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  justificacionNecesidadContratacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  justificacionVentajas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  condicionPlurianual?: boolean;

  @ApiPropertyOptional({ description: 'Obligatorio solo en contrataciones de OBRAS' })
  @IsOptional()
  @IsBoolean()
  proyectoAprobado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  permitePymesCooperativas?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  justificacionPermitePymesCooperativas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  viabilidadContratoMarco?: boolean;

  @ApiPropertyOptional({ description: 'Justificación del contrato marco' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  justificacionContratoMarco?: string;

  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsDateString()
  fecEstudioMercado?: string;

  @ApiPropertyOptional({ example: 'CDP-2026-0045' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numCertificacionPresupuestaria?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  plazoEjecucionProcedimiento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  lugarLogisticaEjecucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiereEspecializado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detalleEspecializado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiereMuestras?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  detalleProcedimientoMuestras?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activaPromocionEconomica?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiereVan?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Puntaje VAN (1 a 10)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  puntajeVan?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  indPrefLocal?: boolean;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  puntuacionBonoLocal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  indBonoSujeto?: boolean;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  puntuacionBonoSujeto?: number;
}
