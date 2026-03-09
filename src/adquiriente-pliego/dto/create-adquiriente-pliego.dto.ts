import { IsString, IsOptional, IsUUID, IsDateString, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdquirentePliegoDto {
  @ApiProperty({ description: 'ID del expediente de contratación', example: 'uuid-expediente' })
  @IsUUID()
  expedienteId: string;

  @ApiProperty({ description: 'ID del proveedor', example: 'uuid-proveedor' })
  @IsUUID()
  proveedorId: string;

  @ApiProperty({ description: 'Fecha de adquisición del pliego', example: '2026-03-09' })
  @IsDateString()
  fechaAdquisicion: string;

  @ApiProperty({ description: 'Nombre de la persona que retira el pliego', example: 'Juan Pérez' })
  @IsString()
  nombreContactoRetiro: string;

  @ApiPropertyOptional({ description: 'Datos de pago del pliego' })
  @IsString()
  @IsOptional()
  datosPagoPliego?: string;

  @ApiPropertyOptional({ description: 'Nombre del proveedor adquiriente' })
  @IsString()
  @IsOptional()
  nombreProveedorAdquiriente?: string;

  @ApiPropertyOptional({ description: 'Dirección fiscal del proveedor adquiriente' })
  @IsString()
  @IsOptional()
  direccionFiscalProveedorAdquiriente?: string;

  @ApiPropertyOptional({ description: 'Teléfono del proveedor adquiriente' })
  @IsString()
  @IsOptional()
  telefonoProveedorAdquiriente?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico del proveedor adquiriente' })
  @IsEmail()
  @IsOptional()
  correoProveedorAdquiriente?: string;
}
