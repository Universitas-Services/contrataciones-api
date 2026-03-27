import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryEnteUsuariosDto {
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
    description: 'Filtro exacto por rol de usuario',
    enum: ['ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR'],
    example: 'EJECUTOR',
  })
  @IsOptional()
  @IsEnum(['ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR'])
  rol?: string;

  @ApiPropertyOptional({
    description: 'Búsqueda de texto parcial por nombre, apellido o correo electrónico',
    example: 'juan',
  })
  @IsOptional()
  @IsString()
  busqueda?: string;
}
