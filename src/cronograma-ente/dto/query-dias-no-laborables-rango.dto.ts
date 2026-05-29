import { IsDateString } from 'class-validator';

export class QueryDiasNoLaborablesRangoDto {
  @IsDateString()
  desde: string; // "2026-05-01"

  @IsDateString()
  hasta: string; // "2026-07-31"
}
