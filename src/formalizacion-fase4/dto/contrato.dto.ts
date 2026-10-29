import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import type { ClausulaContrato } from '../types/fase4.types';

export class GuardarContratoDto {
  @ApiProperty({
    description:
      'Lista ordenada de cláusulas, en el mismo formato que el modelo de contrato de la Fase 1.',
    isArray: true,
    type: Object,
  })
  @IsArray()
  clauses!: ClausulaContrato[];
}
