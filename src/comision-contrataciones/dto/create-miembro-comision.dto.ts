import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TipoMiembro, AreaRepresentacion } from '@prisma/client';

export class CreateMiembroComisionDto {
  @ApiProperty({
    description: 'Nombre completo del miembro',
    example: 'Carlos Sánchez',
  })
  @IsString()
  @IsNotEmpty()
  nombreCompletoMiembro: string;

  @ApiProperty({
    description: 'Cédula del miembro',
    example: 'V-98765432',
  })
  @IsString()
  @IsNotEmpty()
  cedulaMiembro: string;

  @ApiProperty({
    description: 'Tipo de miembro',
    enum: TipoMiembro,
    example: 'Miembro principal',
  })
  @IsEnum(TipoMiembro)
  @IsNotEmpty()
  tipoMiembro: TipoMiembro;

  @ApiProperty({
    description: 'Área de representación',
    enum: AreaRepresentacion,
    example: 'Área jurídica',
  })
  @IsEnum(AreaRepresentacion)
  @IsNotEmpty()
  areaRepresentacion: AreaRepresentacion;
}
