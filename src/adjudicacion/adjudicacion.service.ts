import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAdjudicacionDto } from './dto/create-adjudicacion.dto';
import { UpdateAdjudicacionDto } from './dto/update-adjudicacion.dto';
import { EstatusProceso } from '@prisma/client';

@Injectable()
export class AdjudicacionService {
  constructor(private prisma: PrismaService) {}

  async create(expedienteId: string, createAdjudicacionDto: CreateAdjudicacionDto, userId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado');
    }

    if (expediente.estatusProceso !== EstatusProceso.EN_EVALUACION) {
      throw new BadRequestException(
        'El expediente no se encuentra en la fase de evaluación (Fase 3 terminada).',
      );
    }

    // Buscar oferta ganadora (Primera Opción)
    const evaluacionGanadora = await this.prisma.evaluacionResultados.findFirst({
      where: {
        oferta: { expedienteId },
        posicionPrelacion: 'Primera Opción',
      },
      include: { oferta: true },
    });

    if (!evaluacionGanadora) {
      throw new BadRequestException(
        'No se encontró una oferta ganadora ("Primera Opción") en la evaluación.',
      );
    }

    // Ejecutar en transacción
    const resultado = await this.prisma.$transaction(async (prisma) => {
      // 1. Crear Adjudicación
      const adjudicacion = await prisma.adjudicacion.create({
        data: {
          expedienteId,
          ofertaGanadoraId: evaluacionGanadora.ofertaId,
          fechaActoAdjudicacion: new Date(),
          montoAdjudicadoBs: createAdjudicacionDto.montoAdjudicadoBs,
          partidaPresupuestariaGasto: createAdjudicacionDto.partidaPresupuestariaGasto,
          montoCrsBs: createAdjudicacionDto.montoCrsBs,
          referenciaRecomendacion: createAdjudicacionDto.referenciaRecomendacion,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // 2. Actualizar estado del expediente
      await prisma.expedienteContratacion.update({
        where: { id: expedienteId },
        data: {
          estatusProceso: EstatusProceso.ADJUDICADO,
          updatedBy: userId,
        },
      });

      return adjudicacion;
    });

    return resultado;
  }

  async findByExpediente(expedienteId: string) {
    const adjudicacion = await this.prisma.adjudicacion.findUnique({
      where: { expedienteId },
      include: { ofertaGanadora: true },
    });

    if (!adjudicacion) {
      throw new NotFoundException('No se ha registrado adjudicación para este expediente.');
    }

    return adjudicacion;
  }

  async update(expedienteId: string, updateAdjudicacionDto: UpdateAdjudicacionDto, userId: string) {
    const adjudicacion = await this.prisma.adjudicacion.findUnique({
      where: { expedienteId },
    });

    if (!adjudicacion) {
      throw new NotFoundException('No se ha registrado adjudicación para este expediente.');
    }

    const data: any = { updatedBy: userId };
    if (updateAdjudicacionDto.montoAdjudicadoBs !== undefined) {
      data.montoAdjudicadoBs = updateAdjudicacionDto.montoAdjudicadoBs;
    }
    if (updateAdjudicacionDto.partidaPresupuestariaGasto !== undefined) {
      data.partidaPresupuestariaGasto = updateAdjudicacionDto.partidaPresupuestariaGasto;
    }
    if (updateAdjudicacionDto.montoCrsBs !== undefined) {
      data.montoCrsBs = updateAdjudicacionDto.montoCrsBs;
    }
    if (updateAdjudicacionDto.referenciaRecomendacion !== undefined) {
      data.referenciaRecomendacion = updateAdjudicacionDto.referenciaRecomendacion;
    }

    const updated = await this.prisma.adjudicacion.update({
      where: { expedienteId },
      data,
    });

    return updated;
  }
}
