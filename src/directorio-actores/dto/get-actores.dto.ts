import { IsOptional, IsString, IsBoolean, IsIn, IsNumber, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetActoresDto {
  @ApiPropertyOptional({ description: 'Página actual', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad de registros por página', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de actor',
    enum: ['UNIDAD_CONTRATANTE', 'UNIDAD_USUARIA', 'MAXIMA_AUTORIDAD', 'COMISION_CONTRATACIONES'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['UNIDAD_CONTRATANTE', 'UNIDAD_USUARIA', 'MAXIMA_AUTORIDAD', 'COMISION_CONTRATACIONES'])
  tipo?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estatus (true = activo/vigente, false = inactivo)',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  estatus?: boolean;
}
