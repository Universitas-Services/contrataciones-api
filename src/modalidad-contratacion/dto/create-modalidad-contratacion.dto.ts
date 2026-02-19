import { IsEnum, IsNumber, Min } from 'class-validator';
import { TipoContratacion, ModalidadSeleccion } from '@prisma/client';

export class CreateModalidadContratacionDto {
  @IsEnum(TipoContratacion)
  tipoContratacion: TipoContratacion;

  @IsNumber()
  @Min(0)
  montoEstimadoBs: number;

  @IsNumber()
  @Min(0)
  montoEstimadoDolar: number;

  @IsNumber()
  @Min(0)
  valorUcauBase: number;

  @IsEnum(ModalidadSeleccion)
  modalidadSeleccion: ModalidadSeleccion;
}
