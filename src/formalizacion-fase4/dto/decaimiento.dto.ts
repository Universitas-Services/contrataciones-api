import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/** Causales del Art. 110 LCP. */
export const CAUSALES_DECAIMIENTO = [
  'NO CONSIGNÓ GARANTÍAS',
  'NO FIRMÓ CONTRATO',
  'RECHAZO EXPRESO',
  'INFORMACIÓN FALSA',
] as const;

/** Modalidades degradadas del Art. 114 LCP. */
export const MODALIDADES_DEGRADADAS = [
  'Concurso Cerrado (Art. 85 LCP)',
  'Consulta de Precios (Art. 96 LCP)',
  'Contratación Directa (Art. 101.12 LCP)',
] as const;

export class DeclararDecaimientoDto {
  @ApiProperty({ description: 'Adjudicado que incumplió' })
  @IsUUID()
  infractorEvaluacionId!: string;
}

export class DecisionDecaimientoDto {
  @ApiProperty({ enum: ['SUBSIGUIENTE', 'DESIERTO'] })
  @IsEnum(['SUBSIGUIENTE', 'DESIERTO'])
  decision!: 'SUBSIGUIENTE' | 'DESIERTO';
}

export class CertificadoIncumplimientoDto {
  @ApiProperty({
    example: '2026-10-13',
    description: 'Fecha en que se le notificó la adjudicación',
  })
  @IsISO8601()
  fechaNotificacionAdjudicacionIncumplidor!: string;

  @ApiProperty({ example: '2026-10-23' })
  @IsISO8601()
  fechaCertificacionIncumplimiento!: string;

  @ApiProperty({ enum: CAUSALES_DECAIMIENTO })
  @IsEnum(CAUSALES_DECAIMIENTO)
  causalDecaimiento!: (typeof CAUSALES_DECAIMIENTO)[number];

  // ── SUBSIGUIENTE ────────────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'PARCIAL: lo elige el usuario. TOTAL: lo calcula el backend',
  })
  @IsOptional()
  @IsUUID()
  subsiguienteEvaluacionId?: string;

  @ApiPropertyOptional({ description: 'PARCIAL: renglones que asume el subsiguiente' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  alcanceReadjudicacionParcial?: string;

  @ApiPropertyOptional({ description: 'PARCIAL: monto que se readjudica' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoReadjudicadoParcialBs?: number;

  @ApiPropertyOptional({ description: 'TOTAL: monto que asume el subsiguiente' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoReadjudicadoBs?: number;

  @ApiPropertyOptional({ description: 'Plazo de ejecución del subsiguiente, en días' })
  @IsOptional()
  @IsInt()
  @Min(1)
  plazoEjecucionSubsiguiente?: number;

  // ── DESIERTO ────────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: MODALIDADES_DEGRADADAS })
  @IsOptional()
  @IsEnum(MODALIDADES_DEGRADADAS)
  modalidadDegradadaSugerida?: (typeof MODALIDADES_DEGRADADAS)[number];

  @ApiPropertyOptional({ description: 'PARCIAL desierto: renglones que quedan sin adjudicar' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  renglonesAfectadosDecaimiento?: string;
}

export class ResolucionDecaimientoDto {
  @ApiProperty({ example: 'RESOL-045-2026' })
  @IsString()
  @IsNotEmpty()
  numResolucionDecaimiento!: string;

  @ApiProperty({ example: '2026-10-23' })
  @IsISO8601()
  fechaResolucionDecaimiento!: string;
}
