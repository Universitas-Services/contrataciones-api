import { IsString, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfertaPresentadaDto {
  @ApiProperty({
    description: 'ID del expediente de contratación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  expedienteId: string;

  @ApiPropertyOptional({
    description: 'ID del proveedor si ya está registrado en el sistema',
  })
  @IsUUID()
  @IsOptional()
  proveedorId?: string;

  @ApiProperty({
    description: 'RIF de la empresa oferente (rif_proveedor_oferente_au_au)',
    example: 'J-12345678-9',
  })
  @IsString()
  rifProveedorOferente: string;

  @ApiProperty({
    description: 'Nombre de la empresa oferente (nombre_proveedor_oferente_au_au)',
    example: 'Constructora Los Andes C.A.',
  })
  @IsString()
  nombreProveedorOferente: string;

  @ApiProperty({
    description: 'Nombre y apellido del Representante Legal (nombre_rep_legal_oferente_au_au)',
    example: 'Jesús Alberto Rodríguez',
  })
  @IsString()
  nombreRepLegalOferente: string;

  @ApiProperty({
    description: 'Cédula de identidad del Representante Legal (cedula_rep_legal_oferente_au_au)',
    example: 'V-15.845.210',
  })
  @IsString()
  cedulaRepLegalOferente: string;

  @ApiPropertyOptional({
    description:
      'Datos del Registro Mercantil de la empresa oferente (datos_registro_mercantil_proveedor_oferente_au_au)',
  })
  @IsString()
  @IsOptional()
  datosRegistroMercantilProveedorOferente?: string;

  @ApiProperty({
    description: 'Cantidad de sobres entregados por la empresa (num_sobres_entregados_au_au)',
    example: 2,
  })
  @IsNumber()
  numeroSobresEntregados: number;

  @ApiProperty({
    description: 'Monto de la oferta en Bolívares (monto_oferta_bs_au_au)',
    example: 150000.5,
  })
  @IsNumber()
  montoOfertaBs: number;
}
