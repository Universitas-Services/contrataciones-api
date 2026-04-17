import { IsString, IsOptional, IsUUID, IsDateString, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdquirentePliegoDto {
  @ApiProperty({ description: 'ID del expediente de contratación', example: 'uuid-expediente' })
  @IsUUID()
  expedienteId: string;

  @ApiProperty({ description: 'ID del proveedor registrado', example: 'uuid-proveedor' })
  @IsUUID()
  proveedorId: string;

  @ApiProperty({
    description: 'Fecha de adquisición del pliego (fec_adquisicion_pliego_au_au)',
    example: '2026-03-09',
  })
  @IsDateString()
  fechaAdquisicion: string;

  @ApiProperty({
    description: 'Nombre de la empresa que adquiere el pliego (nombre_proveedor_adquiriente_au_au)',
    example: 'Constructora Los Andes C.A.',
  })
  @IsString()
  nombreProveedorAdquiriente: string;

  @ApiProperty({
    description:
      'Domicilio fiscal de la empresa adquiriente (direccion_fiscal_proveedor_adquirente_au_au)',
    example: 'Av. Principal, Edificio Centro, Barquisimeto, Lara',
  })
  @IsString()
  direccionFiscalProveedorAdquirente: string;

  @ApiProperty({
    description:
      'Teléfono de contacto de la empresa adquiriente (telefono_proveedor_adquirente_au_au)',
    example: '0251-123-4567',
  })
  @IsString()
  telefonoProveedorAdquirente: string;

  @ApiProperty({
    description:
      'Correo electrónico de contacto de la empresa adquiriente (correo_proveedor_adquirente_au_au)',
    example: 'contacto@constructoralosandes.com',
  })
  @IsEmail()
  correoProveedorAdquirente: string;

  @ApiPropertyOptional({
    description: 'Número de referencia del depósito o transferencia (datos_pago_pliego_au_au)',
    example: 'REF-0001234567890',
  })
  @IsString()
  @IsOptional()
  datosPagoPliego?: string;
}
