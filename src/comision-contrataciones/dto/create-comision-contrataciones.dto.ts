import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
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

  @ApiPropertyOptional({
    description: 'Datos de designación de la comisión',
    example: 'Resolución Nro. 005',
  })
  @IsString()
  @IsOptional()
  datosDesignacionComision?: string;

  @ApiPropertyOptional({
    description: 'Indica si la comisión está certificada',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  comisionCertificada?: boolean;

  @ApiPropertyOptional({
    description: 'Número de teléfono de contacto de la comisión',
    example: '0251-234-5678',
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico de contacto de la comisión',
    example: 'comision@alcaldia.gob.ve',
  })
  @IsEmail({}, { message: 'El correo electrónico de la comisión no tiene un formato válido' })
  @IsOptional()
  correoElectronico?: string;

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
