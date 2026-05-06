import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  asunto: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;
}
