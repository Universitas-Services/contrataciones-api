import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Micromódulo "Llamado".
 *
 * Todos los campos son opcionales porque el mismo DTO sirve para guardar
 * borradores parciales; las reglas de obligatoriedad se aplican al completar.
 *
 * Este módulo expone únicamente `pliegoCosto` (true = el pliego tiene costo).
 * La base de datos guarda el valor inverso en `pliegoGratuito` por compatibilidad
 * con el wizard legacy, y el servicio hace la conversión.
 */
export class LlamadoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  objetivosEspecificos1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  objetivosEspecificos2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  objetivosEspecificos3?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccionRetiroPliego?: string;

  @ApiPropertyOptional({ example: 'Lunes a viernes de 08:00 a 12:00' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  horarioRetiroPliego?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'true = el pliego tiene costo (y entonces banco, cuenta, titular, RIF y monto son obligatorios al completar). false = gratuito.',
  })
  @IsOptional()
  @IsBoolean()
  pliegoCosto?: boolean;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costoPliegoBs?: number;

  @ApiPropertyOptional({ example: 'Banco de Venezuela' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bancoPagoPliego?: string;

  @ApiPropertyOptional({ example: '0102-0000-00-0000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cuentaPagoPliego?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  titularPagoPliego?: string;

  @ApiPropertyOptional({ example: 'G-20000000-0' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  rifPagoPliego?: string;

  @ApiPropertyOptional({ example: '10:00 AM' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  horaActoRecepAper?: string;
}
