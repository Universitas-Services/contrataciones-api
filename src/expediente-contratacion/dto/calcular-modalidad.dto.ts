import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoContratacion } from '@prisma/client';

export class CalcularModalidadDto {
  @ApiProperty({
    enum: TipoContratacion,
    description: 'Tipo de objeto de la contratación',
    example: TipoContratacion.BIENES,
  })
  @IsEnum(TipoContratacion)
  tipoContratacion: TipoContratacion;

  @ApiProperty({
    description: 'Monto estimado en Bolívares (Bs)',
    example: 4500000,
  })
  @IsNumber()
  @IsPositive()
  montoEstimadoBs: number;
}
