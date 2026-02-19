import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProcesoCompletoDto } from './dto/create-proceso-completo.dto';

@Injectable()
export class ExpedienteContratacionService {
  constructor(private readonly prisma: PrismaService) {}

  async createFullProcess(dto: CreateProcesoCompletoDto, userId: string, enteId: string) {
    if (!enteId) {
      throw new BadRequestException(
        'El usuario no tiene un Ente asignado para realizar esta acción.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Crear Modalidad
        const modalidad = await tx.modalidadContratacion.create({
          data: {
            ...dto.modalidad,
            enteId: enteId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // 2. Crear Expediente
        const expediente = await tx.expedienteContratacion.create({
          data: {
            ...dto.expediente,
            enteId: enteId,
            modalidadId: modalidad.id,
            estatusProceso: 'BORRADOR',
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // 3. Crear Cronograma
        const cronograma = await tx.cronogramaExpediente.create({
          data: {
            ...dto.cronograma,
            expedienteId: expediente.id,
            createdBy: userId,
            updatedBy: userId,
            // Convertir strings de fechas a Date objects si es necesario,
            // pero si el DTO usa @Type(() => Date) o class-transformer se maneja solo.
            // En mi DTO usé @IsDateString(), lo cual mantiene string.
            // Prisma necesita objetos Date. Debo parsearlos.
            fechaLlamadoParticipar: dto.cronograma.fechaLlamadoParticipar
              ? new Date(dto.cronograma.fechaLlamadoParticipar)
              : null,
            fechaInicioDisponibilidadPliego: dto.cronograma.fechaInicioDisponibilidadPliego
              ? new Date(dto.cronograma.fechaInicioDisponibilidadPliego)
              : null,
            fechaFinDisponibilidadPliego: dto.cronograma.fechaFinDisponibilidadPliego
              ? new Date(dto.cronograma.fechaFinDisponibilidadPliego)
              : null,
            fechaSolicitudAclaratorias: dto.cronograma.fechaSolicitudAclaratorias
              ? new Date(dto.cronograma.fechaSolicitudAclaratorias)
              : null,
            fechaRespuestaAclaratorias: dto.cronograma.fechaRespuestaAclaratorias
              ? new Date(dto.cronograma.fechaRespuestaAclaratorias)
              : null,
            fechaModificacionPliego: dto.cronograma.fechaModificacionPliego
              ? new Date(dto.cronograma.fechaModificacionPliego)
              : null,
            fechaActoRecepcionAperturaSobres: dto.cronograma.fechaActoRecepcionAperturaSobres
              ? new Date(dto.cronograma.fechaActoRecepcionAperturaSobres)
              : null,
            fechaLimiteEvaluacion: dto.cronograma.fechaLimiteEvaluacion
              ? new Date(dto.cronograma.fechaLimiteEvaluacion)
              : null,
            fechaLimiteAdjudicacion: dto.cronograma.fechaLimiteAdjudicacion
              ? new Date(dto.cronograma.fechaLimiteAdjudicacion)
              : null,
            fechaLimiteNotificacion: dto.cronograma.fechaLimiteNotificacion
              ? new Date(dto.cronograma.fechaLimiteNotificacion)
              : null,
            fechaLimiteGarantias: dto.cronograma.fechaLimiteGarantias
              ? new Date(dto.cronograma.fechaLimiteGarantias)
              : null,
            fechaLimiteFirmaContrato: dto.cronograma.fechaLimiteFirmaContrato
              ? new Date(dto.cronograma.fechaLimiteFirmaContrato)
              : null,
          },
        });

        return {
          message: 'Proceso de contratación creado exitosamente',
          data: {
            modalidad,
            expediente,
            cronograma,
          },
        };
      });
    } catch (error: any) {
      console.error(error);

      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException('Error al crear el proceso de contratación: ' + msg);
    }
  }
}
