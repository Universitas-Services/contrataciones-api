import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AprobarProveedorDto {
  @ApiProperty({
    description: 'Nuevo estatus de validación del proveedor',
    enum: ['APROBADO', 'RECHAZADO'],
    example: 'APROBADO',
  })
  @IsNotEmpty()
  @IsEnum(['APROBADO', 'RECHAZADO'], {
    message: 'El estatus debe ser APROBADO o RECHAZADO',
  })
  estatusValidacion: string;
}
