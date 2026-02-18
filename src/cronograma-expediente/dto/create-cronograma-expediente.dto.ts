import { IsDateString, IsOptional } from 'class-validator';

export class CreateCronogramaExpedienteDto {
  @IsOptional()
  @IsDateString()
  fechaLlamadoParticipar?: string;

  @IsOptional()
  @IsDateString()
  fechaInicioDisponibilidadPliego?: string;

  @IsOptional()
  @IsDateString()
  fechaFinDisponibilidadPliego?: string;

  @IsOptional()
  @IsDateString()
  fechaSolicitudAclaratorias?: string;

  @IsOptional()
  @IsDateString()
  fechaRespuestaAclaratorias?: string;

  @IsOptional()
  @IsDateString()
  fechaModificacionPliego?: string;

  @IsOptional()
  @IsDateString()
  fechaActoRecepcionAperturaSobres?: string;

  @IsOptional()
  @IsDateString()
  fechaLimiteEvaluacion?: string;

  @IsOptional()
  @IsDateString()
  fechaLimiteAdjudicacion?: string;

  @IsOptional()
  @IsDateString()
  fechaLimiteNotificacion?: string;

  @IsOptional()
  @IsDateString()
  fechaLimiteGarantias?: string;

  @IsOptional()
  @IsDateString()
  fechaLimiteFirmaContrato?: string;
}
