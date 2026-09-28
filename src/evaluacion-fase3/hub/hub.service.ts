import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SnapshotService } from './snapshot.service';
import { ScoringService } from './scoring.service';
import type { UsuarioActual } from '../../common/types/usuario-actual.type';
import type {
  PlantillasSnapshot,
  ResultadoFinal,
  ModuloHub,
  AccionHub,
  Unlocked,
  FormLegal,
  FormFinanciera,
  FormPuntuado,
  FormEvaluacion,
  FormPromocion,
  EstadoLegal,
  EstadoFinanciera,
  EstadoTecnica,
  EstadoEvaluacion,
  EstadoPromocion,
} from './types/hub.types';

const MAX_JUSTIFICACION = 1000;
const MAX_OBSERVACION = 500;

@Injectable()
export class HubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshot: SnapshotService,
    private readonly scoring: ScoringService,
  ) {}

  /** Lee una columna JSON con su tipo, cayendo al valor por defecto si está vacía. */
  private json<T>(valor: unknown, porDefecto: T): T {
    return (valor ?? porDefecto) as unknown as T;
  }

  // ── Acceso y carga ───────────────────────────────────────────────────────

  private async cargar(evaluacionId: string, user: UsuarioActual) {
    const evaluacion = await this.prisma.evaluacionResultados.findFirst({
      where: { id: evaluacionId, deletedAt: null },
      include: { oferta: { include: { expediente: true } } },
    });

    if (!evaluacion) {
      throw new NotFoundException(`Evaluación ${evaluacionId} no encontrada`);
    }

    const accesoGlobal = user.rol === 'UNIVERSITAS' || user.rol === 'SUPERVISOR';
    if (!accesoGlobal && evaluacion.oferta.expediente.enteId !== user.enteId) {
      throw new ForbiddenException('No tiene acceso a esta evaluación');
    }

    return evaluacion;
  }

  /**
   * Devuelve el snapshot ya congelado o lo construye la primera vez. Una vez
   * escrito no se vuelve a tocar, aunque la Fase 1 cambie.
   */
  private async obtenerSnapshot(
    evaluacionId: string,
    expedienteId: string,
    guardado: unknown,
  ): Promise<PlantillasSnapshot> {
    if (guardado) return guardado as PlantillasSnapshot;

    const plantillas = await this.snapshot.construir(expedienteId);
    await this.prisma.evaluacionResultados.update({
      where: { id: evaluacionId },
      data: { plantillasSnapshot: plantillas as unknown as Prisma.InputJsonValue },
    });
    return plantillas;
  }

  // ── Estados por defecto ──────────────────────────────────────────────────

  private legalVacio(): EstadoLegal {
    return {
      submitted: false,
      oferenteCalificadoLegal: null,
      form: { items: {}, justificacion: '' },
    };
  }

  private financieraVacia(): EstadoFinanciera {
    return {
      submitted: false,
      oferenteCalificadoFinanciera: null,
      total: null,
      form: { criterios: {}, justificacion: '' },
    };
  }

  private tecnicaVacia(): EstadoTecnica {
    return {
      submitted: false,
      oferenteCalificadoTecnica: null,
      total: null,
      form: { criterios: {}, justificacion: '' },
    };
  }

  private evaluacionVacia(): EstadoEvaluacion {
    return {
      submitted: false,
      oferenteEvaluadoTecnico: null,
      oferenteEvaluadoEconomico: null,
      totalTecnico: null,
      totalEconomico: null,
      notaBase: null,
      form: {
        tecnica: { criterios: {}, justificacion: '' },
        economica: { criterios: {}, justificacion: '' },
        posicionPrelacion: '',
      },
    };
  }

  private promocionVacia(): EstadoPromocion {
    return {
      submitted: false,
      totalPuntosPromocion: null,
      puntuacionFinalConBonos: null,
      form: {},
    };
  }

  private unlockedInicial(): Unlocked {
    return { financiera: false, tecnica: false, evaluacion: false, promocion: false };
  }

  // ── Armado de la respuesta ───────────────────────────────────────────────

  private componer(evaluacion: Record<string, any>, plantillas: PlantillasSnapshot) {
    const unlocked: Unlocked = this.json<Unlocked>(evaluacion.hubUnlocked, this.unlockedInicial());
    const resultadoFinal: ResultadoFinal = this.json<ResultadoFinal>(
      evaluacion.hubResultadoFinal,
      'pendiente',
    );

    const promocionActiva = plantillas.promocion !== null;

    return {
      evaluacionId: evaluacion.id as string,
      expedienteId: evaluacion.oferta.expedienteId as string,
      modalidad: 'ACTO_UNICO_APERTURA_UNICA',
      banner: {
        nombreProveedor: evaluacion.oferta.nombreProveedorOferente as string,
        rif: evaluacion.oferta.rifProveedorOferente as string,
        montoOfertaBs: Number(evaluacion.oferta.montoOfertaBs),
      },
      resultadoFinal,
      activeModulo: (evaluacion.hubActiveModulo as ModuloHub) ?? 'legal',
      unlocked,
      plantillaLegal: plantillas.legal,
      legal: this.json<EstadoLegal>(evaluacion.hubLegal, this.legalVacio()),
      plantillaFinanciera: plantillas.financiera,
      financiera: this.json<EstadoFinanciera>(evaluacion.hubFinanciera, this.financieraVacia()),
      plantillaTecnica: plantillas.tecnica,
      tecnica: this.json<EstadoTecnica>(evaluacion.hubTecnica, this.tecnicaVacia()),
      plantillaEvaluacion: plantillas.evaluacion,
      evaluacion: this.json<EstadoEvaluacion>(evaluacion.hubEvaluacion, this.evaluacionVacia()),
      // Cuando la promoción no está activa el front no debe mostrar la pestaña.
      plantillaPromocion: plantillas.promocion,
      promocion: promocionActiva
        ? this.json<EstadoPromocion>(evaluacion.hubPromocion, this.promocionVacia())
        : null,
    };
  }

  async obtenerHub(evaluacionId: string, user: UsuarioActual) {
    const evaluacion = await this.cargar(evaluacionId, user);
    const plantillas = await this.obtenerSnapshot(
      evaluacion.id,
      evaluacion.oferta.expedienteId,
      evaluacion.plantillasSnapshot,
    );
    return this.componer(evaluacion as unknown as Record<string, any>, plantillas);
  }

  // ── Validaciones transversales ───────────────────────────────────────────

  private assertDesbloqueado(modulo: ModuloHub, unlocked: Unlocked) {
    if (modulo === 'legal') return; // siempre disponible
    if (!unlocked[modulo]) {
      throw new ConflictException(
        `El módulo "${modulo}" está bloqueado: debe completar primero el módulo anterior.`,
      );
    }
  }

  private assertNoConfirmado(submitted: boolean, etiqueta: string) {
    if (submitted) {
      throw new ConflictException(`"${etiqueta}" ya fue confirmado y no admite cambios.`);
    }
  }

  private validarJustificacion(justificacion: string | undefined, accion: AccionHub): string[] {
    if (accion !== 'confirm') return [];

    const texto = (justificacion ?? '').trim();
    if (!texto) return ['La justificación es obligatoria para confirmar.'];
    if (texto.length > MAX_JUSTIFICACION) {
      return [`La justificación no puede superar los ${MAX_JUSTIFICACION} caracteres.`];
    }
    return [];
  }

  private assertSinErrores(errores: string[]) {
    if (errores.length > 0) {
      throw new UnprocessableEntityException({
        message: 'No se puede confirmar: hay datos incompletos o inválidos.',
        errores,
      });
    }
  }

  /** Al primer movimiento, la evaluación pasa de pendiente a en curso. */
  private avanzarDesdePendiente(actual: ResultadoFinal): ResultadoFinal {
    return actual === 'pendiente' ? 'en_evaluacion' : actual;
  }

  /** Descalificar cierra todo lo que venga después. */
  private cerrarTodo(): Unlocked {
    return { financiera: false, tecnica: false, evaluacion: false, promocion: false };
  }

  private async guardar(evaluacionId: string, data: Prisma.EvaluacionResultadosUpdateInput) {
    await this.prisma.evaluacionResultados.update({ where: { id: evaluacionId }, data });
  }

  // ── Legal ────────────────────────────────────────────────────────────────

  async patchLegal(evaluacionId: string, accion: AccionHub, form: FormLegal, user: UsuarioActual) {
    const evaluacion = await this.cargar(evaluacionId, user);
    const plantillas = await this.obtenerSnapshot(
      evaluacion.id,
      evaluacion.oferta.expedienteId,
      evaluacion.plantillasSnapshot,
    );

    const estado = this.json<EstadoLegal>(evaluacion.hubLegal, this.legalVacio());
    this.assertNoConfirmado(estado.submitted, 'Calificación legal');

    const unlocked: Unlocked = this.json<Unlocked>(evaluacion.hubUnlocked, this.unlockedInicial());
    let resultadoFinal: ResultadoFinal = this.json<ResultadoFinal>(
      evaluacion.hubResultadoFinal,
      'pendiente',
    );

    const items = form?.items ?? {};

    // La observación se valida siempre: no debe poder guardarse un texto
    // que luego rompa el documento generado.
    const errores: string[] = [];
    for (const [id, respuesta] of Object.entries(items)) {
      const obs = respuesta?.observacion;
      if (obs && obs.length > MAX_OBSERVACION) {
        errores.push(
          `La observación del recaudo "${id}" supera los ${MAX_OBSERVACION} caracteres.`,
        );
      }
    }

    const nuevoEstado: EstadoLegal = {
      submitted: false,
      oferenteCalificadoLegal: null,
      form: { items, justificacion: form?.justificacion ?? '' },
    };

    if (accion === 'draft') {
      this.assertSinErrores(errores);
      await this.guardar(evaluacionId, {
        hubLegal: nuevoEstado as unknown as Prisma.InputJsonValue,
        hubActiveModulo: 'legal',
        hubResultadoFinal: this.avanzarDesdePendiente(resultadoFinal),
      });
      return this.obtenerHub(evaluacionId, user);
    }

    // Confirmar: todos los ítems deben estar respondidos.
    errores.push(...this.validarJustificacion(form?.justificacion, accion));

    for (const item of plantillas.legal.items) {
      const respuesta = items[item.id];
      const valor = respuesta?.consignado;
      if (valor !== 'SI' && valor !== 'NO') {
        errores.push(`Falta responder SI/NO en "${item.etiquetaCorta}".`);
      }
    }
    this.assertSinErrores(errores);

    // Sólo los eliminatorios deciden el dictamen. El VAN se coteja pero no tumba.
    const cumple = plantillas.legal.items
      .filter((i) => i.eliminatorio)
      .every((i) => items[i.id]?.consignado === 'SI');

    nuevoEstado.submitted = true;
    nuevoEstado.oferenteCalificadoLegal = cumple;

    const nuevoUnlocked = cumple ? { ...unlocked, financiera: true } : this.cerrarTodo();
    resultadoFinal = cumple ? 'en_evaluacion' : 'descalificado';

    await this.guardar(evaluacionId, {
      hubLegal: nuevoEstado as unknown as Prisma.InputJsonValue,
      hubUnlocked: nuevoUnlocked as unknown as Prisma.InputJsonValue,
      hubActiveModulo: cumple ? 'financiera' : 'legal',
      hubResultadoFinal: resultadoFinal,
      // Se refleja también en las columnas históricas del modelo.
      oferenteCalificadoLegal: cumple,
      justificacionCalificadoLegal: form?.justificacion ?? null,
    });

    return this.obtenerHub(evaluacionId, user);
  }

  // ── Financiera ───────────────────────────────────────────────────────────

  async patchFinanciera(
    evaluacionId: string,
    accion: AccionHub,
    form: FormFinanciera,
    user: UsuarioActual,
  ) {
    const evaluacion = await this.cargar(evaluacionId, user);
    const plantillas = await this.obtenerSnapshot(
      evaluacion.id,
      evaluacion.oferta.expedienteId,
      evaluacion.plantillasSnapshot,
    );

    const unlocked: Unlocked = this.json<Unlocked>(evaluacion.hubUnlocked, this.unlockedInicial());
    this.assertDesbloqueado('financiera', unlocked);

    const estado = this.json<EstadoFinanciera>(evaluacion.hubFinanciera, this.financieraVacia());
    this.assertNoConfirmado(estado.submitted, 'Calificación financiera');

    const nuevoEstado: EstadoFinanciera = {
      submitted: false,
      oferenteCalificadoFinanciera: null,
      total: null,
      form: { criterios: form?.criterios ?? {}, justificacion: form?.justificacion ?? '' },
    };

    if (accion === 'draft') {
      await this.guardar(evaluacionId, {
        hubFinanciera: nuevoEstado as unknown as Prisma.InputJsonValue,
        hubActiveModulo: 'financiera',
      });
      return this.obtenerHub(evaluacionId, user);
    }

    const resultado = this.scoring.calcularFinanciera(plantillas.financiera, nuevoEstado.form);
    this.assertSinErrores([
      ...this.validarJustificacion(form?.justificacion, accion),
      ...resultado.errores,
    ]);

    nuevoEstado.submitted = true;
    nuevoEstado.total = resultado.total;
    nuevoEstado.oferenteCalificadoFinanciera = resultado.cumple;

    const nuevoUnlocked = resultado.cumple ? { ...unlocked, tecnica: true } : this.cerrarTodo();

    await this.guardar(evaluacionId, {
      hubFinanciera: nuevoEstado as unknown as Prisma.InputJsonValue,
      hubUnlocked: nuevoUnlocked as unknown as Prisma.InputJsonValue,
      hubActiveModulo: resultado.cumple ? 'tecnica' : 'financiera',
      hubResultadoFinal: resultado.cumple ? 'en_evaluacion' : 'descalificado',
      oferenteCalificadoFinanciera: resultado.cumple,
      justificacionCalificadaFinanciera: form?.justificacion ?? null,
    });

    return this.obtenerHub(evaluacionId, user);
  }

  // ── Técnica ──────────────────────────────────────────────────────────────

  async patchTecnica(
    evaluacionId: string,
    accion: AccionHub,
    form: FormPuntuado,
    user: UsuarioActual,
  ) {
    const evaluacion = await this.cargar(evaluacionId, user);
    const plantillas = await this.obtenerSnapshot(
      evaluacion.id,
      evaluacion.oferta.expedienteId,
      evaluacion.plantillasSnapshot,
    );

    const unlocked: Unlocked = this.json<Unlocked>(evaluacion.hubUnlocked, this.unlockedInicial());
    this.assertDesbloqueado('tecnica', unlocked);

    const estado = this.json<EstadoTecnica>(evaluacion.hubTecnica, this.tecnicaVacia());
    this.assertNoConfirmado(estado.submitted, 'Calificación técnica');

    const nuevoEstado: EstadoTecnica = {
      submitted: false,
      oferenteCalificadoTecnica: null,
      total: null,
      form: { criterios: form?.criterios ?? {}, justificacion: form?.justificacion ?? '' },
    };

    if (accion === 'draft') {
      await this.guardar(evaluacionId, {
        hubTecnica: nuevoEstado as unknown as Prisma.InputJsonValue,
        hubActiveModulo: 'tecnica',
      });
      return this.obtenerHub(evaluacionId, user);
    }

    const resultado = this.scoring.calcularPuntuado(
      plantillas.tecnica,
      nuevoEstado.form,
      'calificación técnica',
    );
    this.assertSinErrores([
      ...this.validarJustificacion(form?.justificacion, accion),
      ...resultado.errores,
    ]);

    nuevoEstado.submitted = true;
    nuevoEstado.total = resultado.total;
    nuevoEstado.oferenteCalificadoTecnica = resultado.cumple;

    const nuevoUnlocked = resultado.cumple ? { ...unlocked, evaluacion: true } : this.cerrarTodo();

    await this.guardar(evaluacionId, {
      hubTecnica: nuevoEstado as unknown as Prisma.InputJsonValue,
      hubUnlocked: nuevoUnlocked as unknown as Prisma.InputJsonValue,
      hubActiveModulo: resultado.cumple ? 'evaluacion' : 'tecnica',
      hubResultadoFinal: resultado.cumple ? 'en_evaluacion' : 'descalificado',
      totalCalifTecnica: resultado.total,
      oferenteCalificadoTecnica: resultado.cumple,
      justificacionCalificadoTecnica: form?.justificacion ?? null,
    });

    return this.obtenerHub(evaluacionId, user);
  }

  // ── Evaluación y puntaje ─────────────────────────────────────────────────

  async patchEvaluacion(
    evaluacionId: string,
    accion: AccionHub,
    form: FormEvaluacion,
    user: UsuarioActual,
  ) {
    const evaluacion = await this.cargar(evaluacionId, user);
    const plantillas = await this.obtenerSnapshot(
      evaluacion.id,
      evaluacion.oferta.expedienteId,
      evaluacion.plantillasSnapshot,
    );

    const unlocked: Unlocked = this.json<Unlocked>(evaluacion.hubUnlocked, this.unlockedInicial());
    this.assertDesbloqueado('evaluacion', unlocked);

    const estado = this.json<EstadoEvaluacion>(evaluacion.hubEvaluacion, this.evaluacionVacia());
    this.assertNoConfirmado(estado.submitted, 'Evaluación y puntaje');

    const nuevoEstado: EstadoEvaluacion = {
      ...this.evaluacionVacia(),
      form: {
        tecnica: {
          criterios: form?.tecnica?.criterios ?? {},
          justificacion: form?.tecnica?.justificacion ?? '',
        },
        economica: {
          criterios: form?.economica?.criterios ?? {},
          justificacion: form?.economica?.justificacion ?? '',
        },
        posicionPrelacion: form?.posicionPrelacion ?? '',
      },
    };

    if (accion === 'draft') {
      await this.guardar(evaluacionId, {
        hubEvaluacion: nuevoEstado as unknown as Prisma.InputJsonValue,
        hubActiveModulo: 'evaluacion',
      });
      return this.obtenerHub(evaluacionId, user);
    }

    const resTecnica = this.scoring.calcularPuntuado(
      plantillas.evaluacion.tecnica,
      nuevoEstado.form.tecnica,
      'evaluación técnica',
    );
    const resEconomica = this.scoring.calcularPuntuado(
      plantillas.evaluacion.economica,
      nuevoEstado.form.economica,
      'evaluación económica',
    );

    const errores = [
      ...this.validarJustificacion(nuevoEstado.form.tecnica.justificacion, accion),
      ...this.validarJustificacion(nuevoEstado.form.economica.justificacion, accion),
      ...resTecnica.errores,
      ...resEconomica.errores,
    ];

    const ambosCumplen = resTecnica.cumple && resEconomica.cumple;

    // La prelación sólo se exige cuando el oferente sigue en carrera.
    if (ambosCumplen && !nuevoEstado.form.posicionPrelacion.trim()) {
      errores.push('Debe indicar la posición de prelación del oferente.');
    }
    this.assertSinErrores(errores);

    nuevoEstado.submitted = true;
    nuevoEstado.totalTecnico = resTecnica.total;
    nuevoEstado.totalEconomico = resEconomica.total;
    nuevoEstado.oferenteEvaluadoTecnico = resTecnica.cumple;
    nuevoEstado.oferenteEvaluadoEconomico = resEconomica.cumple;
    nuevoEstado.notaBase = Math.round((resTecnica.total + resEconomica.total) * 100) / 100;

    const promocionActiva = plantillas.promocion !== null;

    let nuevoUnlocked: Unlocked;
    let resultadoFinal: ResultadoFinal;

    if (!ambosCumplen) {
      nuevoUnlocked = this.cerrarTodo();
      resultadoFinal = 'descalificado';
    } else if (promocionActiva) {
      // Con promoción activa el proceso sigue: falta sumar los bonos.
      nuevoUnlocked = { ...unlocked, promocion: true };
      resultadoFinal = 'en_evaluacion';
    } else {
      nuevoUnlocked = { ...unlocked, promocion: false };
      resultadoFinal = 'calificado';
    }

    await this.guardar(evaluacionId, {
      hubEvaluacion: nuevoEstado as unknown as Prisma.InputJsonValue,
      hubUnlocked: nuevoUnlocked as unknown as Prisma.InputJsonValue,
      hubActiveModulo: ambosCumplen && promocionActiva ? 'promocion' : 'evaluacion',
      hubResultadoFinal: resultadoFinal,
      totalTecnica: resTecnica.total,
      totalEconomica: resEconomica.total,
      totalEvaluacion: nuevoEstado.notaBase,
      oferenteEvaluadoTecnico: resTecnica.cumple,
      justificacionEvaluadoTecnico: nuevoEstado.form.tecnica.justificacion || null,
      posicionPrelacion: nuevoEstado.form.posicionPrelacion || null,
      oferenteCalificado: ambosCumplen && !promocionActiva ? true : undefined,
    });

    return this.obtenerHub(evaluacionId, user);
  }

  // ── Promoción económica ──────────────────────────────────────────────────

  async patchPromocion(
    evaluacionId: string,
    accion: AccionHub,
    form: FormPromocion,
    user: UsuarioActual,
  ) {
    const evaluacion = await this.cargar(evaluacionId, user);
    const plantillas = await this.obtenerSnapshot(
      evaluacion.id,
      evaluacion.oferta.expedienteId,
      evaluacion.plantillasSnapshot,
    );

    if (!plantillas.promocion) {
      throw new ConflictException(
        'Este expediente no activó la promoción económica en Actividades Previas.',
      );
    }

    const unlocked: Unlocked = this.json<Unlocked>(evaluacion.hubUnlocked, this.unlockedInicial());
    this.assertDesbloqueado('promocion', unlocked);

    const estado = this.json<EstadoPromocion>(evaluacion.hubPromocion, this.promocionVacia());
    this.assertNoConfirmado(estado.submitted, 'Promoción económica');

    const evaluacionEstado = this.json<EstadoEvaluacion | null>(evaluacion.hubEvaluacion, null);
    // La nota base es la persistida, nunca la que mande el cliente.
    const notaBase = evaluacionEstado?.notaBase ?? 0;

    const nuevoEstado: EstadoPromocion = {
      submitted: false,
      totalPuntosPromocion: null,
      puntuacionFinalConBonos: null,
      form: form ?? {},
    };

    if (accion === 'draft') {
      await this.guardar(evaluacionId, {
        hubPromocion: nuevoEstado as unknown as Prisma.InputJsonValue,
        hubActiveModulo: 'promocion',
      });
      return this.obtenerHub(evaluacionId, user);
    }

    const resultado = this.scoring.calcularPromocion(plantillas.promocion, form ?? {}, notaBase);
    this.assertSinErrores(resultado.errores);

    nuevoEstado.submitted = true;
    nuevoEstado.totalPuntosPromocion = resultado.totalPuntosPromocion;
    nuevoEstado.puntuacionFinalConBonos = resultado.puntuacionFinalConBonos;

    // La promoción nunca descalifica: sólo suma bonos y cierra la evaluación.
    await this.guardar(evaluacionId, {
      hubPromocion: nuevoEstado as unknown as Prisma.InputJsonValue,
      hubActiveModulo: 'promocion',
      hubResultadoFinal: 'calificado',
      totalVan: form?.ptsBonoVan ?? null,
      totalEvaluacion: resultado.puntuacionFinalConBonos,
      oferenteCalificado: true,
    });

    return this.obtenerHub(evaluacionId, user);
  }
}
