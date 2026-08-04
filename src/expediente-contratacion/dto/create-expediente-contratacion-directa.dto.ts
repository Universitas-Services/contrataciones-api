import { IsEnum, IsNumber, IsPositive, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoContratacion } from '@prisma/client';

export class CreateExpedienteContratacionDirectaDto {
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

  @ApiProperty({ description: 'Numeral de la causal de procedencia (Art. 101 LCP)', example: '1' })
  @IsString()
  numeralCausalProcedenciaCd: string;

  @ApiProperty({ description: 'Texto legal completo de la causal seleccionada' })
  @IsString()
  causalProcedenciaCd: string;

  @ApiProperty({ description: 'ID de la Unidad Contratante responsable' })
  @IsString()
  unidadContratanteId: string;

  @ApiProperty({ description: 'Tasa referencial del BCV', required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  tasaReferencialBcv?: number;

  @ApiProperty({ description: 'Fecha del acta de inicio', example: '2026-03-31', required: false })
  @IsOptional()
  @IsDateString()
  fechaActaInicio?: string;
}
