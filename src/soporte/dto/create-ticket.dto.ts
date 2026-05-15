import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Asunto breve del ticket de soporte',
    example: 'Error al cargar documento de pliego',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  asunto: string;

  @ApiProperty({
    description: 'Descripción detallada del problema o consulta',
    example:
      'Al intentar subir el archivo PDF del pliego, la página se queda cargando y lanza un error 500.',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;
}
