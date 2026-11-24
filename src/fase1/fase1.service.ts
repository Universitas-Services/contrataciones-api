import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoMicromodulo, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ExpedienteAccessService } from '../common/services/expediente-access.service';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { MICROMODULOS, MICROMODULO_KEYS, MicromoduloKey } from './constants/micromodulos.constants';
import { validarCompletar, ContextoValidacion } from './validators/completar.validators';
import {
  DOCUMENTOS_POR_MICROMODULO,
  huboCambios,
  modeloContratoComparable,
} from './invalidacion-documentos.util';
import { renderizarPildoras } from '../formalizacion-fase4/pildoras.util';
import { resolverTokensFase1 } from '../formalizacion-fase4/tokens-contrato.resolver';
import { marcarDesactualizados } from '../common/utils/documentos-dependientes.util';

export type { UsuarioActual } from '../common/types/usuario-actual.type';

/** Estado de un documento maestro dentro del panel de la Fase 1. */
type EstadoDocumento = 'BLOQUEADO' | 'DISPONIBLE' | 'GENERADO' | 'DESACTUALIZADO';

@Injectable()
export class Fase1Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: ExpedienteAccessService,
  ) {}

  // -------------------------------------------------------------------------
  // Helpers internos
  // -------------------------------------------------------------------------

  private getConfig(modulo: string) {
    const config = MICROMODULOS[modulo as MicromoduloKey];
    if (!config) {
      throw new NotFoundException(
        `Micromódulo "${modulo}" no existe. Válidos: ${MICROMODULO_KEYS.join(', ')}`,
      );
    }
    return config;
  }

  /**
   * Devuelve la fase del expediente, creándola vacía si aún no existe. El panel
   * de Fase 1 puede abrirse antes de haber guardado nada, así que la fila debe
   * existir para poder llevar los estados de cada micromódulo.
   */
  private async getOrCreateFase(expedienteId: string, userId: string) {
    const existente = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
      include: { especificaciones: true },
    });
    if (existente) return existente;

    return this.prisma.fasePreparatoria.create({
      data: {
        expediente: { connect: { id: expedienteId } },
        createdBy: userId,
        updatedBy: userId,
      },
      include: { especificaciones: true },
    });
  }

  /** Marca desactualizados solo los documentos que leen los datos del módulo que cambió. */
  private async invalidarDocumentos(expedienteId: string, modulo: MicromoduloKey) {
    await marcarDesactualizados(this.prisma, expedienteId, DOCUMENTOS_POR_MICROMODULO[modulo]);
  }

  private huboCambiosEnModulo(modulo: MicromoduloKey, antes: unknown, despues: unknown): boolean {
    return modulo === 'modelo-contrato'
      ? huboCambios(modeloContratoComparable(antes), modeloContratoComparable(despues))
      : huboCambios(antes, despues);
  }

  /** Extrae del registro de fase únicamente los campos del micromódulo pedido. */
  private extraerDatos(fase: Record<string, any>, modulo: MicromoduloKey) {
    const { almacenamiento } = this.getConfig(modulo);

    if (almacenamiento.tipo === 'json') {
      return (fase[almacenamiento.campo] as Record<string, any>) ?? {};
    }

    const datos: Record<string, any> = {};
    for (const campo of almacenamiento.campos) {
      datos[campo] = fase[campo] ?? null;
    }

    // El front del Llamado trabaja con pliegoCosto, inverso de pliegoGratuito.
    if (modulo === 'llamado') {
      datos.pliegoCosto = fase.pliegoGratuito === null ? null : !fase.pliegoGratuito;
    }

    return datos;
  }

  /**
   * Traduce el cuerpo recibido a columnas de la tabla, descartando cualquier
   * campo que no pertenezca al micromódulo.
   */
  private construirUpdate(modulo: MicromoduloKey, body: Record<string, any>) {
    const { almacenamiento } = this.getConfig(modulo);

    if (almacenamiento.tipo === 'json') {
      return { [almacenamiento.campo]: (body.data ?? {}) as Prisma.InputJsonValue };
    }

    const normalizado: Record<string, any> = { ...body };

    if (modulo === 'llamado') {
      // El módulo solo expone pliegoCosto; la columna guarda su inverso.
      if (normalizado.pliegoCosto !== undefined) {
        normalizado.pliegoGratuito = !normalizado.pliegoCosto;
      }
      delete normalizado.pliegoCosto;
    }

    if (modulo === 'actividades-previas' && normalizado.justificacionContratoMarco !== undefined) {
      normalizado.justificacion_contrato_marco_au_au = normalizado.justificacionContratoMarco;
      delete normalizado.justificacionContratoMarco;
    }

    const data: Record<string, any> = {};
    for (const campo of almacenamiento.campos) {
      if (normalizado[campo] === undefined) continue;

      let valor = normalizado[campo];
      // La normativa legal se persiste como JSON serializado (columna de texto).
      if (campo === 'normativaLegal' && Array.isArray(valor)) {
        valor = valor.length > 0 ? JSON.stringify(valor) : null;
      }
      if (campo === 'fecEstudioMercado' && valor) {
        valor = new Date(valor);
      }
      data[campo] = valor;
    }

    return data;
  }

  private async contextoValidacion(expedienteId: string): Promise<ContextoValidacion> {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      select: { modalidad: { select: { tipoContratacion: true } } },
    });

    const totalItemsPresupuesto = await this.prisma.presupuestoItem.count({
      where: { expedienteId, deletedAt: null },
    });

    return {
      tipoContratacion: expediente?.modalidad?.tipoContratacion ?? '',
      totalItemsPresupuesto,
    };
  }

  // -------------------------------------------------------------------------
  // Operaciones por micromódulo
  // -------------------------------------------------------------------------

  async leerModulo(expedienteId: string, modulo: string, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    const config = this.getConfig(modulo);
    const fase = await this.getOrCreateFase(expedienteId, user.id);

    const datos = this.extraerDatos(fase as Record<string, any>, config.key);
    return {
      modulo: config.key,
      etiqueta: config.etiqueta,
      estado: (fase as Record<string, any>)[config.estadoField] as EstadoMicromodulo,
      datos:
        config.key === 'modelo-contrato' ? await this.resolverModelo(expedienteId, datos) : datos,
    };
  }

  // ---------------------------------------------------------------------------
  // Modelo de contrato: marcas con el dato del expediente
  // ---------------------------------------------------------------------------

  /** Valor de cada variable que ya existe en la Fase 1. */
  private async valoresFase1(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      select: {
        descripcionObjeto: true,
        codigoNomenclatura: true,
        ente: { select: { nombre: true, rif: true, organoAdscripcion: true, ciudad: true } },
        unidadUsuaria: { select: { nombreUnidadUsuaria: true } },
        fasePreparatoria: {
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
        },
      },
    });
    return expediente ? resolverTokensFase1(expediente) : {};
  }

  /**
   * Las cláusulas se leen con sus marcas convertidas en píldoras con valor. Lo
   * guardado no cambia: el dato se recalcula en cada lectura, así que si el
   * expediente cambia, la cláusula también.
   */
  private async resolverModelo(expedienteId: string, datos: Record<string, any>) {
    const clausulas = Array.isArray(datos?.clauses) ? datos.clauses : null;
    if (!clausulas?.length) return datos;
    const valores = await this.valoresFase1(expedienteId);
    return {
      ...datos,
      clauses: clausulas.map((c: Record<string, any>) =>
        typeof c?.cuerpoHtml === 'string'
          ? { ...c, cuerpoHtml: renderizarPildoras(c.cuerpoHtml, valores, 'RESOLVER') }
          : c,
      ),
    };
  }

  /** Vista previa de una cláusula de la biblioteca antes de agregarla. */
  async resolverClausula(expedienteId: string, cuerpoHtml: string, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    const valores = await this.valoresFase1(expedienteId);
    return { cuerpoHtml: renderizarPildoras(cuerpoHtml, valores, 'RESOLVER') };
  }

  /** Guarda datos parciales sin validaciones estrictas y deja el módulo en BORRADOR. */
  async guardarBorrador(
    expedienteId: string,
    modulo: string,
    body: Record<string, any>,
    user: UsuarioActual,
  ) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    const config = this.getConfig(modulo);
    await this.getOrCreateFase(expedienteId, user.id);

    const data = this.construirUpdate(config.key, body);
    const estadoActual = await this.estadoDe(expedienteId, config.estadoField);
    const antes = await this.prisma.fasePreparatoria.findUniqueOrThrow({ where: { expedienteId } });

    const fase = await this.prisma.fasePreparatoria.update({
      where: { expedienteId },
      data: {
        ...data,
        // Un módulo ya completado permanece completado al guardar; para volver a
        // borrador el usuario debe reabrirlo explícitamente.
        [config.estadoField]:
          estadoActual === EstadoMicromodulo.COMPLETADO
            ? EstadoMicromodulo.COMPLETADO
            : EstadoMicromodulo.BORRADOR,
        updatedBy: user.id,
      },
      include: { especificaciones: true },
    });

    // Solo un cambio real deja desactualizados los documentos (QA: entrar a revisar
    // un módulo y guardar sin cambios los marcaba todos).
    if (
      this.huboCambiosEnModulo(
        config.key,
        this.extraerDatos(antes as Record<string, any>, config.key),
        this.extraerDatos(fase as Record<string, any>, config.key),
      )
    ) {
      await this.invalidarDocumentos(expedienteId, config.key);
    }

    return {
      modulo: config.key,
      estado: (fase as Record<string, any>)[config.estadoField] as EstadoMicromodulo,
      datos: this.extraerDatos(fase as Record<string, any>, config.key),
    };
  }

  private async estadoDe(expedienteId: string, estadoField: string): Promise<EstadoMicromodulo> {
    const fase = await this.prisma.fasePreparatoria.findUnique({ where: { expedienteId } });
    return (
      ((fase as Record<string, any>)?.[estadoField] as EstadoMicromodulo) ??
      EstadoMicromodulo.PENDIENTE
    );
  }

  /** Valida las reglas estrictas del micromódulo y lo marca COMPLETADO. */
  async completar(
    expedienteId: string,
    modulo: string,
    body: Record<string, any> | undefined,
    user: UsuarioActual,
  ) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    const config = this.getConfig(modulo);
    await this.getOrCreateFase(expedienteId, user.id);

    const antes = await this.prisma.fasePreparatoria.findUniqueOrThrow({ where: { expedienteId } });

    // Si el cuerpo trae datos, se guardan antes de validar.
    if (body && Object.keys(body).length > 0) {
      const data = this.construirUpdate(config.key, body);
      if (Object.keys(data).length > 0) {
        await this.prisma.fasePreparatoria.update({
          where: { expedienteId },
          data: { ...data, updatedBy: user.id },
        });
      }
    }

    // Actividades Previas es el punto de entrada: ningún otro módulo se puede
    // completar hasta que esté cerrado.
    if (config.key !== 'actividades-previas') {
      const estadoEntrada = await this.estadoDe(expedienteId, 'estadoActividadesPrevias');
      if (estadoEntrada !== EstadoMicromodulo.COMPLETADO) {
        throw new BadRequestException(
          'Debe completar primero el micromódulo "Actividades Previas" para habilitar el resto de la fase.',
        );
      }
    }

    const faseActual = await this.prisma.fasePreparatoria.findUniqueOrThrow({
      where: { expedienteId },
    });
    const datos = this.extraerDatos(faseActual as Record<string, any>, config.key);
    const ctx = await this.contextoValidacion(expedienteId);

    const errores = validarCompletar(config.key, datos, ctx);
    if (errores.length > 0) {
      throw new BadRequestException({
        message: `No se puede completar "${config.etiqueta}".`,
        errores,
      });
    }

    const fase = await this.prisma.fasePreparatoria.update({
      where: { expedienteId },
      data: {
        [config.estadoField]: EstadoMicromodulo.COMPLETADO,
        updatedBy: user.id,
      },
      include: { especificaciones: true },
    });

    if (
      this.huboCambiosEnModulo(
        config.key,
        this.extraerDatos(antes as Record<string, any>, config.key),
        datos,
      )
    ) {
      await this.invalidarDocumentos(expedienteId, config.key);
    }
    await this.recalcularPhaseComplete(expedienteId);

    return {
      modulo: config.key,
      estado: EstadoMicromodulo.COMPLETADO,
      datos: this.extraerDatos(fase as Record<string, any>, config.key),
    };
  }

  /**
   * Devuelve el módulo a BORRADOR para poder editarlo. No invalida nada por sí
   * solo: los documentos se marcan desactualizados cuando se guarda un cambio real.
   */
  async reabrir(expedienteId: string, modulo: string, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    const config = this.getConfig(modulo);
    await this.getOrCreateFase(expedienteId, user.id);

    await this.prisma.fasePreparatoria.update({
      where: { expedienteId },
      data: {
        [config.estadoField]: EstadoMicromodulo.BORRADOR,
        phaseComplete: false,
        updatedBy: user.id,
      },
    });

    return {
      modulo: config.key,
      estado: EstadoMicromodulo.BORRADOR,
      message: `"${config.etiqueta}" fue reabierto. Los documentos se marcarán desactualizados si guarda cambios.`,
    };
  }

  // -------------------------------------------------------------------------
  // Progreso de la fase
  // -------------------------------------------------------------------------

  private async recalcularPhaseComplete(expedienteId: string) {
    const progreso = await this.calcularProgreso(expedienteId);
    await this.prisma.fasePreparatoria.update({
      where: { expedienteId },
      data: { phaseComplete: progreso.phaseComplete },
    });
  }

  private async calcularProgreso(expedienteId: string) {
    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
      include: { especificaciones: true },
    });

    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      select: { modalidad: { select: { modalidadSeleccion: true } } },
    });

    const registro = (fase ?? {}) as Record<string, any>;

    const micromodulos: Record<string, EstadoMicromodulo> = {};
    for (const key of MICROMODULO_KEYS) {
      micromodulos[key] =
        (registro[MICROMODULOS[key].estadoField] as EstadoMicromodulo) ??
        EstadoMicromodulo.PENDIENTE;
    }

    // Los dos micromódulos especiales derivan su estado de los datos, no de una
    // columna de estado propia.
    const especificacionesCargadas = Boolean(
      fase?.especificaciones && !fase.especificaciones.deletedAt,
    );
    const totalItems = await this.prisma.presupuestoItem.count({
      where: { expedienteId, deletedAt: null },
    });

    micromodulos['especificaciones-tecnicas'] = especificacionesCargadas
      ? EstadoMicromodulo.COMPLETADO
      : EstadoMicromodulo.PENDIENTE;
    micromodulos['presupuesto-base'] =
      totalItems > 0 ? EstadoMicromodulo.COMPLETADO : EstadoMicromodulo.PENDIENTE;

    // Hard gate del Pliego: los 8 formularios estándar completados, el archivo
    // de especificaciones cargado y al menos un ítem de presupuesto.
    const pliegoMissing: string[] = [];
    for (const key of MICROMODULO_KEYS) {
      if (micromodulos[key] !== EstadoMicromodulo.COMPLETADO) {
        pliegoMissing.push(MICROMODULOS[key].etiqueta);
      }
    }
    if (!especificacionesCargadas) pliegoMissing.push('Especificaciones Técnicas');
    if (totalItems === 0) pliegoMissing.push('Presupuesto base (al menos un ítem)');

    const pliegoReady = pliegoMissing.length === 0;

    // Estado de los documentos maestros según lo ya generado.
    const generados = await this.prisma.documentoGenerado.findMany({
      where: { expedienteId, deletedAt: null },
      select: { tipoDocumento: true, estaDesactualizado: true },
    });
    const pliegos = await this.prisma.pliegoGenerado.findMany({
      where: { expedienteId, deletedAt: null },
      select: { estaDesactualizado: true },
    });

    const estadoDocumento = (
      generado: { estaDesactualizado: boolean } | undefined,
      disponible: boolean,
    ): EstadoDocumento => {
      if (generado) return generado.estaDesactualizado ? 'DESACTUALIZADO' : 'GENERADO';
      return disponible ? 'DISPONIBLE' : 'BLOQUEADO';
    };

    const actividadesCompletas =
      micromodulos['actividades-previas'] === EstadoMicromodulo.COMPLETADO;
    const pliegoGenerado = pliegos[0];

    const documentos = {
      'actividades-previas': estadoDocumento(
        generados.find((d) => d.tipoDocumento === 'ACTIVIDADES_PREVIAS'),
        actividadesCompletas,
      ),
      pliego: estadoDocumento(pliegoGenerado, pliegoReady),
      // Acta de Inicio y Llamado se habilitan recién cuando el Pliego existe.
      'acta-inicio': estadoDocumento(
        generados.find((d) => d.tipoDocumento === 'ACTA_INICIO'),
        Boolean(pliegoGenerado),
      ),
      llamado: estadoDocumento(
        generados.find((d) => d.tipoDocumento === 'LLAMADO_PARTICIPAR'),
        Boolean(pliegoGenerado),
      ),
    };

    const phaseComplete =
      pliegoReady &&
      documentos.pliego !== 'BLOQUEADO' &&
      documentos.pliego !== 'DISPONIBLE' &&
      documentos['acta-inicio'] === 'GENERADO' &&
      documentos.llamado === 'GENERADO';

    return {
      modalidad: expediente?.modalidad?.modalidadSeleccion ?? null,
      micromodulos,
      documentos,
      pliegoReady,
      pliegoMissing,
      phaseComplete,
      totales: {
        itemsPresupuesto: totalItems,
        especificacionesCargadas,
      },
    };
  }

  async progreso(expedienteId: string, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    await this.getOrCreateFase(expedienteId, user.id);
    return this.calcularProgreso(expedienteId);
  }
}
