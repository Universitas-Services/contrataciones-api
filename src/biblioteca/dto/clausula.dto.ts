import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/**
 * Cuerpo común de las cláusulas, tanto genéricas (UNIVERSITAS) como de la
 * biblioteca del ente.
 */
export class CreateClausulaDto {
  @ApiProperty({ example: 'Objeto del contrato' })
  @IsString()
  @IsNotEmpty({ message: 'El título de la cláusula es obligatorio' })
  @MaxLength(255)
  titulo: string;

  @ApiProperty({
    example:
      '<p>El presente contrato tiene por objeto {desc_objeto_contratacion_au_au}, conforme al ' +
      'pliego de condiciones del procedimiento {cod_nomenclatura_proceso_au_au}.</p>',
    description:
      'Contenido de la cláusula. Admite HTML y marcadores {variable_au_au} que el generador ' +
      'de documentos resuelve al armar el contrato.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El cuerpo de la cláusula es obligatorio' })
  cuerpo: string;
}

export class UpdateClausulaDto extends PartialType(CreateClausulaDto) {}

export class QueryClausulaDto {
  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad de registros por página', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Buscar por título o contenido de la cláusula' })
  @IsOptional()
  @IsString()
  search?: string;
}
