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

  @ApiPropertyOptional({
    description:
      'Monto de mano de obra ofertado (Bs.). Obligatorio si Fase 1 exige garantía laboral. monto_mano_obra_ofertado_au_au',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  montoManoObraOfertadoAuAu?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificacionGenerada?: boolean;
}
