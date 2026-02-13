import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
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
    description: 'Lista de miembros iniciales (opcional)',
    type: [CreateMiembroComisionDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMiembroComisionDto)
  @IsOptional()
  miembros?: CreateMiembroComisionDto[];
}
