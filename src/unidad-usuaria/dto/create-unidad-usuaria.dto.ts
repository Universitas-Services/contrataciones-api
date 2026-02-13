import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUnidadUsuariaDto {
  @ApiProperty({
    description: 'Nombre de la Unidad Usuaria',
    example: 'Dirección de Tecnología',
  })
  @IsString()
  @IsNotEmpty()
  nombreUnidadUsuaria: string;

  @ApiProperty({
    description: 'Nombre del responsable de la unidad',
    example: 'Juan Pérez',
  })
  @IsString()
  @IsNotEmpty()
  nombreResponsableUnidadUsuaria: string;

  @ApiProperty({
    description: 'Cargo del responsable de la unidad',
    example: 'Director',
  })
  @IsString()
  @IsNotEmpty()
  cargoResponsableUnidadUsuaria: string;
}
