import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class CreateAdjudicacionDto {
  @ApiProperty({ description: 'Monto adjudicado en Bs.', example: 1000.5 })
  @IsNumber()
  @IsNotEmpty()
  montoAdjudicadoBs: number;

  @ApiProperty({ description: 'Partida presupuestaria al cual se imputará el gasto' })
  @IsString()
  @IsNotEmpty()
  partidaPresupuestariaGasto: string;

  @ApiProperty({ description: 'Monto en Bs. del Compromiso de Responsabilidad Social' })
  @IsNumber()
  @IsNotEmpty()
  montoCrsBs: number;

  @ApiProperty({ description: 'Referencia de la recomendación emitida por la comisión' })
  @IsString()
  @IsNotEmpty()
  referenciaRecomendacion: string;
}
