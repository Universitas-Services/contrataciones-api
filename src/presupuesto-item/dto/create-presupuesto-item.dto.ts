import { IsString, IsNumber, IsNotEmpty, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePresupuestoItemDto {
  @ApiProperty({
    description: 'Descripción detallada del bien o servicio',
    example: 'Computadora Portátil Core i7 16GB RAM',
  })
  @IsNotEmpty({ message: 'La descripción del ítem es obligatoria' })
  @IsString({ message: 'La descripción del ítem debe ser un texto válido' })
  descripcionItem: string;

  @ApiProperty({
    description: 'Código de la partida presupuestaria al que pertenece',
    example: '4.02.01.01.00',
  })
  @IsNotEmpty({ message: 'El código de la partida es obligatorio' })
  @IsString({ message: 'El código de la partida debe ser un texto válido' })
  codigoPartida: string;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'UNIDAD',
    examples: ['UNIDAD', 'KGS', 'LTS', 'SERVICIO'],
  })
  @IsNotEmpty({ message: 'La unidad de medida es obligatoria' })
  @IsString({ message: 'La unidad de medida debe ser un texto válido' })
  unidadMedida: string;

  @ApiProperty({
    description: 'Cantidad exacta requerida del ítem',
    example: 15,
  })
  @IsNotEmpty({ message: 'La cantidad requerida es obligatoria' })
  @IsNumber({}, { message: 'La cantidad requerida debe ser un valor numérico' })
  @IsPositive({ message: 'La cantidad tiene que ser un número mayor a 0' })
  @Type(() => Number)
  cantidadRequerida: number;

  @ApiProperty({
    description: 'Precio unitario estimado del bien o servicio',
    example: 1500.5,
  })
  @IsNotEmpty({ message: 'El precio unitario estimado es obligatorio' })
  @IsNumber({}, { message: 'El precio unitario debe ser un valor numérico' })
  @IsPositive({ message: 'El precio unitario tiene que ser un número mayor a 0' })
  @Type(() => Number)
  precioUnitarioEstimado: number;
}
