import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnidadUsuariaDto {
  @ApiProperty({
    description: 'Nombre de la Unidad Usuaria',
    example: 'Dirección de Tecnología',
  })
  @IsString()
  @IsNotEmpty()
  nombreUnidadUsuaria: string;

  @ApiProperty({
    description: 'Nombre del responsable de la unidad',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  nombreResponsableUnidadUsuaria: string;

  @ApiProperty({
    description: 'Cargo del responsable de la unidad',
    example: 'Director',
  })
  @IsString()
  @IsNotEmpty()
  cargoResponsableUnidadUsuaria: string;

  @ApiPropertyOptional({
    description: 'Cédula del responsable de la unidad usuaria',
    example: 'V-12345678',
  })
  @IsString()
  @IsOptional()
  cedulaResponsableUnidadUsuaria?: string;

  @ApiPropertyOptional({
    description: 'Datos de designación del responsable de la unidad usuaria',
    example: 'Resolución N° 45-2025',
  })
  @IsString()
  @IsOptional()
  datosDesignacionUnidadUsuaria?: string;
}
