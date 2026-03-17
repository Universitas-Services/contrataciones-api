import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryProveedoresDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => (value ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => (value ? parseInt(value, 10) : 10))
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtrar por estatus de validación',
    enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_REVISION'],
    example: 'PENDIENTE',
  })
  @IsOptional()
  @IsEnum(['PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_REVISION'])
  estatusValidacion?: string;

  @ApiPropertyOptional({
    description: 'Buscar por RIF (búsqueda parcial)',
    example: 'J-123',
  })
  @IsOptional()
  @IsString()
  rif?: string;

  @ApiPropertyOptional({
    description: 'Buscar por nombre del proveedor (búsqueda parcial)',
    example: 'constructora',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por vigencia del proveedor',
    enum: ['ACTIVO', 'VENCIDO', 'POR_VENCER', 'POR_APROBAR'],
    example: 'ACTIVO',
  })
  @IsOptional()
  @IsEnum(['ACTIVO', 'VENCIDO', 'POR_VENCER', 'POR_APROBAR'])
  estadoVigencia?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por área de especialidad',
    enum: ['BIENES', 'OBRAS', 'SERVICIOS'],
    example: 'BIENES',
  })
  @IsOptional()
  @IsEnum(['BIENES', 'OBRAS', 'SERVICIOS'])
  areaEspecialidad?: string;
}
