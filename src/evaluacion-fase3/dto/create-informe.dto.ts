import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * Informe de Recomendación (Gestión Fase 3).
 * Garantía / CRS / plazo preferentemente vienen del dictamen al generar DOCX;
 * se mantienen opcionales por compatibilidad legacy.
 */
export class CreateInformeDto {
  @ApiPropertyOptional({
    description: '¿Existen ítems sin ofertas? (existe_items_sin_ofertas_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  existeItemsSinOfertas?: boolean;

  /** Alias front: existeItemsSinOfertasAuAu */
  @ApiPropertyOptional({ description: 'Alias front de existeItemsSinOfertas' })
  @IsBoolean()
  @IsOptional()
  existeItemsSinOfertasAuAu?: boolean;

  @ApiPropertyOptional({ description: 'Listado de ítems sin ofertas (items_sin_ofertas_au_au)' })
  @ValidateIf((o) => o.existeItemsSinOfertas === true || o.existeItemsSinOfertasAuAu === true)
  @IsString()
  @IsOptional()
  itemsSinOfertas?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  itemsSinOfertasAuAu?: string;

  @ApiPropertyOptional({ description: 'motivo_items_sin_ofertas_au_au' })
  @ValidateIf((o) => o.existeItemsSinOfertas === true || o.existeItemsSinOfertasAuAu === true)
  @IsString()
  @IsOptional()
  motivoItemsSinOfertas?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  motivoItemsSinOfertasAuAu?: string;

  @ApiPropertyOptional({
    description:
      '¿Se actualizó el presupuesto base durante la evaluación? (actualizacion_presupuesto_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  actualizacionPresupuesto?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  actualizacionPresupuestoAuAu?: boolean;

  @ApiPropertyOptional({
    description: 'Monto del nuevo presupuesto base en Bs. (monto_nuevo_presupuesto_au_au)',
    example: 600000,
  })
  @ValidateIf((o) => o.actualizacionPresupuesto === true || o.actualizacionPresupuestoAuAu === true)
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  montoNuevoPresupuesto?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  montoNuevoPresupuestoAuAu?: number;

  @ApiPropertyOptional({
    description:
      'Justificación técnica del nuevo presupuesto base (justificacion_actualizacion_presupuesto_au_au)',
  })
  @ValidateIf((o) => o.actualizacionPresupuesto === true || o.actualizacionPresupuestoAuAu === true)
  @IsString()
  @IsOptional()
  justificacionActualizacionPresup?: string;

  /** Alias front */
  @ApiPropertyOptional({ description: 'Alias front de justificacionActualizacionPresup' })
  @IsString()
  @IsOptional()
  justificacionActualizacionPresupuestoAuAu?: string;

  @ApiPropertyOptional({
    description: 'Legacy — preferir dictamen. ind_verificado_garantia_au_au',
  })
  @IsBoolean()
  @IsOptional()
  indVerificadoGarantia?: boolean;

  @ApiPropertyOptional({
    description: 'Legacy — preferir dictamen. ind_verificado_crs_au_au',
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

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  observacionFormalidadesAuAu?: boolean;

  @ApiPropertyOptional({
    description: 'Descripción de la omisión observada (omision_formalidades_au_au)',
  })
  @ValidateIf((o) => o.observacionFormalidades === true || o.observacionFormalidadesAuAu === true)
  @IsString()
  @IsOptional()
  omisionFormalidades?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  omisionFormalidadesAuAu?: string;

  @ApiPropertyOptional({
    description: 'Decisión tomada ante la omisión (subsanacion_acto_au_au)',
  })
  @ValidateIf((o) => o.observacionFormalidades === true || o.observacionFormalidadesAuAu === true)
  @IsString()
  @IsOptional()
  subsanacionActo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subsanacionActoAuAu?: string;

  @ApiPropertyOptional({
    description: 'Datos del acto de subsanación (datos_acto_subsanacion_au_au)',
  })
  @IsString()
  @IsOptional()
  datosActoSubsanacion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  datosActoSubsanacionAuAu?: string;

  @ApiPropertyOptional({
    description: 'Legacy — preferir dictamen TOTAL. plazo_ejecucion_oferta_ganadora_au_au',
    example: 30,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  plazoEjecucionOfertaGanadora?: number;

  /**
   * Si true, exige los 3 booleanos raíz y sus valores condicionales.
   * El front puede enviar al "generar" el informe.
   */
  @ApiPropertyOptional({
    description: 'Validar como formulario completo (requiere booleanos raíz y condicionales)',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  validarCompleto?: boolean;
}
