import { IsString, IsOptional } from 'class-validator';

export class GenerarManualDto {
  @IsString()
  @IsOptional()
  tipoManual?: string = 'GENERAL';

  @IsString()
  @IsOptional()
  descripcion?: string;
}
