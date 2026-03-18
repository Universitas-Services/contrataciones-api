import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCronogramaExpedienteDto {
  @ApiProperty() @IsDateString() fechaLlamadoParticipar: string;
  @ApiProperty() @IsDateString() fechaInicioDisponibilidadPliego: string;
  @ApiProperty() @IsDateString() fechaFinDisponibilidadPliego: string;
  @ApiProperty() @IsDateString() fechaSolicitudAclaratorias: string;
  @ApiProperty() @IsDateString() fechaRespuestaAclaratorias: string;
  @ApiProperty() @IsDateString() fechaModificacionPliego: string;
  @ApiProperty() @IsDateString() fechaActoRecepcionAperturaSobres: string;
  @ApiProperty() @IsDateString() fechaLimiteEvaluacion: string;
  @ApiProperty() @IsDateString() fechaLimiteAdjudicacion: string;
  @ApiProperty() @IsDateString() fechaLimiteNotificacion: string;
  @ApiProperty() @IsDateString() fechaLimiteGarantias: string;
  @ApiProperty() @IsDateString() fechaLimiteFirmaContrato: string;
}
