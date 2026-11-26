import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Micromódulo "Aspectos Generales del Pliego" (régimen legal, oferta, CRS y garantías). */
export class AspectosGeneralesDto {
  // --- Paso 1: Régimen legal ---
  @ApiPropertyOptional({ example: 'Acta de Junta Directiva Nro 123-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  datosActoAutorizacionInicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  autoridadAclaratorias?: string;

  @ApiPropertyOptional({ type: [String], example: ['Ley de Contrataciones Públicas Art. 123'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  normativaLegal?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Ids de la normativa general (GET /biblioteca/normativa-global) elegidos para el pliego, ' +
      'en cualquier orden: el pliego las imprime en el orden de la documentación. ' +
      'Para completar el módulo hace falta al menos una.',
    example: ['3f0c6a1e-…'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  normativasGeneralesIds?: string[];

  // --- Paso 2: Condiciones de oferta ---
  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  diasValidezOferta?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  diasVigenciaGarantiaExtension?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  monedaDiferente?: boolean;

  @ApiPropertyOptional({ example: 'Dólar estadounidense' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nomMonedaExtranjera?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  idiomaDiferente?: boolean;

  @ApiPropertyOptional({ example: 'Inglés' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nomIdiomaDiferente?: string;

  // --- Paso 3: Compromiso de Responsabilidad Social ---
  @ApiPropertyOptional({ example: 3, description: 'Porcentaje de CRS (0 a 3, Art. 31 LCP)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  // El borrador acepta de 0 a 100: el rango legal se valida al completar (QA 26/11).
  @Min(0, { message: 'El porcentaje de CRS debe estar entre 0 y 100' })
  @Max(100, { message: 'El porcentaje de CRS debe estar entre 0 y 100' })
  porcentajeResponsabilidadSocial?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  unidadRespCumplimientoCrs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  modalidadCrs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  formaCumplimientoCrs?: string;

  // --- Paso 4: Garantías y anticipos ---
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  porcentajeMantenimientoOferta?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  // El borrador acepta de 0 a 100: el rango legal se valida al completar (QA 26/11).
  @Min(0, { message: 'El porcentaje de fiel cumplimiento debe estar entre 0 y 100' })
  @Max(100, { message: 'El porcentaje de fiel cumplimiento debe estar entre 0 y 100' })
  porcentajeFielCumplimiento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  retencionFielCumplimiento?: boolean;

  // requiereGarantiaLaboral / polizaResponsabilidadCivil / anticipoContrato
  // (+ follow-ups) se capturan en Actividades Previas.

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anticipoEspecial?: boolean;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  porcentajeAnticipoEspecial?: number;
}
