import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerarCronogramaMEDto {
  @ApiProperty({
    description: 'Fecha de inicio del procedimiento (Hito Cero ME)',
    example: '2026-03-02',
  })
  @IsDateString()
  fechaInicioProcedimiento: string;
}
