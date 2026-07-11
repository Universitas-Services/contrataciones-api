import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerarCronogramaCDDto {
  @ApiProperty({
    description: 'Fecha de envío de invitación/solicitud de oferta (Hito Cero CD)',
    example: '2026-03-02',
  })
  @IsDateString()
  fechaEnvioInvitacion: string;
}
