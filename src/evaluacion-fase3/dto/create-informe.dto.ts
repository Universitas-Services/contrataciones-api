import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInformeDto {
  @ApiPropertyOptional({
    description:
      '¿Se actualizó el presupuesto base durante la evaluación? (actualizacion_presupuesto_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  actualizacionPresupuesto?: boolean;

  @ApiPropertyOptional({
    description: 'Monto del nuevo presupuesto base en Bs. (monto_nuevo_presupuesto_au_au)',
    example: 600000,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  montoNuevoPresupuesto?: number;

  @ApiPropertyOptional({
    description:
      'Justificación técnica del nuevo presupuesto base (justificacion_actualizacion_presupuesto_au_au)',
  })
  @IsString()
  @IsOptional()
  justificacionActualizacionPresup?: string;

  @ApiPropertyOptional({
    description:
      '¿Se verificó que todos los oferentes calificados consignaron la Garantía de Mantenimiento? (ind_verificado_garantia_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  indVerificadoGarantia?: boolean;

  @ApiPropertyOptional({
    description:
      '¿Se verificó que todos presentaron el Compromiso de Responsabilidad Social? (ind_verificado_crs_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  indVerificadoCrs?: boolean;

  @ApiPropertyOptional({
    description:
      '¿Se observaron omisiones de formalidades durante el proceso? (observacion_formalidades_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  observacionFormalidades?: boolean;

  @ApiPropertyOptional({
    description: 'Descripción de la omisión observada (omision_formalidades_au_au)',
  })
  @IsString()
  @IsOptional()
  omisionFormalidades?: string;

  @ApiPropertyOptional({
    description: 'Decisión tomada ante la omisión (subsanacion_acto_au_au)',
  })
  @IsString()
  @IsOptional()
  subsanacionActo?: string;

  @ApiPropertyOptional({
    description: 'Datos del acto de subsanación (datos_acto_subsanacion_au_au)',
  })
  @IsString()
  @IsOptional()
  datosActoSubsanacion?: string;

  @ApiPropertyOptional({
    description:
      'Plazo de ejecución o tiempo de entrega en días de la oferta recomendada (plazo_ejecucion_oferta_ganadora_au_au)',
    example: 30,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  plazoEjecucionOfertaGanadora?: number;
}
