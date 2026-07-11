import { IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoContratacion } from '@prisma/client';

export class GenerarCronogramaCCDto {
  @ApiProperty({ enum: TipoContratacion })
  @IsEnum(TipoContratacion)
  tipoContratacion: TipoContratacion;

  @ApiProperty({
    description: 'Fecha de envío de invitaciones (Hito Cero CC)',
    example: '2026-03-02',
  })
  @IsDateString()
  fechaEnvioInvitacion: string;
}
