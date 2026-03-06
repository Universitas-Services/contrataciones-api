import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateEnteDto {
  @ApiProperty({
    description: 'Nombre oficial del Ente Público',
    example: 'Alcaldía del Municipio Libertador',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

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
    description: 'Ciudad de ubicación',
    example: 'Caracas',
    required: false,
  })
  @IsString()
  @IsOptional()
  ciudad?: string;

  // Datos del Usuario Administrador del Ente
  @ApiProperty({
    description: 'Correo electrónico del administrador del Ente',
    example: 'admin@alcaldia.gob.ve',
  })
  @IsEmail()
  @IsNotEmpty()
  emailContacto: string;

  @ApiProperty({
    description: 'Contraseña para el acceso inicial (min. 6 caracteres)',
    example: 'Seguridad2024!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Nombre del administrador',
    example: 'Juan',
  })
  @IsString()
  @IsNotEmpty()
  nombreAdmin: string;

  @ApiProperty({
    description: 'Apellido del administrador',
    example: 'Pérez',
  })
  @IsString()
  @IsNotEmpty()
  apellidoAdmin: string;
}
