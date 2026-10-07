import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Textos exactos del desplegable Art. 113 LCP (preferidos). */
export const CAUSALES_DECLARATORIA_DESIERTO = [
  '1. Ninguna oferta haya sido presentada.',
  '2. Todas las ofertas resulten rechazadas o los oferentes descalificados, de conformidad con lo establecido en el pliego de condiciones.',
  '3. Esté suficientemente justificado que de continuar el procedimiento podría causarse perjuicio al contratante.',
] as const;

export class DeclaracionDesiertoDto {
  @ApiProperty({
    description:
      'Causal Art. 113 LCP. Preferir una de las 3 opciones del desplegable (con prefijo 1./2./3.).',
    example: CAUSALES_DECLARATORIA_DESIERTO[0],
    enum: CAUSALES_DECLARATORIA_DESIERTO,
  })
  @IsString()
  causalDeclaratoriaDesierto: string;

  @ApiProperty({
    description: 'Justificación detallada de las razones legales o técnicas',
  })
  @IsString()
  justificacionDeclaratoriaDesierto: string;
}
