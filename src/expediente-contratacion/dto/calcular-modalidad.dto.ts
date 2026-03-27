import { IsEnum, IsNumber, IsPositive, IsOptional } from 'class-validator';
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

  @ApiProperty({
    description: 'Valor actual de la UCAU consultado desde el cliente (opcional, por defecto 35.0)',
    example: 35.0,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  valorUcauBase?: number;
}
