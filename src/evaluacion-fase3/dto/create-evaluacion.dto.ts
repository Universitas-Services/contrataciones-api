import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEvaluacionDto {
  @ApiProperty({
    description: 'ID de la oferta presentada a evaluar (tb_oferta_presentada)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  ofertaId: string;
}
