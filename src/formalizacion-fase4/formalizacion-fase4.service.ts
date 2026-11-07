import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { alcanceDe } from './alcance-oferente.util';
import { GuardarContratoDto } from './dto/contrato.dto';
import { compararPrelacion } from './prelacion-fase4.util';
import { type CondicionesBloques, expandirBloques } from './bloques-contrato';
import { fechaLarga, resolverTokens, unirPartidas } from './tokens-contrato.resolver';
import { DocumentosFase4Service } from './documentos-fase4.service';
import { renderizarPildoras } from './pildoras.util';
import type {
  CaracterAdjudicacion,
  ClausulaContrato,
  EstatusOferenteFase4,
  OferenteFase4,
} from './types/fase4.types';

/** Las partidas de un dictamen, sea cual sea su carácter. */
function partidasDe(
  dictamen?: {
    partidasAdjudicadasTotal: string | null;
    partidasAdjudicadasParcial: string | null;
  } | null,
): string | null {
  return dictamen?.partidasAdjudicadasTotal ?? dictamen?.partidasAdjudicadasParcial ?? null;
}

/** Número decimal o null, sin arrastrar el `Decimal` de Prisma a la respuesta. */
function num(valor: unknown): number | null {
  return valor == null ? null : Number(valor);
}

@Injectable()
export class FormalizacionFase4Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentos: DocumentosFase4Service,
  ) {}

  // ════════════════════════════════════════════════════════════════════
  //  Carga y control de acceso
  // ════════════════════════════════════════════════════════════════════

  async cargarExpediente(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, deletedAt: null },
      select: {
        id: true,
        enteId: true,
        caracterAdjudicacion: true,
        estatusProceso: true,
        selladoFase4At: true,
        descripcionObjeto: true,
        codigoNomenclatura: true,
      },
    });
    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const accesoGlobal = user.rol === 'UNIVERSITAS' || user.rol === 'SUPERVISOR';
    if (!accesoGlobal && expediente.enteId !== user.enteId) {
      throw new ForbiddenException('No tiene acceso a este expediente');
    }
    return expediente;
  }

  /** Tras el cierre por desierto el expediente no admite más escrituras. */
  assertNoSellado(expediente: { selladoFase4At: Date | null }) {
    if (expediente.selladoFase4At) {
      throw new ConflictException(
        'Expediente sellado: la Fase 4 se cerró por declaratoria de desierto.',
      );
    }
  }

  private listarCalificados(expedienteId: string) {
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
            nombreRepLegalOferente: true,
            cedulaRepLegalOferente: true,
            datosRegistroMercantilProveedorOferente: true,
            montoOfertaBs: true,
          },
        },
        dictamenAdjudicacion: true,
        contratoFase4: { include: { documento: true } },
      },
    });
  }

  private listarCiclos(expedienteId: string) {
    return this.prisma.decaimientoFase4.findMany({
      where: { expedienteId, deletedAt: null },
      include: {
        infractor: {
          select: { id: true, nombreProveedorEvaluado: true, rifProveedorEvaluado: true },
        },
        subsiguiente: {
          select: {
            id: true,
            nombreProveedorEvaluado: true,
            rifProveedorEvaluado: true,
            posicionPrelacion: true,
          },
        },
        documentos: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { numeroCiclo: 'asc' },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  //  Estado completo (§4.1 del brief)
  // ════════════════════════════════════════════════════════════════════

  async getEstado(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.cargarExpediente(expedienteId, user);
    const [calificados, ciclos] = await Promise.all([
      this.listarCalificados(expedienteId),
      this.listarCiclos(expedienteId),
    ]);

    const caracter = expediente.caracterAdjudicacion as CaracterAdjudicacion | null;
    const cicloActivo = ciclos.find((c) => c.estado === 'EN_CURSO') ?? null;
    const ciclosCerrados = ciclos.filter((c) => c.estado === 'CERRADO');

    const decaidos = new Set(ciclosCerrados.map((c) => c.infractorEvaluacionId));
    const sellado = !!expediente.selladoFase4At;

    const oferentes: OferenteFase4[] = calificados
      .map((e) => {
        const estatus = this.estatusDe(
          e.id,
          e.dictamenAdjudicacion,
          caracter,
          cicloActivo,
          ciclosCerrados,
          decaidos,
        );
        return {
          evaluacionId: e.id,
          nombre: e.nombreProveedorEvaluado,
          rif: e.rifProveedorEvaluado,
          representanteLegal: e.nombreRepLegalEvaluado ?? null,
          posicionPrelacion: e.posicionPrelacion,
          puntuacionFinal: num(e.totalEvaluacion),
          montoOfertaBs: num(e.oferta.montoOfertaBs),
          estatus,
          montoContratoBs: this.montoContrato(
            e.id,
            e.dictamenAdjudicacion,
            caracter,
            ciclosCerrados,
          ),
          alcance: alcanceDe(e.id, e.dictamenAdjudicacion, ciclosCerrados),
          contrato: e.contratoFase4
            ? {
                estado: e.contratoFase4.estado,
                generadoAt: e.contratoFase4.generadoAt,
                documentoId: e.contratoFase4.documentoId,
                estaDesactualizado: e.contratoFase4.documento?.estaDesactualizado ?? false,
              }
            : null,
        };
      })
      .sort(compararPrelacion);

    const faseHabilitada = !!caracter && calificados.some((e) => e.dictamenAdjudicacion);
    const hayAdjudicados = oferentes.some((o) => o.estatus === 'ADJUDICADO');

    return {
      expedienteId,
      caracterAdjudicacion: caracter,
      sellado,
      gates: {
        faseHabilitada,
        decaimientoHabilitado: faseHabilitada && !sellado,
        contratosBloqueados: !!cicloActivo && caracter === 'TOTAL',
        puedeDeclararDecaimiento: faseHabilitada && !sellado && !cicloActivo && hayAdjudicados,
      },
      oferentes,
      cicloActivo: cicloActivo ? this.formatearCiclo(cicloActivo, oferentes, caracter) : null,
      ciclosCerrados: ciclosCerrados.map((c) => this.formatearCiclo(c, oferentes, caracter)),
      candidatosSubsiguientes: this.candidatos(
        oferentes,
        caracter,
        cicloActivo?.infractorEvaluacionId,
      ),
      participantesCierre: await this.participantesCierre(expedienteId),
    };
  }

  /** §5.1 — el orden importa: decaído y en decaimiento mandan sobre adjudicado. */
  private estatusDe(
    evaluacionId: string,
    dictamen: { tipoDictamen: string; oferenteAdjudicadoProcedimiento: boolean | null } | null,
    caracter: CaracterAdjudicacion | null,
    cicloActivo: { infractorEvaluacionId: string } | null,
    ciclosCerrados: { subsiguienteEvaluacionId: string | null; decision: string | null }[],
    decaidos: Set<string>,
  ): EstatusOferenteFase4 {
    if (decaidos.has(evaluacionId)) return 'DECAIDO';
    if (cicloActivo?.infractorEvaluacionId === evaluacionId) return 'EN_DECAIMIENTO';

    const asumioReadjudicacion = ciclosCerrados.some(
      (c) => c.decision === 'SUBSIGUIENTE' && c.subsiguienteEvaluacionId === evaluacionId,
    );
    if (asumioReadjudicacion) return 'ADJUDICADO';

    if (dictamen) {
      if (caracter === 'TOTAL' && dictamen.oferenteAdjudicadoProcedimiento !== false) {
        return 'ADJUDICADO';
      }
      if (caracter === 'PARCIAL' && dictamen.oferenteAdjudicadoProcedimiento === true) {
        return 'ADJUDICADO';
      }
    }
    return 'RESERVA';
  }

  /** §5.4 — base del dictamen más lo que haya asumido en readjudicaciones. */
  private montoContrato(
    evaluacionId: string,
    dictamen: {
      montoAdjudicadoTotal: unknown;
      montoAdjudicadoParcial: unknown;
    } | null,
    caracter: CaracterAdjudicacion | null,
    ciclosCerrados: {
      decision: string | null;
      subsiguienteEvaluacionId: string | null;
      montoReadjudicadoParcialBs: unknown;
      montoReadjudicadoBs: unknown;
    }[],
  ): number | null {
    const base =
      caracter === 'PARCIAL'
        ? num(dictamen?.montoAdjudicadoParcial)
        : num(dictamen?.montoAdjudicadoTotal);

    const readjudicado = ciclosCerrados
      .filter((c) => c.decision === 'SUBSIGUIENTE' && c.subsiguienteEvaluacionId === evaluacionId)
      .reduce((total, c) => {
        const monto =
          caracter === 'PARCIAL' ? num(c.montoReadjudicadoParcialBs) : num(c.montoReadjudicadoBs);
        return total + (monto ?? 0);
      }, 0);

    if (base == null && readjudicado === 0) return null;
    return (base ?? 0) + readjudicado;
  }

  /**
   * §5.3 — en TOTAL el subsiguiente es uno solo y lo elige el backend; en
   * PARCIAL se ofrecen todos y el usuario escoge.
   */
  candidatos(
    oferentes: OferenteFase4[],
    caracter: CaracterAdjudicacion | null,
    infractorId?: string,
  ) {
    const elegibles = oferentes.filter(
      (o) =>
        o.evaluacionId !== infractorId && o.estatus !== 'DECAIDO' && o.estatus !== 'EN_DECAIMIENTO',
    );

    const lista =
      caracter === 'TOTAL'
        ? elegibles.filter((o) => o.estatus === 'RESERVA').slice(0, 1)
        : [...elegibles].sort((a, b) => (b.puntuacionFinal ?? 0) - (a.puntuacionFinal ?? 0));

    return lista.map((o) => ({
      evaluacionId: o.evaluacionId,
      nombre: o.nombre,
      rif: o.rif,
      posicionPrelacion: o.posicionPrelacion,
      montoOfertaBs: o.montoOfertaBs,
    }));
  }

  /** Todos los que entregaron sobres, también los descalificados. */
  private async participantesCierre(expedienteId: string) {
    const evaluaciones = await this.prisma.evaluacionResultados.findMany({
      where: { deletedAt: null, oferta: { expedienteId, deletedAt: null } },
      select: {
        id: true,
        nombreProveedorEvaluado: true,
        rifProveedorEvaluado: true,
        documentosGenerados: {
          where: {
            tipoDocumento: 'NOTIFICACION_FIN_PROCEDIMIENTO',
            deletedAt: null,
            estaDesactualizado: false,
          },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return evaluaciones.map((e) => ({
      evaluacionId: e.id,
      nombre: e.nombreProveedorEvaluado,
      rif: e.rifProveedorEvaluado,
      notificacionEmitidaAt: e.documentosGenerados[0]?.createdAt ?? null,
      documentoId: e.documentosGenerados[0]?.id ?? null,
    }));
  }

  /** §4.4 — forma del ciclo, igual para el activo y para el historial. */
  private formatearCiclo(
    ciclo: Awaited<ReturnType<FormalizacionFase4Service['listarCiclos']>>[number],
    oferentes: OferenteFase4[],
    caracter: CaracterAdjudicacion | null,
  ) {
    // Un documento desactualizado por rehacer un paso ya no representa al
    // ciclo: devolverlo haría que el frontend ofreciera descargar algo vencido.
    const docDe = (tipo: string) =>
      ciclo.documentos.find((d) => d.tipoDocumento === tipo && !d.estaDesactualizado)?.id ?? null;

    const infractorEnLista = oferentes.find((o) => o.evaluacionId === ciclo.infractorEvaluacionId);

    return {
      id: ciclo.id,
      numeroCiclo: ciclo.numeroCiclo,
      estado: ciclo.estado,
      infractor: {
        evaluacionId: ciclo.infractorEvaluacionId,
        nombre: ciclo.infractor.nombreProveedorEvaluado,
        rif: ciclo.infractor.rifProveedorEvaluado,
        alcance: infractorEnLista?.alcance ?? null,
      },
      decision: ciclo.decision,
      existeOpcionSubsiguiente:
        this.candidatos(oferentes, caracter, ciclo.infractorEvaluacionId).length > 0,
      subsiguiente: ciclo.subsiguiente
        ? {
            evaluacionId: ciclo.subsiguiente.id,
            nombre: ciclo.subsiguiente.nombreProveedorEvaluado,
            rif: ciclo.subsiguiente.rifProveedorEvaluado,
            posicionPrelacion: ciclo.subsiguiente.posicionPrelacion,
            montoBs: num(ciclo.montoReadjudicadoBs) ?? num(ciclo.montoReadjudicadoParcialBs),
          }
        : null,
      certificado: ciclo.certificadoGeneradoAt
        ? {
            fechaNotificacionAdjudicacionIncumplidor:
              ciclo.fechaNotificacionAdjudicacionIncumplidor,
            fechaCertificacionIncumplimiento: ciclo.fechaCertificacionIncumplimiento,
            fechaVencimientoGarantias: ciclo.fechaVencimientoGarantias,
            fechaVencimientoFirmaContrato: ciclo.fechaVencimientoFirmaContrato,
            causalDecaimiento: ciclo.causalDecaimiento,
            alcanceReadjudicacionParcial: ciclo.alcanceReadjudicacionParcial,
            montoReadjudicadoParcialBs: num(ciclo.montoReadjudicadoParcialBs),
            montoReadjudicadoBs: num(ciclo.montoReadjudicadoBs),
            plazoEjecucionSubsiguiente: ciclo.plazoEjecucionSubsiguiente,
            modalidadDegradadaSugerida: ciclo.modalidadDegradadaSugerida,
            renglonesAfectadosDecaimiento: ciclo.renglonesAfectadosDecaimiento,
            documentoId: docDe('CERTIFICADO_INCUMPLIMIENTO'),
          }
        : null,
      resolucion: ciclo.resolucionGeneradaAt
        ? {
            numResolucionDecaimiento: ciclo.numResolucionDecaimiento,
            fechaResolucionDecaimiento: ciclo.fechaResolucionDecaimiento,
            documentoId: docDe('RESOLUCION_DECAIMIENTO'),
          }
        : null,
      notificacionInfractor: {
        emitidaAt: ciclo.fecNotificacionDecaimiento,
        numOficioNotificacionDecaimiento: ciclo.numOficioNotificacionDecaimiento,
        fechaOficioNotificacionDecaimiento: ciclo.fechaOficioNotificacionDecaimiento,
        documentoId: docDe('NOTIFICACION_DECAIMIENTO'),
      },
      notificacionSubsiguiente: {
        emitidaAt: ciclo.fecNotificacionReadjudicacion,
        documentoId: docDe('NOTIFICACION_ADJUDICACION_SUBSIGUIENTE'),
      },
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  Contratos (§4.2)
  // ════════════════════════════════════════════════════════════════════

  /**
   * Precarga: si el contrato no existe todavía, se clona el modelo de la
   * Fase 1 y se resuelven las variables. Si ya existe, se devuelve tal cual
   * quedó, con los valores al día.
   */
  async getContrato(expedienteId: string, evaluacionId: string, user: UsuarioActual) {
    await this.cargarExpediente(expedienteId, user);
    const { evaluacion, estado } = await this.contextoContrato(expedienteId, evaluacionId, user);

    const existente = await this.prisma.contratoFase4.findFirst({
      where: { evaluacionId, deletedAt: null },
    });

    const clauses: ClausulaContrato[] = existente
      ? (existente.clauses as unknown as ClausulaContrato[])
      : await this.clonarModeloFase1(expedienteId);

    const tokens = await this.tokensDe(expedienteId, evaluacionId, estado);
    const bloques = await this.condicionesBloques(expedienteId);

    return {
      evaluacionId,
      estado: existente?.estado ?? 'BORRADOR',
      montoContratoBs: existente
        ? num(existente.montoContratoBs)
        : (estado?.montoContratoBs ?? null),
      generadoAt: existente?.generadoAt ?? null,
      documentoId: existente?.documentoId ?? null,
      nombreContratista: evaluacion.nombreProveedorEvaluado,
      tokens,
      clauses: clauses.map((c) => ({
        ...c,
        cuerpoHtml: c.cuerpoHtml
          ? renderizarPildoras(expandirBloques(c.cuerpoHtml, bloques), tokens, 'RESOLVER')
          : c.cuerpoHtml,
      })),
    };
  }

  async guardarBorrador(
    expedienteId: string,
    evaluacionId: string,
    dto: GuardarContratoDto,
    user: UsuarioActual,
  ) {
    const expediente = await this.cargarExpediente(expedienteId, user);
    this.assertNoSellado(expediente);
    await this.assertContratoEditable(expedienteId, evaluacionId, user);

    const { estado } = await this.contextoContrato(expedienteId, evaluacionId, user);

    // Editar un contrato ya generado no lo devuelve a borrador: conserva
    // `GENERADO` y su `generadoAt`, que es lo que el frontend mira, pero el
    // .docx emitido deja de corresponder al texto y se marca desactualizado.
    const existente = await this.prisma.contratoFase4.findFirst({
      where: { evaluacionId, deletedAt: null },
      select: { estado: true, documentoId: true },
    });
    const yaGenerado = existente?.estado === 'GENERADO';

    const datos = {
      clauses: dto.clauses as unknown as object,
      estado: yaGenerado ? ('GENERADO' as const) : ('BORRADOR' as const),
      montoContratoBs: estado?.montoContratoBs ?? null,
      updatedBy: user.id,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.contratoFase4.upsert({
        where: { evaluacionId },
        create: { expedienteId, evaluacionId, ...datos, createdBy: user.id },
        update: datos,
      });

      if (yaGenerado && existente?.documentoId) {
        await tx.documentoGenerado.update({
          where: { id: existente.documentoId },
          data: { estaDesactualizado: true },
        });
      }
    });

    return this.getContrato(expedienteId, evaluacionId, user);
  }

  /**
   * Genera el definitivo. El `.docx` lo arma el generador de documentos; aquí
   * se congela el contenido y se marca el estado.
   */
  async generarContrato(
    expedienteId: string,
    evaluacionId: string,
    dto: GuardarContratoDto,
    user: UsuarioActual,
  ) {
    const expediente = await this.cargarExpediente(expedienteId, user);
    this.assertNoSellado(expediente);
    await this.assertContratoEditable(expedienteId, evaluacionId, user);

    const { estado } = await this.contextoContrato(expedienteId, evaluacionId, user);
    if (estado?.estatus !== 'ADJUDICADO') {
      throw new BadRequestException(
        'Solo se genera contrato para un oferente con adjudicación vigente.',
      );
    }

    const datos = {
      clauses: dto.clauses as unknown as object,
      estado: 'GENERADO' as const,
      montoContratoBs: estado.montoContratoBs,
      generadoAt: new Date(),
      updatedBy: user.id,
    };

    const contrato = await this.prisma.contratoFase4.upsert({
      where: { evaluacionId },
      create: { expedienteId, evaluacionId, ...datos, createdBy: user.id },
      update: datos,
    });

    await this.documentos.emitirContrato({
      contratoId: contrato.id,
      expedienteId,
      evaluacionId,
      documentoAnteriorId: contrato.documentoId,
      clauses: dto.clauses,
      tokens: await this.tokensDe(expedienteId, evaluacionId, estado),
      bloques: await this.condicionesBloques(expedienteId),
      fechaFirma: await this.fechaFirma(expedienteId, evaluacionId, datos.generadoAt),
      userId: user.id,
    });

    return this.getContrato(expedienteId, evaluacionId, user);
  }

  /**
   * Reintenta lo que quedó sin archivo: documentos del ciclo y contratos
   * generados. No exige que el expediente esté sin sellar, porque las
   * notificaciones de cierre existen justamente en uno sellado.
   */
  async regenerarPendientes(expedienteId: string, user: UsuarioActual) {
    await this.cargarExpediente(expedienteId, user);
    const ciclo = await this.documentos.completarPendientes(expedienteId);

    const contratos = await this.prisma.contratoFase4.findMany({
      where: { expedienteId, estado: 'GENERADO', documentoId: null, deletedAt: null },
    });
    const { oferentes } = await this.getEstado(expedienteId, user);

    let contratosGenerados = 0;
    let contratosPendientes = 0;

    for (const contrato of contratos) {
      const estado = oferentes.find((o) => o.evaluacionId === contrato.evaluacionId) ?? null;
      if (estado?.estatus !== 'ADJUDICADO') continue;

      const documentoId = await this.documentos.emitirContrato({
        contratoId: contrato.id,
        expedienteId,
        evaluacionId: contrato.evaluacionId,
        documentoAnteriorId: null,
        clauses: contrato.clauses as unknown as ClausulaContrato[],
        tokens: await this.tokensDe(expedienteId, contrato.evaluacionId, estado),
        bloques: await this.condicionesBloques(expedienteId),
        fechaFirma: await this.fechaFirma(
          expedienteId,
          contrato.evaluacionId,
          contrato.generadoAt ?? new Date(),
        ),
        userId: user.id,
      });

      if (documentoId) contratosGenerados += 1;
      else contratosPendientes += 1;
    }

    return { ...ciclo, contratosGenerados, contratosPendientes };
  }

  /** TOTAL con ciclo abierto bloquea todo; PARCIAL solo al infractor. */
  private async assertContratoEditable(
    expedienteId: string,
    evaluacionId: string,
    user: UsuarioActual,
  ) {
    const estado = await this.getEstado(expedienteId, user);
    if (estado.gates.contratosBloqueados) {
      throw new ConflictException(
        'Hay un decaimiento en curso sobre una adjudicación TOTAL: los contratos están bloqueados.',
      );
    }
    const oferente = estado.oferentes.find((o) => o.evaluacionId === evaluacionId);
    if (oferente?.estatus === 'EN_DECAIMIENTO' || oferente?.estatus === 'DECAIDO') {
      throw new ConflictException(
        'El contrato de un oferente en decaimiento o decaído no se puede modificar.',
      );
    }
  }

  private async contextoContrato(expedienteId: string, evaluacionId: string, user: UsuarioActual) {
    const evaluacion = await this.prisma.evaluacionResultados.findFirst({
      where: { id: evaluacionId, deletedAt: null, oferta: { expedienteId, deletedAt: null } },
      select: { id: true, nombreProveedorEvaluado: true },
    });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada en este expediente');

    const estadoGeneral = await this.getEstado(expedienteId, user);
    const estado = estadoGeneral.oferentes.find((o) => o.evaluacionId === evaluacionId) ?? null;
    return { evaluacion, estado };
  }

  /** Las cláusulas de arranque salen del modelo de contrato de la Fase 1. */
  private async clonarModeloFase1(expedienteId: string): Promise<ClausulaContrato[]> {
    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
      select: { modeloContratoData: true },
    });

    const modelo = fase?.modeloContratoData as { clauses?: ClausulaContrato[] } | null;
    return modelo?.clauses ?? [];
  }

  /** Lo marcado en Fase 1 que decide qué bloques de garantías lleva el contrato. */
  private async condicionesBloques(expedienteId: string): Promise<CondicionesBloques> {
    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
      select: {
        retencionFielCumplimiento: true,
        anticipoContrato: true,
        requiereGarantiaLaboral: true,
        retencionFianzaLaboral: true,
        polizaResponsabilidadCivil: true,
      },
    });
    return {
      retencionFielCumplimiento: fase?.retencionFielCumplimiento === true,
      anticipoContrato: fase?.anticipoContrato === true,
      requiereGarantiaLaboral: fase?.requiereGarantiaLaboral === true,
      retencionFianzaLaboral: fase?.retencionFianzaLaboral === true,
      polizaResponsabilidadCivil: fase?.polizaResponsabilidadCivil === true,
    };
  }

  /**
   * Fecha que lleva el contrato: la del cronograma. Quien asumió por decaimiento
   * firma fuera de ese calendario, así que el suyo lleva la fecha en que se genera.
   */
  private async fechaFirma(expedienteId: string, evaluacionId: string, generadoAt: Date) {
    const readjudicaciones = await this.prisma.decaimientoFase4.count({
      where: {
        expedienteId,
        deletedAt: null,
        estado: 'CERRADO',
        decision: 'SUBSIGUIENTE',
        subsiguienteEvaluacionId: evaluacionId,
      },
    });
    if (readjudicaciones > 0) return fechaLarga(generadoAt);

    const cronograma = await this.prisma.cronogramaExpediente.findUnique({
      where: { expedienteId },
      select: { fechaLimiteFirmaContrato: true },
    });
    return cronograma?.fechaLimiteFirmaContrato
      ? fechaLarga(cronograma.fechaLimiteFirmaContrato)
      : null;
  }

  /** Diccionario `data-token-id` → valor, ya formateado. */
  async tokensDe(
    expedienteId: string,
    evaluacionId: string,
    estado: OferenteFase4 | null,
  ): Promise<Record<string, string | null>> {
    const [expediente, evaluacion, fase1, readjudicaciones] = await Promise.all([
      this.prisma.expedienteContratacion.findUnique({
        where: { id: expedienteId },
        select: {
          descripcionObjeto: true,
          codigoNomenclatura: true,
          ente: {
            select: { nombre: true, rif: true, organoAdscripcion: true, ciudad: true },
          },
          cronograma: { select: { fechaLimiteAdjudicacion: true } },
          unidadUsuaria: { select: { nombreUnidadUsuaria: true } },
          partidasPresupuestarias: {
            where: { deletedAt: null },
            select: { codigoPartida: true },
            orderBy: { codigoPartida: 'asc' },
          },
        },
      }),
      this.prisma.evaluacionResultados.findUnique({
        where: { id: evaluacionId },
        select: {
          oferta: {
            select: {
              nombreProveedorOferente: true,
              rifProveedorOferente: true,
              nombreRepLegalOferente: true,
              cedulaRepLegalOferente: true,
              datosRegistroMercantilProveedorOferente: true,
            },
          },
          dictamenAdjudicacion: {
            select: {
              partidasAdjudicadasTotal: true,
              partidasAdjudicadasParcial: true,
              plazoEjecucionOfertaGanadora: true,
              plazoEjecucionOfertaParcial: true,
              montoManoObraOfertado: true,
            },
          },
        },
      }),
      this.prisma.fasePreparatoria.findUnique({
        where: { expedienteId },
        select: {
          porcentajeFielCumplimiento: true,
          porcentajeGarantiaLaboral: true,
          porcentajeAnticipo: true,
          porcentajeResponsabilidadSocial: true,
          lugarLogisticaEjecucion: true,
          plazoEjecucionProcedimiento: true,
          porcentajeResponsabilidadCivil: true,
          montoResponsabilidadCivilBs: true,
          modalidadCrs: true,
          unidadRespCumplimientoCrs: true,
        },
      }),
      // Todo lo que este oferente asumió en readjudicaciones, del ciclo más
      // reciente al más antiguo. Es lo mismo que `montoContrato` suma al monto.
      this.prisma.decaimientoFase4.findMany({
        where: {
          expedienteId,
          deletedAt: null,
          estado: 'CERRADO',
          decision: 'SUBSIGUIENTE',
          subsiguienteEvaluacionId: evaluacionId,
        },
        orderBy: { numeroCiclo: 'desc' },
        select: {
          plazoEjecucionSubsiguiente: true,
          infractor: {
            select: {
              dictamenAdjudicacion: {
                select: {
                  partidasAdjudicadasTotal: true,
                  partidasAdjudicadasParcial: true,
                  plazoEjecucionOfertaGanadora: true,
                  plazoEjecucionOfertaParcial: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const dictamen = evaluacion?.dictamenAdjudicacion;
    const readjudicacion = readjudicaciones[0];

    const codigos = [
      ...new Set((expediente?.partidasPresupuestarias ?? []).map((p) => p.codigoPartida)),
    ];
    const partidasDelExpediente = codigos.length ? codigos.join(', ') : null;

    // Las partidas son del ente, no del oferente: el contrato lleva las de su
    // dictamen más las de cada infractor al que reemplazó, porque su monto
    // también las incluye. Sin ninguna, se usan las del expediente.
    const partidas =
      unirPartidas(
        partidasDe(dictamen),
        ...[...readjudicaciones]
          .reverse()
          .map((ciclo) => partidasDe(ciclo.infractor.dictamenAdjudicacion)),
      ) ?? partidasDelExpediente;

    // El plazo sí es propio de cada oferta: primero el que se pidió en el
    // certificado para el subsiguiente, luego el de su dictamen.
    const plazo =
      dictamen?.plazoEjecucionOfertaGanadora ??
      dictamen?.plazoEjecucionOfertaParcial ??
      readjudicacion?.plazoEjecucionSubsiguiente ??
      fase1?.plazoEjecucionProcedimiento ??
      null;

    return resolverTokens({
      ente: {
        nombre: expediente?.ente?.nombre ?? null,
        rif: expediente?.ente?.rif ?? null,
        organoAdscripcion: expediente?.ente?.organoAdscripcion ?? null,
        ciudad: expediente?.ente?.ciudad ?? null,
      },
      expediente: {
        descripcionObjeto: expediente?.descripcionObjeto ?? null,
        codigoNomenclatura: expediente?.codigoNomenclatura ?? null,
      },
      oferta: {
        nombreProveedorOferente: evaluacion?.oferta.nombreProveedorOferente ?? null,
        rifProveedorOferente: evaluacion?.oferta.rifProveedorOferente ?? null,
        nombreRepLegalOferente: evaluacion?.oferta.nombreRepLegalOferente ?? null,
        cedulaRepLegalOferente: evaluacion?.oferta.cedulaRepLegalOferente ?? null,
        datosRegistroMercantilProveedorOferente:
          evaluacion?.oferta.datosRegistroMercantilProveedorOferente ?? null,
      },
      montoContratoBs: estado?.montoContratoBs ?? null,
      partidasPresupuestarias: partidas,
      plazoEjecucionDias: plazo,
      fase1: {
        porcentajeFielCumplimiento: num(fase1?.porcentajeFielCumplimiento),
        porcentajeGarantiaLaboral: num(fase1?.porcentajeGarantiaLaboral),
        porcentajeAnticipo: num(fase1?.porcentajeAnticipo),
        porcentajeResponsabilidadSocial: num(fase1?.porcentajeResponsabilidadSocial),
        lugarLogisticaEjecucion: fase1?.lugarLogisticaEjecucion ?? null,
        porcentajeResponsabilidadCivil: num(fase1?.porcentajeResponsabilidadCivil),
        montoResponsabilidadCivilBs: num(fase1?.montoResponsabilidadCivilBs),
        modalidadCrs: fase1?.modalidadCrs ?? null,
        unidadRespCumplimientoCrs: fase1?.unidadRespCumplimientoCrs ?? null,
      },
      montoManoObraOfertado: num(dictamen?.montoManoObraOfertado),
      nombreUnidadUsuaria: expediente?.unidadUsuaria?.nombreUnidadUsuaria ?? null,
      fechaAdjudicacion: expediente?.cronograma?.fechaLimiteAdjudicacion ?? null,
    });
  }
}
