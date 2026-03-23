import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMiembroComisionDto } from './create-miembro-comision.dto';

export class CreateComisionContratacionesDto {
  @ApiProperty({
    description: 'Denominación de la Comisión',
    example: 'Comisión Permanente de Contrataciones',
  })
  @IsString()
  @IsNotEmpty()
  denominacionComision: string;

  @ApiProperty({
    description: 'Datos de designación de la comisión',
    example: 'Resolución Nro. 005',
    required: false,
  })
  @IsString()
  @IsOptional()
  datosDesignacionComision?: string;

  @ApiProperty({
    description: 'Indica si la comisión está certificada',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  comisionCertificada?: boolean;

  @ApiProperty({
    description: 'Lista de los 8 miembros requeridos (1 principal y 1 suplente por cada área)',
    type: [CreateMiembroComisionDto],
    required: true,
  })
  @IsArray()
  @ArrayMinSize(8, { message: 'La comisión debe tener exactamente 8 miembros' })
  @ArrayMaxSize(8, { message: 'La comisión debe tener exactamente 8 miembros' })
  @ValidateNested({ each: true })
  @Type(() => CreateMiembroComisionDto)
  @IsNotEmpty()
  miembros: CreateMiembroComisionDto[];
}
