import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class DictamenParcialDto {
  @ApiProperty({ description: 'oferente_adjudicado_procedimiento_au_au' })
  @IsBoolean()
  oferenteAdjudicadoProcedimientoAuAu: boolean;

  @ApiPropertyOptional({ description: 'Obligatorio si no adjudicado' })
  @ValidateIf((o) => o.oferenteAdjudicadoProcedimientoAuAu === false)
  @IsString()
  causaNoAdjudicadoAuAu?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.oferenteAdjudicadoProcedimientoAuAu === true)
  @IsInt()
  @Min(1)
  @Type(() => Number)
  cantidadRenglonesAuAu?: number;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.oferenteAdjudicadoProcedimientoAuAu === true)
  @IsString()
  alcanceAdjudicacionParcialAuAu?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.oferenteAdjudicadoProcedimientoAuAu === true)
  @IsString()
  partidasAdjudicadasParcialAuAu?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.oferenteAdjudicadoProcedimientoAuAu === true)
  @IsNumber()
  @Type(() => Number)
  montoAdjudicadoParcialAuAu?: number;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.oferenteAdjudicadoProcedimientoAuAu === true)
  @IsInt()
  @Min(1)
  @Type(() => Number)
  plazoEjecucionOfertaParcialAuAu?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificacionGenerada?: boolean;
}
