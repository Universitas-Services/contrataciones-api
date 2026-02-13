import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({
    description: 'Cargo del responsable de la unidad',
    example: 'Presidenta de la Comisión',
  })
  @IsString()
  @IsNotEmpty()
  cargoResponsable: string;

  @ApiProperty({
    description: 'Indica si la unidad está activa',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}
