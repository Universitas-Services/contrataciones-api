import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoTicket } from '@prisma/client';

export class UpdateTicketEstadoDto {
  @IsEnum(EstadoTicket)
  @IsNotEmpty()
  estado: EstadoTicket;
}
