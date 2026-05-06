import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMensajeDto {
  @IsString()
  @IsNotEmpty()
  contenido: string;
}
