import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMaximaAutoridadDto {
  @ApiProperty({
    description: 'Nombre completo de la máxima autoridad',
    example: 'María Rodríguez',
  })
  @IsString()
  @IsNotEmpty()
  nombreCompletoAutoridad: string;

  @ApiProperty({
    description: 'Cédula de identidad',
    example: 'V-12345678',
  })
  @IsString()
  @IsNotEmpty()
  cedulaAutoridad: string;

  @ApiProperty({
    description: 'Cargo oficial que ocupa',
    example: 'Alcaldesa',
  })
  @IsString()
  @IsNotEmpty()
  cargoOficialAutoridad: string;

  @ApiProperty({
    description: 'Datos de la designación (Gaceta, Resolución, etc.)',
    example: 'Gaceta Municipal Nro. 123 de fecha 01/01/2024',
    required: false,
  })
  @IsString()
  @IsOptional()
  datosDesignacionAutoridad?: string;

  @ApiProperty({
    description: 'Leyes o atribuciones que le permiten suscribir contratos',
    example: 'Artículos 45 y 46 de la Ley Orgánica de...',
    required: false,
  })
  @IsString()
  @IsOptional()
  leyesAtribucionesSuscribirAutoridad?: string;

  @ApiProperty({
    description: 'Indica si es una autoridad delegada',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  esDelegado?: boolean;

  @ApiHideProperty()
  @IsBoolean()
  @IsOptional()
  vigente?: boolean;

  // --- Datos del Delegado (si aplica) ---

  @ApiProperty({
    description: 'Nombre completo del delegado (si esDelegado es true)',
    example: 'Pedro Pérez',
    required: false,
  })
  @IsString()
  @IsOptional()
  nombreCompletoDelegado?: string;

  @ApiProperty({
    description: 'Cédula del delegado',
    example: 'V-87654321',
    required: false,
  })
  @IsString()
  @IsOptional()
  cedulaDelegado?: string;

  @ApiProperty({
    description: 'Cargo oficial del delegado',
    example: 'Director General',
    required: false,
  })
  @IsString()
  @IsOptional()
  cargoOficialDelegado?: string;

  @ApiProperty({
    description: 'Datos de designación del delegado',
    example: 'Resolución Nro. 001',
    required: false,
  })
  @IsString()
  @IsOptional()
  datosDesignacionDelegado?: string;

  @ApiProperty({
    description: 'Leyes o atribuciones del delegado',
    required: false,
  })
  @IsString()
  @IsOptional()
  leyesAtribucionesSuscribirDelegado?: string;
}
