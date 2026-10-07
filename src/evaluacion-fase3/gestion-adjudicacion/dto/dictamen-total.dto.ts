import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DictamenTotalDto {
  @ApiProperty({
    description: 'Partidas adjudicadas (CSV o texto). partidas_adjudicadas_total_au_au',
  })
  @IsString()
  partidasAdjudicadasTotalAuAu: string;

  @ApiProperty({ description: 'Monto adjudicado total Bs. monto_adjudicado_total_au_au' })
  @IsNumber()
  @Type(() => Number)
  montoAdjudicadoTotalAuAu: number;

  @ApiProperty({ description: 'Plazo ejecución días. plazo_ejecucion_oferta_ganadora_au_au' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  plazoEjecucionOfertaGanadoraAuAu: number;

  @ApiProperty({ description: 'ind_verificado_garantia_au_au' })
  @IsBoolean()
  indVerificadoGarantiaAuAu: boolean;

  @ApiProperty({ description: 'ind_verificado_crs_au_au' })
  @IsBoolean()
  indVerificadoCrsAuAu: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificacionGenerada?: boolean;
}
