import { IsBoolean, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para el endpoint PATCH /:evaluacionId/calificacion
 * Cubre las secciones de Calificación Legal, Financiera y Técnica (Sobre 1 resumen),
 * así como la descalificación global y la evaluación técnica de la Matriz (Sobre 2).
 */
export class UpdateCalificacionDto {
  // ─── Calificación LEGAL ───────────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      '¿El oferente cumplió con la calificación legal? (oferente_calificado_legal_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  oferenteCalificadoLegal?: boolean;

  @ApiPropertyOptional({
    description:
      'Justificación de la calificación legal (justificacion_calificado_legal_au_au)',
  })
  @IsString()
  @IsOptional()
  justificacionCalificadoLegal?: string;

  // ─── Calificación FINANCIERA ──────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      'Índice de Liquidez (Activo Corriente / Pasivo Corriente) (indice_liquidez_au_au)',
    example: 1.5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  indiceLiquidez?: number;

  @ApiPropertyOptional({
    description:
      'Índice de Solvencia (Pasivo Total / Activo Total) (indice_solvencia_au_au)',
    example: 0.6,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  indiceSolvencia?: number;

  @ApiPropertyOptional({
    description:
      '¿El oferente cumplió con la calificación financiera? (oferente_calificado_financiera_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  oferenteCalificadoFinanciera?: boolean;

  @ApiPropertyOptional({
    description:
      'Justificación de la calificación financiera (justificacion_calificado_financiera_au_au)',
  })
  @IsString()
  @IsOptional()
  justificacionCalificadaFinanciera?: string;

  // ─── Calificación TÉCNICA (Sobre 1 — resumen de puntajes) ────────────────

  @ApiPropertyOptional({
    description:
      'Puntaje asignado en el criterio Actividad Comercial (actividad_comercial_au_au)',
    example: 15,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  actividadComercial?: number;

  @ApiPropertyOptional({
    description:
      'Puntaje asignado en el criterio Relación de Suministros (relacion_suministros_au_au)',
    example: 15,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  relacionSuministros?: number;

  @ApiPropertyOptional({
    description:
      'Puntaje asignado en el criterio Referencias Comerciales (referencias_comerciales_puntaje_au_au)',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  referenciasComercialesPuntaje?: number;

  @ApiPropertyOptional({
    description:
      '¿El oferente cumplió con la calificación técnica? (oferente_calificado_tecnica_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  oferenteCalificadoTecnica?: boolean;

  @ApiPropertyOptional({
    description:
      'Justificación de la calificación técnica (justificacion_calificado_tecnica_au_au)',
  })
  @IsString()
  @IsOptional()
  justificacionCalificadoTecnica?: string;

  // ─── Descalificación GLOBAL ───────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      '¿El oferente califica en el procedimiento? true = califica, false = descalificado (oferente_calificado_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  oferenteCalificado?: boolean;

  @ApiPropertyOptional({
    description:
      'Motivo de descalificación del oferente (motivo_descalificacion_oferente_au_au)',
  })
  @IsString()
  @IsOptional()
  motivoDescalificacion?: string;

  @ApiPropertyOptional({
    description:
      'Ítems del Pliego o artículo de Ley incumplido (items_descalificacion_oferente_au_au)',
  })
  @IsString()
  @IsOptional()
  itemsDescalificacion?: string;

  // ─── Evaluación TÉCNICA (Matriz — Sobre 2) ────────────────────────────────

  @ApiPropertyOptional({
    description:
      '¿El oferente cumplió con la evaluación técnica? (oferente_evaluado_tecnico_au_au)',
  })
  @IsBoolean()
  @IsOptional()
  oferenteEvaluadoTecnico?: boolean;

  @ApiPropertyOptional({
    description:
      'Justificación de la evaluación técnica (justificacion_evaluado_tecnico_au_au)',
  })
  @IsString()
  @IsOptional()
  justificacionEvaluadoTecnico?: string;

  // ─── Posición de prelación ────────────────────────────────────────────────

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
