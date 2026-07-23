import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnidadContratanteDto {
  @ApiProperty({
    description: 'Nombre de la Unidad Contratante',
    example: 'Comisión de Contrataciones',
  })
  @IsString()
  @IsNotEmpty()
  nombreUnidadContratante: string;

  @ApiProperty({
    description: 'Nombre del responsable de la unidad',
    example: 'Ana Gómez',
  })
  @IsString()
  @IsNotEmpty()
  nombreResponsableUnidad: string;

  @ApiPropertyOptional({
    description: 'Nombre del responsable de la unidad contratante',
    example: 'Ana Gómez',
  })
  @IsString()
  @IsOptional()
  nombreResponsableUnidadContratante?: string;

  @ApiProperty({
    description: 'Cargo del responsable de la unidad',
    example: 'Presidenta de la Comisión',
  })
  @IsString()
  @IsNotEmpty()
  cargoResponsable: string;

  @ApiPropertyOptional({
    description: 'Cédula del responsable de la unidad contratante',
    example: 'V-87654321',
  })
  @IsString()
  @IsOptional()
  cedulaResponsableUnidadContratante?: string;

  @ApiPropertyOptional({
    description: 'Datos de designación del responsable de la unidad contratante',
    example: 'Providencia N° 12-2026',
  })
  @IsString()
  @IsOptional()
  datosDesignacionUnidadContratante?: string;

  @ApiHideProperty()
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
