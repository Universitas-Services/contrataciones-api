import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { UsuarioActual } from '../../common/types/usuario-actual.type';
import { SetCaracterAdjudicacionDto } from './dto/set-caracter.dto';
import { DictamenTotalDto } from './dto/dictamen-total.dto';
import { DictamenParcialDto } from './dto/dictamen-parcial.dto';
import { esPrimeraOpcion, prelacionEfectiva } from './prelacion.util';

@Injectable()
export class GestionAdjudicacionService {
  constructor(private readonly prisma: PrismaService) {}

  private async cargarExpediente(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, deletedAt: null },
      include: {
        informeRecomendacion: true,
        dictamenesAdjudicacion: { where: { deletedAt: null } },
        documentosGenerados: {
          where: {
            deletedAt: null,
            tipoDocumento: {
              in: ['INFORME_RECOMENDACION', 'ACTA_ADJUDICACION', 'NOTIFICACION_ADJUDICADO'],
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const accesoGlobal = user.rol === 'UNIVERSITAS' || user.rol === 'SUPERVISOR';
    if (!accesoGlobal && expediente.enteId !== user.enteId) {
      throw new ForbiddenException('No tiene acceso a este expediente');
    }
    return expediente;
  }

  private async listarCalificados(expedienteId: string) {
    return this.prisma.evaluacionResultados.findMany({
      where: {
        deletedAt: null,
        oferenteCalificado: true,
        oferta: { expedienteId, deletedAt: null },
      },
      include: {
        oferta: {
          select: {
            id: true,
            nombreProveedorOferente: true,
            rifProveedorOferente: true,
            montoOfertaBs: true,
          },
        },
        dictamenAdjudicacion: true,
      },
      orderBy: { totalEvaluacion: 'desc' },
    });
  }

  async getGestion(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.cargarExpediente(expedienteId, user);
    const calificados = await this.listarCalificados(expedienteId);

    const informeDoc = expediente.documentosGenerados.find(
      (d) => d.tipoDocumento === 'INFORME_RECOMENDACION' && !d.estaDesactualizado,
    );
    const actaDoc = expediente.documentosGenerados.find(
      (d) => d.tipoDocumento === 'ACTA_ADJUDICACION' && !d.estaDesactualizado,
    );
    const notifDoc = expediente.documentosGenerados.find(
      (d) => d.tipoDocumento === 'NOTIFICACION_ADJUDICADO',
    );

    const caracter = expediente.caracterAdjudicacion as 'TOTAL' | 'PARCIAL' | null;
    const dictamenes = expediente.dictamenesAdjudicacion;

    const pendientesEval = await this.prisma.evaluacionResultados.count({
      where: {
        deletedAt: null,
        oferta: { expedienteId, deletedAt: null },
        OR: [
          { hubResultadoFinal: null },
          { hubResultadoFinal: { in: ['pendiente', 'en_evaluacion'] } },
        ],
      },
    });

    const primeras = calificados.filter((e) => esPrimeraOpcion(e.posicionPrelacion));
    const dictamenIds = new Set(dictamenes.map((d) => d.evaluacionId));

    let dictamenesCompletos = false;
    if (caracter === 'TOTAL') {
      dictamenesCompletos = primeras.length > 0 && primeras.every((e) => dictamenIds.has(e.id));
    } else if (caracter === 'PARCIAL') {
      dictamenesCompletos =
        calificados.length > 0 && calificados.every((e) => dictamenIds.has(e.id));
    }

    const informePersistido = !!expediente.informeRecomendacion;
    const informeGenerado = !!informeDoc;
    const actaGenerada = !!actaDoc;
    const notificacionesGeneradas = !!notifDoc;

    return {
      expedienteId,
      caracterAdjudicacion: caracter,
      gates: {
        puedeCambiarCaracter: dictamenes.length === 0 && !informePersistido,
        hayOferentesPendientesEvaluar: pendientesEval > 0,
        dictamenesCompletos,
        puedeGenerarInforme: pendientesEval === 0 && dictamenesCompletos,
        informePersistido,
        informeGenerado,
        puedeGenerarActa: informeGenerado && dictamenesCompletos,
        actaGenerada,
        puedeGenerarNotificaciones: actaGenerada,
        notificacionesGeneradas,
      },
      oferentes: calificados.map((e) => ({
        evaluacionId: e.id,
        ofertaId: e.oferta.id,
        nombreProveedor: e.nombreProveedorEvaluado,
        rif: e.rifProveedorEvaluado,
        montoOfertaBs: e.oferta.montoOfertaBs != null ? Number(e.oferta.montoOfertaBs) : null,
        totalEvaluacion: e.totalEvaluacion != null ? Number(e.totalEvaluacion) : null,
        posicionPrelacion: e.posicionPrelacion,
        posicionPrelacionAdjudicacion: e.posicionPrelacionAdjudicacion,
        posicionPrelacionEfectiva: prelacionEfectiva(
          e.posicionPrelacion,
          e.posicionPrelacionAdjudicacion,
        ),
        esPrimeraOpcionEvaluacion: esPrimeraOpcion(e.posicionPrelacion),
        dictamen: e.dictamenAdjudicacion ?? null,
        puedeAdjudicar:
          caracter === 'PARCIAL'
            ? true
            : caracter === 'TOTAL'
              ? esPrimeraOpcion(e.posicionPrelacion)
              : false,
      })),
      informe: expediente.informeRecomendacion,
    };
  }

  async setCaracter(expedienteId: string, dto: SetCaracterAdjudicacionDto, user: UsuarioActual) {
    const expediente = await this.cargarExpediente(expedienteId, user);

    if (expediente.dictamenesAdjudicacion.length > 0 || expediente.informeRecomendacion) {
      throw new ConflictException(
        'No se puede cambiar el carácter de adjudicación: ya existen dictámenes o informe.',
      );
    }

    await this.prisma.expedienteContratacion.update({
      where: { id: expedienteId },
      data: {
        caracterAdjudicacion: dto.caracterAdjudicacion,
        updatedBy: user.id,
      },
    });

    return this.getGestion(expedienteId, user);
  }

  async listarDictamenes(expedienteId: string, user: UsuarioActual) {
    await this.cargarExpediente(expedienteId, user);
    return this.prisma.dictamenAdjudicacion.findMany({
      where: { expedienteId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertEvaluacionCalificada(expedienteId: string, evaluacionId: string) {
    const evaluacion = await this.prisma.evaluacionResultados.findFirst({
      where: {
        id: evaluacionId,
        deletedAt: null,
        oferta: { expedienteId, deletedAt: null },
      },
    });
    if (!evaluacion) {
      throw new NotFoundException('Evaluación no encontrada en este expediente');
    }
    if (!evaluacion.oferenteCalificado) {
      throw new BadRequestException('Solo se puede dictaminar oferentes calificados.');
    }
    return evaluacion;
  }

  async upsertDictamenTotal(
    expedienteId: string,
    evaluacionId: string,
    dto: DictamenTotalDto,
    user: UsuarioActual,
  ) {
    const expediente = await this.cargarExpediente(expedienteId, user);
    if (expediente.caracterAdjudicacion !== 'TOTAL') {
      throw new BadRequestException('El carácter del expediente debe ser TOTAL.');
    }

    const evaluacion = await this.assertEvaluacionCalificada(expedienteId, evaluacionId);
    if (!esPrimeraOpcion(evaluacion.posicionPrelacion)) {
      throw new BadRequestException(
        'En adjudicación TOTAL solo se dictamina a oferentes con Primera Opción (evaluación).',
      );
    }

    const data = {
      tipoDictamen: 'TOTAL' as const,
      partidasAdjudicadasTotal: dto.partidasAdjudicadasTotalAuAu,
      montoAdjudicadoTotal: dto.montoAdjudicadoTotalAuAu,
      plazoEjecucionOfertaGanadora: dto.plazoEjecucionOfertaGanadoraAuAu,
      notificacionGenerada: dto.notificacionGenerada ?? false,
      // limpiar campos parciales
      oferenteAdjudicadoProcedimiento: true,
      causaNoAdjudicado: null,
      cantidadRenglones: null,
      alcanceAdjudicacionParcial: null,
      partidasAdjudicadasParcial: null,
      montoAdjudicadoParcial: null,
      plazoEjecucionOfertaParcial: null,
      updatedBy: user.id,
    };

    const dictamen = await this.prisma.dictamenAdjudicacion.upsert({
      where: { evaluacionId },
      create: {
        expedienteId,
        evaluacionId,
        ...data,
        createdBy: user.id,
      },
      update: data,
    });

    return dictamen;
  }

  async upsertDictamenParcial(
    expedienteId: string,
    evaluacionId: string,
    dto: DictamenParcialDto,
    user: UsuarioActual,
  ) {
    const expediente = await this.cargarExpediente(expedienteId, user);
    if (expediente.caracterAdjudicacion !== 'PARCIAL') {
      throw new BadRequestException('El carácter del expediente debe ser PARCIAL.');
    }

    await this.assertEvaluacionCalificada(expedienteId, evaluacionId);

    if (dto.oferenteAdjudicadoProcedimientoAuAu === false && !dto.causaNoAdjudicadoAuAu?.trim()) {
      throw new BadRequestException('Debe indicar la causa de no adjudicación.');
    }

    if (dto.oferenteAdjudicadoProcedimientoAuAu === true) {
      const faltantes: string[] = [];
      if (dto.cantidadRenglonesAuAu == null) faltantes.push('cantidadRenglonesAuAu');
      if (!dto.alcanceAdjudicacionParcialAuAu?.trim()) {
        faltantes.push('alcanceAdjudicacionParcialAuAu');
      }
      if (!dto.partidasAdjudicadasParcialAuAu?.trim()) {
        faltantes.push('partidasAdjudicadasParcialAuAu');
      }
      if (dto.montoAdjudicadoParcialAuAu == null) faltantes.push('montoAdjudicadoParcialAuAu');
      if (dto.plazoEjecucionOfertaParcialAuAu == null) {
        faltantes.push('plazoEjecucionOfertaParcialAuAu');
      }
      if (faltantes.length) {
        throw new BadRequestException(
          `Faltan campos para adjudicación parcial: ${faltantes.join(', ')}`,
        );
      }
    }

    const adjudicado = dto.oferenteAdjudicadoProcedimientoAuAu === true;

    const data = {
      tipoDictamen: 'PARCIAL' as const,
      oferenteAdjudicadoProcedimiento: adjudicado,
      causaNoAdjudicado: adjudicado ? null : (dto.causaNoAdjudicadoAuAu ?? null),
      cantidadRenglones: adjudicado ? (dto.cantidadRenglonesAuAu ?? null) : null,
      alcanceAdjudicacionParcial: adjudicado ? (dto.alcanceAdjudicacionParcialAuAu ?? null) : null,
      partidasAdjudicadasParcial: adjudicado ? (dto.partidasAdjudicadasParcialAuAu ?? null) : null,
      montoAdjudicadoParcial: adjudicado ? (dto.montoAdjudicadoParcialAuAu ?? null) : null,
      plazoEjecucionOfertaParcial: adjudicado
        ? (dto.plazoEjecucionOfertaParcialAuAu ?? null)
        : null,
      notificacionGenerada: dto.notificacionGenerada ?? false,
      partidasAdjudicadasTotal: null,
      montoAdjudicadoTotal: null,
      plazoEjecucionOfertaGanadora: null,
      updatedBy: user.id,
    };

    const dictamen = await this.prisma.$transaction(async (tx) => {
      const row = await tx.dictamenAdjudicacion.upsert({
        where: { evaluacionId },
        create: {
          expedienteId,
          evaluacionId,
          ...data,
          createdBy: user.id,
        },
        update: data,
      });

      await tx.evaluacionResultados.update({
        where: { id: evaluacionId },
        data: {
          posicionPrelacionAdjudicacion: adjudicado ? 'Primera Opción' : null,
          updatedBy: user.id,
        },
      });

      return row;
    });

    return dictamen;
  }
}
