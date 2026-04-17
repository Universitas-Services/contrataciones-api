import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para el registro rápido (mínimo) de un proveedor durante el acto de adquisición
 * de pliego u oferta. El proveedor queda en estado PENDIENTE y puede completar su
 * información luego desde el módulo de Proveedores.
 */
export class RegistroRapidoProveedorDto {
  @ApiProperty({
    description: 'RIF de la empresa (se usará para detectar si ya está registrada)',
    example: 'J-12345678-9',
  })
  @IsString()
  rif: string;

  @ApiProperty({
    description: 'Razón social / nombre comercial de la empresa',
    example: 'Constructora Los Andes C.A.',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Nombre completo del Representante Legal',
    example: 'Juan Pérez',
  })
  @IsString()
  nombreRepLegal: string;

  @ApiProperty({
    description: 'Cédula de identidad del Representante Legal',
    example: 'V-12345678',
  })
  @IsString()
  cedulaRepLegal: string;

  @ApiPropertyOptional({
    description: 'Datos del Registro Mercantil de la empresa',
    example: 'Registro Mercantil Segundo del Estado Lara, bajo el N° 5, Tomo 10-A del Año 2010',
  })
  @IsString()
  @IsOptional()
  datosRegistroMercantil?: string;
}
