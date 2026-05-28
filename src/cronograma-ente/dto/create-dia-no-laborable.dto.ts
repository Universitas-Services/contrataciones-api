import { IsOptional, IsDateString, Matches, IsBoolean, IsString, MaxLength } from 'class-validator';

export class CreateDiaNoLaborableDto {
  @IsOptional()
  @IsDateString()
  fecha?: string; // "2026-08-15"

  @IsOptional()
  @Matches(/^\d{2}-\d{2}$/, { message: 'fechaRecurrente debe tener el formato MM-DD' })
  fechaRecurrente?: string; // "08-15"

  @IsBoolean()
  esRecurrente: boolean;

  @IsString()
  @MaxLength(255)
  descripcion: string;
}
