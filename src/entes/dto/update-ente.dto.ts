import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateEnteDto {
  @ApiProperty({
    description: 'Nombre oficial del Ente Público',
    example: 'Alcaldía del Municipio Libertador',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    description: 'Registro de Información Fiscal (RIF)',
    example: 'G-20000000-0',
    required: false,
  })
  @IsString()
  @IsOptional()
  rif?: string;

  @ApiProperty({
    description: 'Siglas o abreviatura del Ente',
    example: 'AML',
    required: false,
  })
  @IsString()
  @IsOptional()
  siglas?: string;

  @ApiProperty({
    description: 'URL del logo del Ente',
    example: 'https://cloudinary.com/logo.png',
    required: false,
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiProperty({
    description: 'Dirección fiscal completa',
    example: 'Av. Urdaneta, Palacio Municipal',
    required: false,
  })
  @IsString()
  @IsOptional()
  direccionFiscal?: string;

  @ApiProperty({
    description: 'Estado de ubicación del Ente',
    example: 'Distrito Capital',
    required: false,
  })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiProperty({
    description: 'Municipio de ubicación',
    example: 'Libertador',
    required: false,
  })
  @IsString()
  @IsOptional()
  municipio?: string;

  @ApiProperty({
    description: 'Parroquia de ubicación',
    example: 'Catedral',
    required: false,
  })
  @IsString()
  @IsOptional()
  parroquia?: string;

  @ApiProperty({
    description: 'Nombre de la Unidad Administrativa Financiera',
    example: 'Dirección de Administración',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombreUnidadAdminFinanciera?: string;

  @ApiProperty({
    description: 'Nombre de la Unidad de Tecnología',
    example: 'Dirección de Tecnología e Información',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombreUnidadTecnologia?: string;

  @ApiProperty({
    description: 'Nombre de la Unidad Contratante',
    example: 'Servicio de Contrataciones',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombreUnidadContratante?: string;

  @ApiProperty({
    description: 'Organo de Adscripción',
    example: 'Ministerio del Poder Popular para...',
    required: false,
  })
  @IsString()
  @IsOptional()
  organoAdscripcion?: string;
}
