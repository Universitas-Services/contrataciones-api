import { IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoContratacion } from '@prisma/client';

export class GenerarCronogramaCPDto {
  @ApiProperty({ enum: TipoContratacion })
  @IsEnum(TipoContratacion)
  tipoContratacion: TipoContratacion;

  @ApiProperty({
    description: 'Fecha de envío de invitaciones (Hito Cero CP)',
    example: '2026-03-02',
  })
  @IsDateString()
  fechaEnvioInvitacion: string;
}
