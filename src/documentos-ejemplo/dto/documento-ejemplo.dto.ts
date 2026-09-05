import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Alta de un documento de ejemplo. Viaja como multipart junto con la imagen,
 * así que los números llegan como texto y se convierten con @Type.
 */
export class CreateDocumentoEjemploDto {
  @ApiProperty({ example: 'Modelo de acta de inicio' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del documento es obligatorio' })
  @MaxLength(255)
  nombre: string;

  @ApiPropertyOptional({
    example: 'documento-01',
    description:
      'Identificador legible con el que el frontend pedirá la imagen. Si se omite, ' +
      'se genera automáticamente el siguiente de la serie (documento-01, documento-02...).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El código sólo admite minúsculas, números y guiones (ej: documento-01)',
  })
  codigo?: string;

  @ApiPropertyOptional({ example: 'Así debe verse el acta una vez firmada por la comisión.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 1, description: 'Orden de aparición en el listado' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  orden?: number;
}

/** Actualización de los datos. Para cambiar la imagen se usa el endpoint de imagen. */
export class UpdateDocumentoEjemploDto {
  @ApiPropertyOptional({ example: 'Modelo de acta de inicio' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;

  @ApiPropertyOptional({ example: 'documento-01' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El código sólo admite minúsculas, números y guiones (ej: documento-01)',
  })
  codigo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  orden?: number;

  @ApiPropertyOptional({ description: 'Desactivar lo oculta del listado sin borrarlo' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activo?: boolean;
}

export class QueryDocumentoEjemploDto {
  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad de registros por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Buscar por nombre, código o descripción' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por documentos activos' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activo?: boolean;
}
