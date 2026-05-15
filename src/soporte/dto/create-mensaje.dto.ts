import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMensajeDto {
  @ApiProperty({
    description: 'Contenido del mensaje a agregar al ticket',
    example: 'He probado con otro navegador y el problema persiste. Adjunto más detalles.',
  })
  @IsString()
  @IsNotEmpty()
  contenido: string;
}
