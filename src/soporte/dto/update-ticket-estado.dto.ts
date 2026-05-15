import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoTicket } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTicketEstadoDto {
  @ApiProperty({
    description: 'Nuevo estado del ticket',
    enum: EstadoTicket,
    example: 'EN_PROGRESO',
  })
  @IsEnum(EstadoTicket)
  @IsNotEmpty()
  estado: EstadoTicket;
}
