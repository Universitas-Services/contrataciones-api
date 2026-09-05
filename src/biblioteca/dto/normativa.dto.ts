import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

/** Cuerpo común de la normativa, tanto global como del ente. */
export class CreateNormativaDto {
  @ApiProperty({
    example:
      'Artículo 55. Podrá procederse por Concurso Abierto cuando el contrato a ser otorgado sea ' +
      'por un monto estimado superior a veinte mil unidades de cuenta dinámica para el cálculo ' +
      'aritmético del umbral máximo y mínimo (20.000 U.C.A.U.).',
    description: 'Texto completo de la norma.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El texto de la normativa es obligatorio' })
  textoNormativaCompleto: string;
}

export class UpdateNormativaDto extends PartialType(CreateNormativaDto) {}

/** La normativa global admite además activarse o desactivarse. */
export class CreateNormativaGlobalDto extends CreateNormativaDto {
  @ApiPropertyOptional({
    default: true,
    description: 'Marcar en false para retirarla sin borrarla (por ejemplo, si fue derogada).',
  })
  @IsOptional()
  @IsBoolean()
  indActivo?: boolean;
}

export class UpdateNormativaGlobalDto extends PartialType(CreateNormativaGlobalDto) {}

export class QueryNormativaDto {
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

  @ApiPropertyOptional({ description: 'Buscar dentro del texto de la normativa' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class QueryNormativaGlobalDto extends QueryNormativaDto {
  @ApiPropertyOptional({ description: 'Filtrar por normativa activa' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  indActivo?: boolean;
}
