import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoContratacion, ModalidadSeleccion } from '@prisma/client';

export class CreateExpedienteDraftDto {
  // Datos del Expediente
  @ApiProperty({ description: 'Objeto de la contratación' })
  @IsString()
  descripcionObjeto: string;

  @ApiProperty({ description: 'Nomenclatura del proceso' })
  @IsString()
  codigoNomenclatura: string;

  // Datos de la Modalidad
  @ApiProperty({ enum: TipoContratacion, description: 'Tipo de Obras, Bienes o Servicios' })
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

  @ApiProperty({
    enum: ModalidadSeleccion,
    description: 'Modalidad sugerida confirmada por el usuario',
  })
  @IsEnum(ModalidadSeleccion)
  modalidadSeleccion: ModalidadSeleccion;
}
