import { IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCuentaBancariaDto {
  @ApiProperty({ example: 'Banco de Venezuela' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del banco es obligatorio' })
  @MaxLength(100)
  bancoPago: string;

  @ApiProperty({ example: '01020000000000000000' })
  @IsString()
  @IsNotEmpty({ message: 'El número de cuenta es obligatorio' })
  @MaxLength(20)
  numeroCuenta: string;

  @ApiPropertyOptional({ example: 'Corriente' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoCuenta?: string;

  @ApiProperty({ example: 'Alcaldía del Municipio Libertador' })
  @IsString()
  @IsNotEmpty({ message: 'El titular de la cuenta es obligatorio' })
  @MaxLength(100)
  titularPago: string;

  @ApiProperty({ example: 'G-20000000-0' })
  @IsString()
  @IsNotEmpty({ message: 'El RIF del titular es obligatorio' })
  @MaxLength(100)
  rifPago: string;
}

export class UpdateCuentaBancariaDto extends PartialType(CreateCuentaBancariaDto) {}
