import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Causa de no adjudicación de un calificado que no es Primera Opción (carácter TOTAL). */
export class DictamenNoAdjudicadoDto {
  @ApiProperty({
    description:
      'Motivación individual que se imprime en la Notificación a no adjudicados. causa_no_adjudicado_au_au',
  })
  @IsString()
  @IsNotEmpty()
  causaNoAdjudicadoAuAu: string;
}
