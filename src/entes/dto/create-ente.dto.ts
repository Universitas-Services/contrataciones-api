import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateEnteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  rif?: string;

  @IsString()
  @IsOptional()
  siglas?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  direccionFiscal?: string;

  @IsString()
  @IsOptional()
  estado?: string;

  @IsString()
  @IsOptional()
  municipio?: string;

  @IsString()
  @IsOptional()
  parroquia?: string;

  // Datos del Usuario Administrador del Ente
  @IsEmail()
  @IsNotEmpty()
  emailContacto: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  nombreAdmin: string;

  @IsString()
  @IsNotEmpty()
  apellidoAdmin: string;
}
