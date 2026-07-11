import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoContratacion } from '@prisma/client';

export class CreateExpedienteModalidadExcluidaDto {
  @ApiProperty({ description: 'Objeto de la contratación' })
  @IsString()
  descripcionObjeto: string;

  @ApiProperty({ description: 'Nomenclatura del proceso' })
  @IsString()
  codigoNomenclatura: string;

  @ApiProperty({ enum: TipoContratacion, description: 'Tipo: BIENES, SERVICIOS u OBRAS' })
  @IsEnum(TipoContratacion)
  tipoContratacion: TipoContratacion;

  @ApiProperty({ description: 'Monto estimado en bolívares' })
  @IsNumber()
  @IsPositive()
  montoEstimadoBs: number;

  @ApiProperty({ description: 'Monto equivalente en dólares' })
  @IsNumber()
  @IsPositive()
  montoEstimadoDolar: number;

  @ApiProperty({ description: 'Valor base de UCAU usado para el cálculo' })
  @IsNumber()
  @IsPositive()
  valorUcauBase: number;
}
