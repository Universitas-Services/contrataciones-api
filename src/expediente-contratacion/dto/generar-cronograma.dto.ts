import { IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoContratacion } from '@prisma/client';

export class GenerarCronogramaDto {
  @ApiProperty({ enum: TipoContratacion, description: 'Tipo de objeto de la contratación' })
  @IsEnum(TipoContratacion)
  tipoContratacion: TipoContratacion;

  @ApiProperty({
    description: 'Fecha central del cronograma (Llamado a Participar)',
    example: '2026-03-02',
  })
  @IsDateString()
  fechaLlamadoParticipar: string;
}
