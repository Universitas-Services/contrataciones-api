import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { UpdateSobre1Dto } from './dto/update-sobre1.dto';
import { UpdateSobre2Dto } from './dto/update-sobre2.dto';
import { CreateInformeDto } from './dto/create-informe.dto';
import { ListarEvaluacionesQueryDto, EstatusEvaluacion } from './dto/listar-evaluaciones-query.dto';

@Injectable()
export class EvaluacionFase3Service {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // UTILIDAD: Invalidar documentos relacionados al expediente
  // ============================================================
  private async invalidarDocumentos(expedienteId: string) {
    await this.prisma.documentoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
    await this.prisma.pliegoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
  }

  // ============================================================
  // UTILIDAD: Calcular totalEconomica según ranking de montos
  // Se comparan TODOS los sobre2 del expediente que tengan monto
  // ============================================================
  private async calcularEconomicaPorExpediente(expedienteId: string) {
    // Obtenemos todas las evaluaciones activas del expediente con su sobre2
    const evaluaciones = await this.prisma.evaluacionResultados.findMany({
      where: {
        deletedAt: null,
        oferta: { expedienteId, deletedAt: null },
      },
      include: { sobre2: true },
      orderBy: { createdAt: 'asc' },
    });

    // Filtramos solo las que tienen monto y las ordenamos de menor a mayor
    const conMonto = evaluaciones
      .filter((e) => e.sobre2?.montoOfertaBs != null)
      .sort((a, b) => Number(a.sobre2!.montoOfertaBs) - Number(b.sobre2!.montoOfertaBs));

    // Escala: 1ra=50, 2da=40, 3ra=30, 4ta=20, 5ta=10, 6ta+=0
    const escala = [50, 40, 30, 20, 10];

    for (let i = 0; i < conMonto.length; i++) {
      const puntajeEcon = i < escala.length ? escala[i] : 0;
      await this.prisma.evaluacionResultados.update({
        where: { id: conMonto[i].id },
        data: { totalEconomica: puntajeEcon },
      });
    }
  }

  // ============================================================
  // UTILIDAD: Recalcular totales de una evaluación específica
  // ============================================================
  private async recalcularTotalesEvaluacion(evaluacionId: string) {
    const evaluacion = await this.prisma.evaluacionResultados.findUnique({
      where: { id: evaluacionId },
      include: { sobre2: true },
    });
    if (!evaluacion) return;

    // Total técnica = suma de los 4 criterios
    const s2 = evaluacion.sobre2;
    const totalTecnica = s2
      ? Number(s2.puntuacionCriterio1 ?? 0) +
        Number(s2.puntuacionCriterio2 ?? 0) +
        Number(s2.puntuacionCriterio3 ?? 0) +
        Number(s2.puntuacionCriterio4 ?? 0)
      : 0;

    // Total VAN: si porcentaje >= 1 → 10, si 0 o null → 0
    const porcentajeVan = s2?.porcentajeVan != null ? Number(s2.porcentajeVan) : 0;
    const totalVan = porcentajeVan >= 1 ? 10 : 0;

    // totalEconomica puede estar ya calculado por calcularEconomicaPorExpediente
    const totalEconomica = Number(evaluacion.totalEconomica ?? 0);

    const totalEvaluacion = totalTecnica + totalEconomica + totalVan;

    await this.prisma.evaluacionResultados.update({
      where: { id: evaluacionId },
      data: {
        totalTecnica,
        totalVan,
        totalEvaluacion,
      },
    });
  }

  // ============================================================
  // 1. INICIAR EVALUACIÓN — copia datos del oferente
  // ============================================================
  async iniciarEvaluacion(dto: CreateEvaluacionDto, userId: string, enteId: string) {
    // Verificar que la oferta existe y pertenece al ente
    const oferta = await this.prisma.ofertaPresentada.findFirst({
      where: {
        id: dto.ofertaId,
        deletedAt: null,
        expediente: { enteId },
      },
      include: { expediente: true },
    });

    if (!oferta) {
      throw new NotFoundException('Oferta presentada no encontrada o no pertenece a este ente');
    }

    // Verificar que no exista ya una evaluación para esta oferta
    const existente = await this.prisma.evaluacionResultados.findUnique({
      where: { ofertaId: dto.ofertaId },
    });

    if (existente && !existente.deletedAt) {
      throw new ConflictException('Ya existe una evaluación iniciada para esta oferta');
    }

    // Crear la evaluación copiando los datos del oferente
    const evaluacion = await this.prisma.evaluacionResultados.create({
      data: {
        ofertaId: dto.ofertaId,
        // Marcadores: nombre_proveedor_evaluado_au_au, etc.
        nombreProveedorEvaluado: oferta.nombreProveedorOferente,
        rifProveedorEvaluado: oferta.rifProveedorOferente,
        nombreRepLegalEvaluado: oferta.nombreRepLegalOferente,
        cedulaRepLegalEvaluado: oferta.cedulaRepLegalOferente,
        createdBy: userId,
      },
      include: {
        oferta: {
          select: {
            nombreProveedorOferente: true,
            rifProveedorOferente: true,
            expedienteId: true,
          },
        },
        sobre1: true,
        sobre2: true,
      },
    });

    return evaluacion;
  }

  // ============================================================
  // 2. LISTAR EVALUACIONES por expediente (Paginado y Filtrado)
  // ============================================================
  async findAllByExpediente(
    expedienteId: string,
    enteId: string,
    query: ListarEvaluacionesQueryDto,
  ) {
    const { page = 1, limit = 10, rif, estatus } = query;
    const skip = (page - 1) * limit;

    // Validar que el expediente pertenezca al ente
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, enteId, deletedAt: null },
    });
    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado');
    }

    const where: any = {
      deletedAt: null,
      oferta: { expedienteId, deletedAt: null },
    };

    // Filtro por RIF
    if (rif) {
      where.rifProveedorEvaluado = { contains: rif, mode: 'insensitive' };
    }

    // Filtro por Estatus
    if (estatus) {
      if (estatus === EstatusEvaluacion.CALIFICADO) where.oferenteCalificado = true;
      if (estatus === EstatusEvaluacion.DESCALIFICADO) where.oferenteCalificado = false;
      if (estatus === EstatusEvaluacion.PENDIENTE) where.oferenteCalificado = null;
    }

    const [total, data] = await Promise.all([
      this.prisma.evaluacionResultados.count({ where }),
      this.prisma.evaluacionResultados.findMany({
        where,
        include: {
          sobre1: true,
          sobre2: true,
          oferta: {
            select: {
              nombreProveedorOferente: true,
              rifProveedorOferente: true,
              expedienteId: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // 2.1 OBTENER ESTADÍSTICAS por expediente
  // ============================================================
  async getStatsByExpediente(expedienteId: string, enteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, enteId, deletedAt: null },
    });
    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado');
    }

    const [totalOfertas, calificadas, descalificadas] = await Promise.all([
      // Total de ofertas recibidas en el expediente
      this.prisma.ofertaPresentada.count({
        where: { expedienteId, deletedAt: null },
      }),
      // Calificadas (Pass)
      this.prisma.evaluacionResultados.count({
        where: {
          deletedAt: null,
          oferta: { expedienteId, deletedAt: null },
          oferenteCalificado: true,
        },
      }),
      // Descalificadas (Fail)
      this.prisma.evaluacionResultados.count({
        where: {
          deletedAt: null,
          oferta: { expedienteId, deletedAt: null },
          oferenteCalificado: false,
        },
      }),
    ]);

    return {
      ofertasRecibidas: totalOfertas,
      evaluadas: calificadas,
      descalificadas: descalificadas,
      porEvaluar: totalOfertas - (calificadas + descalificadas),
    };
  }

  // ============================================================
  // 3. OBTENER UNA EVALUACIÓN por ID
  // ============================================================
  async findOne(evaluacionId: string, enteId: string) {
    const evaluacion = await this.prisma.evaluacionResultados.findFirst({
      where: {
        id: evaluacionId,
        deletedAt: null,
        oferta: { expediente: { enteId } },
      },
      include: {
        sobre1: true,
        sobre2: true,
        oferta: {
          select: {
            nombreProveedorOferente: true,
            rifProveedorOferente: true,
            expedienteId: true,
          },
        },
      },
    });

    if (!evaluacion) {
      throw new NotFoundException('Evaluación no encontrada');
    }

    return evaluacion;
  }

  // ============================================================
  // 4. ACTUALIZAR SOBRE 1 (Sección A — recaudos legales)
  // ============================================================
  async updateSobre1(evaluacionId: string, dto: UpdateSobre1Dto, userId: string, enteId: string) {
    const evaluacion = await this.findOne(evaluacionId, enteId);

    const updateData: any = {
      updatedBy: userId,
    };

    // Mapear campos del DTO → modelo
    const campos = [
      'cartaManifestacionVoluntad',
      'obsCartaManifestacionVoluntad',
      'cartaAutorizacion',
      'obsCartaAutorizacion',
      'copiaRifVigente',
      'obsCopiaRifVigente',
      'certificadoRnc',
      'obsCertificadoRnc',
      'solvenciaLaboral',
      'obsSolvenciaLaboral',
      'declaracionSociosNoInhabilitados',
      'obsDeclaracionSociosNoInhabilitados',
      'declaracionNoDeudas',
      'obsDeclaracionNoDeudas',
      'declaracionNoImpedimentosLcp',
      'obsDeclaracionNoImpedimentosLcp',
      'declaracionInfoFinanciera',
      'obsDeclaracionInfoFinanciera',
      'relacionServiciosPrestados',
      'obsRelacionServiciosPrestados',
      'referenciasComerciales',
      'obsReferenciasComerciales',
    ] as const;

    for (const campo of campos) {
      if ((dto as any)[campo] !== undefined) {
        updateData[campo] = (dto as any)[campo];
      }
    }

    let sobre1;
    if (evaluacion.sobre1) {
      sobre1 = await this.prisma.sobre1.update({
        where: { evaluacionId },
        data: updateData,
      });
    } else {
      sobre1 = await this.prisma.sobre1.create({
        data: { evaluacionId, ...updateData, createdBy: userId },
      });
    }

    // Marcar documentos como desactualizados
    await this.invalidarDocumentos(evaluacion.oferta.expedienteId);

    return sobre1;
  }

  // ============================================================
  // 5. ACTUALIZAR SOBRE 2 (Sección B + criterios + económica)
  // ============================================================
  async updateSobre2(evaluacionId: string, dto: UpdateSobre2Dto, userId: string, enteId: string) {
    const evaluacion = await this.findOne(evaluacionId, enteId);

    const updateDataSobre2: Record<string, any> = { updatedBy: userId };
    const updateDataEval: Record<string, any> = { updatedBy: userId };

    // Campos del Sobre2
    const camposSobre2 = [
      'ofertaTecnicoEconomica',
      'obsOfertaTecnicoEconomica',
      'cartaOferta',
      'obsCartaOferta',
      'declaracionCapacidadFinanciera',
      'obsDeclaracionCapacidadFinanciera',
      'declaracionCompromisoRespSocial',
      'obsDeclaracionCompromisoRespSocial',
      'garantiaMantenimientoOferta',
      'obsGarantiaMantenimientoOferta',
      'declaracionAutocalculoVan',
      'obsDeclaracionAutocalculoVan',
      'criterio1Evaluacion',
      'puntuacionCriterio1',
      'criterio2Evaluacion',
      'puntuacionCriterio2',
      'criterio3Evaluacion',
      'puntuacionCriterio3',
      'criterio4Evaluacion',
      'puntuacionCriterio4',
      'montoOfertaBs',
      'porcentajeVan',
    ] as const;

    for (const campo of camposSobre2) {
      if ((dto as any)[campo] !== undefined) {
        updateDataSobre2[campo] = (dto as any)[campo];
      }
    }

    // Campos que van a EvaluacionResultados
    if (dto.oferenteCalificado !== undefined)
      updateDataEval.oferenteCalificado = dto.oferenteCalificado;
    if (dto.motivoDescalificacion !== undefined)
      updateDataEval.motivoDescalificacion = dto.motivoDescalificacion;
    if (dto.posicionPrelacion !== undefined)
      updateDataEval.posicionPrelacion = dto.posicionPrelacion;

    // Upsert Sobre2
    if (evaluacion.sobre2) {
      await this.prisma.sobre2.update({
        where: { evaluacionId },
        data: updateDataSobre2,
      });
    } else {
      await this.prisma.sobre2.create({
        data: { evaluacionId, ...updateDataSobre2, createdBy: userId },
      });
    }

    // Actualizar campos de calificación/prelación en EvaluacionResultados
    if (Object.keys(updateDataEval).length > 1) {
      await this.prisma.evaluacionResultados.update({
        where: { id: evaluacionId },
        data: updateDataEval,
      });
    }

    // Recalcular la economica para todos los oferentes del expediente (ranking por monto)
    await this.calcularEconomicaPorExpediente(evaluacion.oferta.expedienteId);

    // Recalcular totales de esta evaluación
    await this.recalcularTotalesEvaluacion(evaluacionId);

    // Marcar documentos como desactualizados
    await this.invalidarDocumentos(evaluacion.oferta.expedienteId);

    // Retornar la evaluación actualizada completa
    return this.findOne(evaluacionId, enteId);
  }

  // ============================================================
  // 6. CALCULAR TOTALES (fuerza recálculo manual desde el front)
  // ============================================================
  async calcularTotales(evaluacionId: string, enteId: string) {
    const evaluacion = await this.findOne(evaluacionId, enteId);

    await this.calcularEconomicaPorExpediente(evaluacion.oferta.expedienteId);
    await this.recalcularTotalesEvaluacion(evaluacionId);

    return this.findOne(evaluacionId, enteId);
  }

  // ============================================================
  // 7. ELIMINAR EVALUACIÓN (soft delete)
  // ============================================================
  async remove(evaluacionId: string, userId: string, enteId: string) {
    const evaluacion = await this.findOne(evaluacionId, enteId);

    await this.prisma.evaluacionResultados.update({
      where: { id: evaluacion.id },
      data: { deletedAt: new Date(), updatedBy: userId },
    });

    await this.invalidarDocumentos(evaluacion.oferta.expedienteId);

    return { message: 'Evaluación eliminada exitosamente' };
  }

  // ============================================================
  // 8. INFORME DE RECOMENDACIÓN — crear/actualizar
  // ============================================================
  async upsertInforme(expedienteId: string, dto: CreateInformeDto, userId: string, enteId: string) {
    // Verificar que el expediente pertenezca al ente
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, enteId, deletedAt: null },
    });
    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado');
    }

    const existente = await this.prisma.informeRecomendacion.findUnique({
      where: { expedienteId },
    });

    const data: any = {
      updatedBy: userId,
    };

    const campos = [
      'actualizacionPresupuesto',
      'montoNuevoPresupuesto',
      'justificacionActualizacionPresup',
      'indVerificadoGarantia',
      'indVerificadoCrs',
      'observacionFormalidades',
      'omisionFormalidades',
      'subsanacionActo',
      'datosActoSubsanacion',
      'plazoEjecucionOfertaGanadora',
    ] as const;

    for (const campo of campos) {
      if ((dto as any)[campo] !== undefined) {
        data[campo] = (dto as any)[campo];
      }
    }

    let informe;
    if (existente) {
      informe = await this.prisma.informeRecomendacion.update({
        where: { expedienteId },
        data,
      });
    } else {
      informe = await this.prisma.informeRecomendacion.create({
        data: { expedienteId, ...data, createdBy: userId },
      });
    }

    await this.invalidarDocumentos(expedienteId);

    return informe;
  }

  // ============================================================
  // 9. OBTENER INFORME DE RECOMENDACIÓN
  // ============================================================
  async getInforme(expedienteId: string, enteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, enteId, deletedAt: null },
    });
    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado');
    }

    const informe = await this.prisma.informeRecomendacion.findUnique({
      where: { expedienteId },
    });

    if (!informe) {
      throw new NotFoundException('Informe de Recomendación no encontrado para este expediente');
    }

    return informe;
  }
}
