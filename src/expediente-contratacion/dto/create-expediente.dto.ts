import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateExpedienteContratacionDto {
  @IsString()
  @IsNotEmpty()
  comisionId: string;

  @IsString()
  @IsNotEmpty()
  unidadUsuariaId: string;

  @IsString()
  @IsNotEmpty()
  autoridadId: string;

  @IsString()
  @IsNotEmpty()
  descripcionObjeto: string;

  @IsString()
  @IsNotEmpty()
  codigoNomenclatura: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPresupuesto?: number;
}
