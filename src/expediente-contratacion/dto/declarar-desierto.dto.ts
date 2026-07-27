import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeclaracionDesiertoDto {
  @ApiProperty({
    description: 'Causal de la declaratoria de desierto (Art. 113 LCP)',
    example: 'Ninguna oferta haya sido presentada',
  })
  @IsString()
  causalDeclaratoriaDesierto: string;

  @ApiProperty({
    description: 'Justificación detallada de las razones legales o técnicas',
  })
  @IsString()
  justificacionDeclaratoriaDesierto: string;
}
