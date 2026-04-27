import { IsBoolean, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSobre2Dto {
  // --- Sección B: 6 ítems ---

  @ApiPropertyOptional({
    description: '¿Presentó oferta técnico-económica? (oferta_tecnico_economica_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  ofertaTecnicoEconomica?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_oferta_tecnico_economica_au_au)' })
  @IsString()
  @IsOptional()
  obsOfertaTecnicoEconomica?: string;

  @ApiPropertyOptional({ description: '¿Presentó carta de oferta? (carta_oferta_au_au)' })
  @IsBoolean()
  @IsOptional()
  cartaOferta?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_carta_oferta_au_au)' })
  @IsString()
  @IsOptional()
  obsCartaOferta?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó declaración de capacidad financiera? (declaracion_capacidad_financiera_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  declaracionCapacidadFinanciera?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_declaracion_capacidad_financiera_au_au)' })
  @IsString()
  @IsOptional()
  obsDeclaracionCapacidadFinanciera?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó Compromiso de Responsabilidad Social? (declaracion_compromiso_resp_social_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  declaracionCompromisoRespSocial?: boolean;

  @ApiPropertyOptional({
    description: 'Observación (obs_declaracion_compromiso_resp_social_au_au)',
  })
  @IsString()
  @IsOptional()
  obsDeclaracionCompromisoRespSocial?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó Garantía de Mantenimiento de la Oferta? (garantia_mantenimiento_oferta_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  garantiaMantenimientoOferta?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_garantia_mantenimiento_oferta_au_au)' })
  @IsString()
  @IsOptional()
  obsGarantiaMantenimientoOferta?: string;

  @ApiPropertyOptional({
    description:
      '¿Consignó declaración de Autocálculo del VAN? (declaracion_autocalculo_van_au_au) - Opcional',
  })
  @IsBoolean()
  @IsOptional()
  declaracionAutocalculoVan?: boolean;

  @ApiPropertyOptional({ description: 'Observación (obs_declaracion_autocalculo_van_au_au)' })
  @IsString()
  @IsOptional()
  obsDeclaracionAutocalculoVan?: string;

  // --- Evaluación técnica: 4 criterios dinámicos (VarChar según tipo_objeto) ---

  @ApiPropertyOptional({
    description:
      'Texto del criterio 1 según tipo de objeto (criterio_1_evaluacion_au_au). Ej: "Tiempo de entrega" / "Plan de trabajo" / "Cronograma de Ejecución"',
  })
  @IsString()
  @IsOptional()
  criterio1Evaluacion?: string;

  @ApiPropertyOptional({
    description: 'Puntaje obtenido para el criterio 1 (puntuacion_criterio_1_au_au)',
    example: 40,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  puntuacionCriterio1?: number;

  @ApiPropertyOptional({ description: 'Texto del criterio 2 (criterio_2_evaluacion_au_au)' })
  @IsString()
  @IsOptional()
  criterio2Evaluacion?: string;

  @ApiPropertyOptional({
    description: 'Puntaje obtenido para el criterio 2 (puntuacion_criterio_2_au_au)',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  puntuacionCriterio2?: number;

  @ApiPropertyOptional({ description: 'Texto del criterio 3 (criterio_3_evaluacion_au_au)' })
  @IsString()
  @IsOptional()
  criterio3Evaluacion?: string;

  @ApiPropertyOptional({
    description: 'Puntaje obtenido para el criterio 3 (puntuacion_criterio_3_au_au)',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  puntuacionCriterio3?: number;

  @ApiPropertyOptional({ description: 'Texto del criterio 4 (criterio_4_evaluacion_au_au)' })
  @IsString()
  @IsOptional()
  criterio4Evaluacion?: string;

  @ApiPropertyOptional({
    description: 'Puntaje obtenido para el criterio 4 (puntuacion_criterio_4_au_au)',
    example: 20,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  puntuacionCriterio4?: number;

  // --- Evaluación económica ---

  @ApiPropertyOptional({
    description: 'Monto Bs. de la oferta (monto_oferta_au_au)',
    example: 500000.5,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  montoOfertaBs?: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de Valor Agregado Nacional – VAN (porcentaje_van_au_au)',
    example: 75,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  porcentajeVan?: number;

  // --- Calificación y prelación ---

  @ApiPropertyOptional({
    description:
      '¿El oferente cumplió con la calificación legal, técnica y financiera? (oferente_calificado_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  oferenteCalificado?: boolean;

  @ApiPropertyOptional({
    description: 'Motivo de descalificación (motivo_descalificacion_oferente_au_au)',
  })
  @IsString()
  @IsOptional()
  motivoDescalificacion?: string;

  @ApiPropertyOptional({
    description: 'Posición de prelación del oferente (posicion_prelacion_au_au)',
    example: 'Primera Opción',
    enum: [
      'Primera Opción',
      'Segunda Opción',
      'Tercera Opción',
      'Cuarta Opción',
      'Quinta Opción',
      'Sexta Opción',
    ],
  })
  @IsString()
  @IsOptional()
  posicionPrelacion?: string;
}
