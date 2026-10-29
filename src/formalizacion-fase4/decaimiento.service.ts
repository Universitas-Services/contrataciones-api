import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { FormalizacionFase4Service } from './formalizacion-fase4.service';
import { calcularVencimientos } from './dias-habiles.util';
import {
  CertificadoIncumplimientoDto,
  DeclararDecaimientoDto,
  DecisionDecaimientoDto,
  ResolucionDecaimientoDto,
} from './dto/decaimiento.dto';

/**
 * Ciclo de decaimiento de la adjudicación (Art. 110 y 113.4 LCP).
 *
 * El orden es obligatorio y en cascada:
 *
 *   decisión → certificado → resolución → notificación al infractor
 *            → (4A notificar al subsiguiente → cerrar) | (4B cierre en lote)
 *
 * Rehacer un paso invalida los que venían después: el certificado tumba la
 * resolución y las notificaciones; la resolución tumba las notificaciones.
 */
@Injectable()
export class DecaimientoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fase4: FormalizacionFase4Service,
  ) {}

  private async cicloActivo(expedienteId: string) {
    const ciclo = await this.prisma.decaimientoFase4.findFirst({
      where: { expedienteId, estado: 'EN_CURSO', deletedAt: null },
    });
    if (!ciclo) {
      throw new NotFoundException('No hay un ciclo de decaimiento en curso en este expediente.');
    }
    return ciclo;
  }

  /** Una fecha `YYYY-MM-DD` del formulario, sin que el huso la corra un día. */
  private fecha(iso: string): Date {
    return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  }

  // ════════════════════════════════════════════════════════════════════
  //  Abrir y deshacer el ciclo
  // ════════════════════════════════════════════════════════════════════

  async declarar(expedienteId: string, dto: DeclararDecaimientoDto, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const estado = await this.fase4.getEstado(expedienteId, user);
    if (!estado.gates.faseHabilitada) {
      throw new BadRequestException(
        'La Fase 3 todavía no definió el carácter de adjudicación ni los dictámenes.',
      );
    }
    if (estado.cicloActivo) {
      throw new ConflictException('Ya hay un ciclo de decaimiento en curso en este expediente.');
    }

    const infractor = estado.oferentes.find((o) => o.evaluacionId === dto.infractorEvaluacionId);
    if (!infractor) {
      throw new NotFoundException('El oferente indicado no está entre los calificados.');
    }
    if (infractor.estatus !== 'ADJUDICADO') {
      throw new BadRequestException(
        'Solo decae la adjudicación de un oferente con adjudicación vigente.',
      );
    }

    const ultimo = await this.prisma.decaimientoFase4.findFirst({
      where: { expedienteId },
      orderBy: { numeroCiclo: 'desc' },
      select: { numeroCiclo: true },
    });

    await this.prisma.decaimientoFase4.create({
      data: {
        expedienteId,
        numeroCiclo: (ultimo?.numeroCiclo ?? 0) + 1,
        infractorEvaluacionId: dto.infractorEvaluacionId,
        caracterSnapshot: estado.caracterAdjudicacion ?? 'TOTAL',
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  /** Solo se deshace mientras no haya certificado: después ya hay acto firmado. */
  async deshacer(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (ciclo.certificadoGeneradoAt) {
      throw new ConflictException(
        'El certificado de incumplimiento ya fue emitido: el ciclo no se puede deshacer.',
      );
    }

    await this.prisma.decaimientoFase4.update({
      where: { id: ciclo.id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  // ════════════════════════════════════════════════════════════════════
  //  Decisión del ciclo
  // ════════════════════════════════════════════════════════════════════

  async elegirDecision(expedienteId: string, dto: DecisionDecaimientoDto, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (ciclo.certificadoGeneradoAt) {
      throw new ConflictException(
        'La decisión no se puede cambiar: el certificado de incumplimiento ya fue emitido.',
      );
    }

    if (dto.decision === 'SUBSIGUIENTE') {
      const estado = await this.fase4.getEstado(expedienteId, user);
      if (estado.candidatosSubsiguientes.length === 0) {
        throw new BadRequestException(
          'No quedan oferentes en reserva: el procedimiento solo puede declararse desierto.',
        );
      }
    }

    await this.prisma.decaimientoFase4.update({
      where: { id: ciclo.id },
      data: { decision: dto.decision, updatedBy: user.id },
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  // ════════════════════════════════════════════════════════════════════
  //  Paso 1 — certificado de incumplimiento
  // ════════════════════════════════════════════════════════════════════

  async guardarCertificado(
    expedienteId: string,
    dto: CertificadoIncumplimientoDto,
    user: UsuarioActual,
  ) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (!ciclo.decision) {
      throw new BadRequestException(
        'Primero debe elegir si se pasa a la siguiente opción o se declara desierto.',
      );
    }

    const fechaNotificacion = this.fecha(dto.fechaNotificacionAdjudicacionIncumplidor);
    const fechaCertificacion = this.fecha(dto.fechaCertificacionIncumplimiento);
    if (fechaCertificacion < fechaNotificacion) {
      throw new BadRequestException(
        'La fecha de certificación no puede ser anterior a la de notificación de la adjudicación.',
      );
    }

    const esParcial = ciclo.caracterSnapshot === 'PARCIAL';
    const subsiguienteId = await this.resolverSubsiguiente(expedienteId, ciclo, dto, user);

    if (ciclo.decision === 'SUBSIGUIENTE') {
      const faltantes: string[] = [];
      if (esParcial) {
        if (!dto.alcanceReadjudicacionParcial?.trim())
          faltantes.push('alcanceReadjudicacionParcial');
        if (dto.montoReadjudicadoParcialBs == null) faltantes.push('montoReadjudicadoParcialBs');
      } else if (dto.montoReadjudicadoBs == null) {
        faltantes.push('montoReadjudicadoBs');
      }
      if (faltantes.length) {
        throw new BadRequestException(`Faltan datos de la readjudicación: ${faltantes.join(', ')}`);
      }
    }

    if (ciclo.decision === 'DESIERTO') {
      if (!dto.modalidadDegradadaSugerida) {
        throw new BadRequestException(
          'Debe indicar la modalidad degradada sugerida (Art. 114 LCP).',
        );
      }
      if (esParcial && !dto.renglonesAfectadosDecaimiento?.trim()) {
        throw new BadRequestException(
          'En adjudicación parcial debe indicar los renglones afectados por el decaimiento.',
        );
      }
    }

    // El servidor recalcula los vencimientos: no se confía en el frontend.
    const feriados = await this.feriadosDelEnte(expediente.enteId);
    const vencimientos = calcularVencimientos(fechaNotificacion, feriados);

    await this.prisma.$transaction(async (tx) => {
      await tx.decaimientoFase4.update({
        where: { id: ciclo.id },
        data: {
          fechaNotificacionAdjudicacionIncumplidor: fechaNotificacion,
          fechaCertificacionIncumplimiento: fechaCertificacion,
          causalDecaimiento: dto.causalDecaimiento,
          ...vencimientos,
          subsiguienteEvaluacionId: ciclo.decision === 'SUBSIGUIENTE' ? subsiguienteId : null,
          alcanceReadjudicacionParcial: dto.alcanceReadjudicacionParcial ?? null,
          montoReadjudicadoParcialBs: dto.montoReadjudicadoParcialBs ?? null,
          montoReadjudicadoBs: dto.montoReadjudicadoBs ?? null,
          plazoEjecucionSubsiguiente: dto.plazoEjecucionSubsiguiente ?? null,
          modalidadDegradadaSugerida: dto.modalidadDegradadaSugerida ?? null,
          renglonesAfectadosDecaimiento: dto.renglonesAfectadosDecaimiento ?? null,
          certificadoGeneradoAt: new Date(),
          // Rehacer el certificado invalida lo que venía después.
          resolucionGeneradaAt: null,
          numResolucionDecaimiento: null,
          fechaResolucionDecaimiento: null,
          fecNotificacionDecaimiento: null,
          fecNotificacionReadjudicacion: null,
          updatedBy: user.id,
        },
      });

      await this.invalidarDocumentos(tx, ciclo.id, [
        'RESOLUCION_DECAIMIENTO',
        'NOTIFICACION_DECAIMIENTO',
        'NOTIFICACION_ADJUDICACION_SUBSIGUIENTE',
      ]);

      await this.registrarDocumento(tx, {
        expedienteId,
        decaimientoId: ciclo.id,
        tipoDocumento: 'CERTIFICADO_INCUMPLIMIENTO',
        createdBy: user.id,
      });
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  /** TOTAL: lo calcula el backend. PARCIAL: lo elige el usuario. */
  private async resolverSubsiguiente(
    expedienteId: string,
    ciclo: { caracterSnapshot: string; decision: string | null; infractorEvaluacionId: string },
    dto: CertificadoIncumplimientoDto,
    user: UsuarioActual,
  ): Promise<string | null> {
    if (ciclo.decision !== 'SUBSIGUIENTE') return null;

    const estado = await this.fase4.getEstado(expedienteId, user);
    const candidatos = estado.candidatosSubsiguientes;

    if (candidatos.length === 0) {
      throw new BadRequestException('No quedan oferentes en reserva para asumir la adjudicación.');
    }

    if (ciclo.caracterSnapshot === 'TOTAL') return candidatos[0].evaluacionId;

    if (!dto.subsiguienteEvaluacionId) {
      throw new BadRequestException(
        'En adjudicación parcial debe elegir el oferente que asume la readjudicación.',
      );
    }
    const elegido = candidatos.find((c) => c.evaluacionId === dto.subsiguienteEvaluacionId);
    if (!elegido) {
      throw new BadRequestException(
        'El oferente elegido no está entre los candidatos a asumir la readjudicación.',
      );
    }
    return elegido.evaluacionId;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Paso 2 — resolución
  // ════════════════════════════════════════════════════════════════════

  async guardarResolucion(
    expedienteId: string,
    dto: ResolucionDecaimientoDto,
    user: UsuarioActual,
  ) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (!ciclo.certificadoGeneradoAt) {
      throw new BadRequestException('Primero debe emitirse el certificado de incumplimiento.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.decaimientoFase4.update({
        where: { id: ciclo.id },
        data: {
          numResolucionDecaimiento: dto.numResolucionDecaimiento,
          fechaResolucionDecaimiento: this.fecha(dto.fechaResolucionDecaimiento),
          resolucionGeneradaAt: new Date(),
          // Rehacer la resolución invalida las notificaciones.
          fecNotificacionDecaimiento: null,
          fecNotificacionReadjudicacion: null,
          updatedBy: user.id,
        },
      });

      await this.invalidarDocumentos(tx, ciclo.id, [
        'NOTIFICACION_DECAIMIENTO',
        'NOTIFICACION_ADJUDICACION_SUBSIGUIENTE',
      ]);

      await this.registrarDocumento(tx, {
        expedienteId,
        decaimientoId: ciclo.id,
        tipoDocumento: 'RESOLUCION_DECAIMIENTO',
        createdBy: user.id,
      });
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  // ════════════════════════════════════════════════════════════════════
  //  Pasos 3 y 4 — notificaciones de un clic (fecha del servidor)
  // ════════════════════════════════════════════════════════════════════

  async notificarInfractor(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (!ciclo.resolucionGeneradaAt) {
      throw new BadRequestException('Primero debe emitirse la resolución de decaimiento.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.decaimientoFase4.update({
        where: { id: ciclo.id },
        data: { fecNotificacionDecaimiento: new Date(), updatedBy: user.id },
      });
      await this.registrarDocumento(tx, {
        expedienteId,
        decaimientoId: ciclo.id,
        evaluacionId: ciclo.infractorEvaluacionId,
        tipoDocumento: 'NOTIFICACION_DECAIMIENTO',
        createdBy: user.id,
      });
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  async notificarSubsiguiente(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (ciclo.decision !== 'SUBSIGUIENTE') {
      throw new BadRequestException(
        'Este ciclo se decidió como desierto: no hay adjudicación subsiguiente que notificar.',
      );
    }
    if (!ciclo.fecNotificacionDecaimiento) {
      throw new BadRequestException('Primero debe notificarse el decaimiento al infractor.');
    }
    if (!ciclo.subsiguienteEvaluacionId) {
      throw new BadRequestException('El ciclo no tiene un oferente subsiguiente definido.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.decaimientoFase4.update({
        where: { id: ciclo.id },
        data: { fecNotificacionReadjudicacion: new Date(), updatedBy: user.id },
      });
      await this.registrarDocumento(tx, {
        expedienteId,
        decaimientoId: ciclo.id,
        evaluacionId: ciclo.subsiguienteEvaluacionId!,
        tipoDocumento: 'NOTIFICACION_ADJUDICACION_SUBSIGUIENTE',
        createdBy: user.id,
      });
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  // ════════════════════════════════════════════════════════════════════
  //  Cierre del ciclo
  // ════════════════════════════════════════════════════════════════════

  /** 4A — el subsiguiente asume y el switch vuelve a quedar disponible. */
  async cerrarCiclo(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (ciclo.decision !== 'SUBSIGUIENTE') {
      throw new BadRequestException(
        'Un ciclo decidido como desierto se cierra con las notificaciones de fin de procedimiento.',
      );
    }
    if (!ciclo.fecNotificacionReadjudicacion) {
      throw new BadRequestException(
        'Primero debe notificarse la adjudicación a la siguiente opción.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.decaimientoFase4.update({
        where: { id: ciclo.id },
        data: { estado: 'CERRADO', updatedBy: user.id },
      });

      // El contrato del infractor deja de estar vigente, pero no se borra:
      // es evidencia de un procedimiento administrativo.
      await this.desactualizarContratoDe(tx, ciclo.infractorEvaluacionId, user.id);
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  /** 4B — notifica a todos los participantes, cierra y sella el expediente. */
  async cierreDesierto(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    this.fase4.assertNoSellado(expediente);

    const ciclo = await this.cicloActivo(expedienteId);
    if (ciclo.decision !== 'DESIERTO') {
      throw new BadRequestException('Este ciclo no se decidió como desierto.');
    }
    if (!ciclo.fecNotificacionDecaimiento) {
      throw new BadRequestException('Primero debe notificarse el decaimiento al infractor.');
    }

    const participantes = await this.prisma.evaluacionResultados.findMany({
      where: { deletedAt: null, oferta: { expedienteId, deletedAt: null } },
      select: { id: true },
    });

    const ahora = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const participante of participantes) {
        await this.registrarDocumento(tx, {
          expedienteId,
          decaimientoId: ciclo.id,
          evaluacionId: participante.id,
          tipoDocumento: 'NOTIFICACION_FIN_PROCEDIMIENTO',
          createdBy: user.id,
        });
      }

      await tx.decaimientoFase4.update({
        where: { id: ciclo.id },
        data: { estado: 'CERRADO', fecNotificacionDesierto: ahora, updatedBy: user.id },
      });

      await tx.expedienteContratacion.update({
        where: { id: expedienteId },
        data: { estatusProceso: 'DESIERTO', selladoFase4At: ahora, updatedBy: user.id },
      });

      await this.desactualizarContratoDe(tx, ciclo.infractorEvaluacionId, user.id);
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  /**
   * Deshace el sellado. No está en el brief: se agrega porque declarar desierto
   * por error dejaría el expediente trancado para siempre. Restringido a
   * UNIVERSITAS y SUPERVISOR.
   */
  async desellar(expedienteId: string, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    if (!expediente.selladoFase4At) {
      throw new BadRequestException('El expediente no está sellado.');
    }

    await this.prisma.expedienteContratacion.update({
      where: { id: expedienteId },
      data: { selladoFase4At: null, estatusProceso: 'ADJUDICADO', updatedBy: user.id },
    });

    return this.fase4.getEstado(expedienteId, user);
  }

  // ════════════════════════════════════════════════════════════════════
  //  Vista previa de vencimientos
  // ════════════════════════════════════════════════════════════════════

  /**
   * Mismo cálculo que usa el certificado, para que el formulario muestre en
   * pantalla exactamente las fechas que después van al documento.
   */
  async calcularVencimientos(expedienteId: string, fechaIso: string, user: UsuarioActual) {
    const expediente = await this.fase4.cargarExpediente(expedienteId, user);
    const feriados = await this.feriadosDelEnte(expediente.enteId);
    const vencimientos = calcularVencimientos(this.fecha(fechaIso), feriados);

    return {
      fechaNotificacion: this.fecha(fechaIso),
      ...vencimientos,
      diasHabilesGarantias: 5,
      diasHabilesFirmaContrato: 8,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  //  Auxiliares
  // ════════════════════════════════════════════════════════════════════

  private feriadosDelEnte(enteId: string) {
    return this.prisma.diaNoLaborableEnte.findMany({
      where: { enteId, activo: true, deletedAt: null },
      select: { fecha: true, fechaRecurrente: true, esRecurrente: true },
    });
  }

  /** Marca desactualizados los documentos de un ciclo que dejaron de valer. */
  private async invalidarDocumentos(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    decaimientoId: string,
    tipos: string[],
  ) {
    await tx.documentoGenerado.updateMany({
      where: {
        decaimientoId,
        deletedAt: null,
        tipoDocumento: { in: tipos as never[] },
      },
      data: { estaDesactualizado: true },
    });
  }

  private async registrarDocumento(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    datos: {
      expedienteId: string;
      decaimientoId: string;
      evaluacionId?: string;
      tipoDocumento: string;
      createdBy?: string;
    },
  ) {
    await tx.documentoGenerado.create({
      data: {
        expedienteId: datos.expedienteId,
        decaimientoId: datos.decaimientoId,
        evaluacionId: datos.evaluacionId,
        tipoDocumento: datos.tipoDocumento as never,
        urlArchivo: '',
        createdBy: datos.createdBy,
      },
    });
  }

  private async desactualizarContratoDe(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    evaluacionId: string,
    userId?: string,
  ) {
    const contrato = await tx.contratoFase4.findFirst({
      where: { evaluacionId, deletedAt: null },
      select: { documentoId: true },
    });
    if (contrato?.documentoId) {
      await tx.documentoGenerado.update({
        where: { id: contrato.documentoId },
        data: { estaDesactualizado: true },
      });
    }
    await tx.contratoFase4.updateMany({
      where: { evaluacionId, deletedAt: null },
      data: { updatedBy: userId },
    });
  }
}
