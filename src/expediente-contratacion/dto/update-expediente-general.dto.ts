import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoContratacion, ModalidadSeleccion } from '@prisma/client';

export class UpdateExpedienteGeneralDto {
  // --- DATOS BÁSICOS (EXPEDIENTE) ---
  @ApiPropertyOptional({ description: 'Objeto de la contratación' })
  @IsString()
  @IsOptional()
  descripcionObjeto?: string;

  @ApiPropertyOptional({ description: 'Nomenclatura del proceso' })
  @IsString()
  @IsOptional()
  codigoNomenclatura?: string;

  // --- DATOS DE LA MODALIDAD ---
  @ApiPropertyOptional({ enum: TipoContratacion, description: 'Tipo de Obras, Bienes o Servicios' })
  @IsEnum(TipoContratacion)
  @IsOptional()
  tipoContratacion?: TipoContratacion;

  @ApiPropertyOptional({ description: 'Monto estimado en bolívares' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  montoEstimadoBs?: number;

  @ApiPropertyOptional({ description: 'Monto equivalente en dólares' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  montoEstimadoDolar?: number;

  @ApiPropertyOptional({ description: 'Valor base de UCAU usado para el cálculo' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  valorUcauBase?: number;

  @ApiPropertyOptional({
    enum: ModalidadSeleccion,
    description: 'Modalidad sugerida confirmada por el usuario',
  })
  @IsEnum(ModalidadSeleccion)
  @IsOptional()
  modalidadSeleccion?: ModalidadSeleccion;

  // --- ACTORES DEL EXPEDIENTE ---
  @ApiPropertyOptional({ description: 'ID de la Máxima Autoridad' })
  @IsString()
  @IsOptional()
  autoridadId?: string;

  @ApiPropertyOptional({ description: 'ID de la Comisión de Contrataciones' })
  @IsString()
  @IsOptional()
  comisionId?: string;

  @ApiPropertyOptional({ description: 'ID de la Unidad Usuaria' })
  @IsString()
  @IsOptional()
  unidadUsuariaId?: string;

  @ApiPropertyOptional({
    description:
      'Indica si el firmante seleccionado para este expediente es el Delegado en vez del Principal',
  })
  @IsBoolean()
  @IsOptional()
  autoridadFirmaComoDelegado?: boolean;

  // --- FECHA BASE DEL CRONOGRAMA ---
  @ApiPropertyOptional({
    description:
      'Fecha central del cronograma (Llamado a Participar). Ingresarla recalculará el cronograma.',
    example: '2026-03-02',
  })
  @IsDateString()
  @IsOptional()
  fechaLlamadoParticipar?: string;
}
