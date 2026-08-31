import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
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
  @ApiPropertyOptional({ example: 3, description: 'Porcentaje de CRS (0 a 100)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
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
  @MaxLength(500)
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
  porcentajeFielCumplimiento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  retencionFielCumplimiento?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiereGarantiaLaboral?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  porcentajeGarantiaLaboral?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  retencionFianzaLaboral?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  polizaResponsabilidadCivil?: boolean;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  porcentajeResponsabilidadCivil?: number;

  @ApiPropertyOptional({ example: 500000.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  montoResponsabilidadCivilBs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anticipoContrato?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Porcentaje de anticipo (máximo 50)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  porcentajeAnticipo?: number;

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
