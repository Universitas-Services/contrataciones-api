import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import axios from 'axios';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AgenteComplianceClient, CatalogoAgente, LlamadaAgente } from './agente-compliance.client';
import {
  textoAnalizado,
  textoDictamenListo,
  textoErrorAnalisis,
  textoErrorDictamen,
  textoRechazado,
  textoTipoNoCoincide,
} from './compliance.util';
import { Decision, decidir } from './reintentos.util';

/** Un trabajo tomado se libera solo si el proceso muere: el agente espera hasta 15 min. */
const RESERVA_MS = 20 * 60 * 1000;
const MAXIMO_CONCURRENCIA = 60;

type Tabla = 'documento' | 'dictamen';

/**
 * Cola de análisis y dictámenes guardada en PostgreSQL.
 *
 * Cada 5 segundos toma los trabajos listos. Tomar es una actualización
 * condicional: dos procesos nunca toman el mismo. Si el servidor se reinicia a
 * mitad de una llamada, el trabajo vuelve a la cola al vencer su reserva.
 */
@Injectable()
export class ComplianceColaService {
  private readonly logger = new Logger(ComplianceColaService.name);
  private activos = 0;
  private revisando = false;
  private avisoSinClave = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agente: AgenteComplianceClient,
    private readonly config: ConfigService,
  ) {}

  private get concurrencia(): number {
    const valor = Number(this.config.get('COMPLIANCE_CONCURRENCIA') ?? 4);
    if (!Number.isFinite(valor) || valor < 1) return 4;
    return Math.min(Math.floor(valor), MAXIMO_CONCURRENCIA);
  }

  @Interval('compliance-cola', 5000)
  async revisar(): Promise<void> {
    if (this.revisando) return;
    if (!this.agente.configurado) {
      if (!this.avisoSinClave) {
        this.logger.warn('COMPLIANCE_AGENT_URL o COMPLIANCE_AGENT_KEY vacías: la cola no procesa.');
        this.avisoSinClave = true;
      }
      return;
    }
    this.revisando = true;
    try {
      for (const tabla of ['documento', 'dictamen'] as Tabla[]) {
        const libres = this.concurrencia - this.activos;
        if (libres <= 0) return;
        const ahora = new Date();
        const candidatos = await this.buscar(tabla, ahora, libres);
        for (const { id } of candidatos) {
          if (this.activos >= this.concurrencia) return;
          if (!(await this.tomar(tabla, id, ahora))) continue;
          this.activos++;
          const trabajo =
            tabla === 'documento' ? this.procesarDocumento(id) : this.procesarDictamen(id);
          void trabajo
            .catch((error) => this.logger.error(`Falló el trabajo ${tabla} ${id}`, error))
            .finally(() => this.activos--);
        }
      }
    } catch (error) {
      this.logger.error('No se pudo revisar la cola de compliance', error);
    } finally {
      this.revisando = false;
    }
  }

  private listos(ahora: Date) {
    return {
      OR: [
        { estado: 'PENDIENTE' as const, proximoIntentoAt: { lte: ahora } },
        // Reserva vencida: el proceso que lo tomó ya no está.
        { estado: 'PROCESANDO' as const, tomadoHasta: { lt: ahora } },
      ],
    };
  }

  private buscar(tabla: Tabla, ahora: Date, limite: number) {
    const consulta = {
      select: { id: true },
      orderBy: { proximoIntentoAt: 'asc' as const },
      take: limite,
    };
    return tabla === 'documento'
      ? this.prisma.documentoCompliance.findMany({
          where: { vigente: true, ...this.listos(ahora) },
          ...consulta,
        })
      : this.prisma.dictamenCompliance.findMany({ where: this.listos(ahora), ...consulta });
  }

  async tomar(tabla: Tabla, id: string, ahora: Date): Promise<boolean> {
    const data = {
      estado: 'PROCESANDO' as const,
      tomadoHasta: new Date(ahora.getTime() + RESERVA_MS),
      intentos: { increment: 1 },
    };
    const { count } =
      tabla === 'documento'
        ? await this.prisma.documentoCompliance.updateMany({
            where: { id, vigente: true, ...this.listos(ahora) },
            data,
          })
        : await this.prisma.dictamenCompliance.updateMany({
            where: { id, ...this.listos(ahora) },
            data,
          });
    return count === 1;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Análisis de un documento
  // ════════════════════════════════════════════════════════════════════

  async procesarDocumento(id: string): Promise<void> {
    const documento = await this.prisma.documentoCompliance.findUnique({
      where: { id },
      include: { expediente: true },
    });
    if (!documento) return;
    const { expediente } = documento;
    const primerIntentoAt = documento.primerIntentoAt ?? new Date();
    if (!documento.primerIntentoAt) {
      await this.prisma.documentoCompliance.update({ where: { id }, data: { primerIntentoAt } });
    }

    let resultado: LlamadaAgente<Record<string, unknown>>;
    try {
      const archivo = await this.leerArchivo(documento.urlArchivo);
      resultado = await this.agente.analizar({
        archivo,
        nombreArchivo: documento.nombreArchivo,
        mimeType: documento.mimeType,
        nomenclatura: expediente.nomenclatura ?? '',
        modalidad: expediente.modalidad ?? '',
        tipoContratacion: expediente.tipoContratacion ?? '',
        tipoDocumento: documento.tipoDocumento,
      });
    } catch (error) {
      // No se pudo leer el archivo guardado: se trata como un corte temporal.
      this.logger.warn(`No se pudo leer el archivo del documento ${id}: ${String(error)}`);
      resultado = { status: null };
    }

    let decision = decidir(resultado, {
      intentos429: documento.intentos429,
      fallosTemporales: documento.fallosTemporales,
      primerIntentoAt,
    });
    const datos = resultado.datos;
    if (decision.tipo === 'OK' && !esObjeto(datos?.json_analista)) {
      decision = {
        tipo: 'ERROR',
        definitivo: true,
        detalle: 'El agente respondió sin json_analista.',
      };
    }
    this.registrarErrorTecnico('documento', id, resultado.status, decision);

    const catalogo = await this.catalogoOpcional();
    const nombreTipo = (tipo: string | null) =>
      tipo ? nombreTipoDe(catalogo, expediente.modalidad, tipo) : null;
    const nombre = documento.nombreArchivo;

    if (decision.tipo === 'REINTENTAR') {
      await this.prisma.documentoCompliance.update({
        where: { id },
        data: this.reprogramar(decision),
      });
      return;
    }

    if (decision.tipo === 'OK' && datos) {
      const json = datos.json_analista as Record<string, unknown>;
      const estatus = textoONull(datos.estatus_global) ?? textoONull(json.estatus_global);
      const coincide =
        typeof datos.tipo_coincide === 'boolean'
          ? datos.tipo_coincide
          : json.tipo_coincide === true;
      const detectado = textoONull(datos.tipo_detectado);

      await this.prisma.$transaction(async (tx) => {
        await tx.documentoCompliance.update({
          where: { id },
          data: {
            estado: 'ANALIZADO',
            jsonAnalista: json as Prisma.InputJsonValue,
            informeMarkdown: textoONull(datos.informe_markdown),
            estatusGlobal: estatus,
            tipoCoincide: coincide,
            tipoDetectado: detectado,
            metricas: esObjeto(datos.metricas)
              ? (datos.metricas as Prisma.InputJsonValue)
              : undefined,
            error: null,
            analizadoAt: new Date(),
            tomadoHasta: null,
          },
        });
        if (coincide && expediente.tipoDocumentoSolicitado === documento.tipoDocumento) {
          await tx.expedienteCompliance.update({
            where: { id: expediente.id },
            data: { tipoDocumentoSolicitado: null },
          });
        }
        if (await this.sigueVigente(tx, id)) {
          await this.mensaje(
            tx,
            expediente.id,
            coincide
              ? textoAnalizado(nombre, nombreTipo(documento.tipoDocumento)!, json, estatus)
              : textoTipoNoCoincide(
                  nombre,
                  nombreTipo(documento.tipoDocumento)!,
                  nombreTipo(detectado),
                ),
            { documentoId: id },
          );
        }
      });
      return;
    }

    if (decision.tipo === 'RECHAZADO' || decision.tipo === 'ERROR') {
      const rechazado = decision.tipo === 'RECHAZADO';
      await this.prisma.$transaction(async (tx) => {
        await tx.documentoCompliance.update({
          where: { id },
          data: {
            estado: rechazado ? 'RECHAZADO' : 'ERROR',
            error: decision.detalle,
            tomadoHasta: null,
          },
        });
        if (await this.sigueVigente(tx, id)) {
          await this.mensaje(
            tx,
            expediente.id,
            rechazado ? textoRechazado(nombre, decision.detalle) : textoErrorAnalisis(nombre),
            { documentoId: id },
          );
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  Dictamen
  // ════════════════════════════════════════════════════════════════════

  async procesarDictamen(id: string): Promise<void> {
    const dictamen = await this.prisma.dictamenCompliance.findUnique({
      where: { id },
      include: { expediente: true },
    });
    if (!dictamen) return;
    const { expediente } = dictamen;
    const primerIntentoAt = dictamen.primerIntentoAt ?? new Date();
    if (!dictamen.primerIntentoAt) {
      await this.prisma.dictamenCompliance.update({ where: { id }, data: { primerIntentoAt } });
    }

    // Todos los analizados vigentes, también los de tipo equivocado: el agente sabe no contarlos.
    const documentos = await this.prisma.documentoCompliance.findMany({
      where: { expedienteId: expediente.id, vigente: true, estado: 'ANALIZADO' },
      orderBy: { createdAt: 'asc' },
      select: { jsonAnalista: true },
    });
    const jsons = documentos.map((d) => d.jsonAnalista).filter((j) => j != null);

    const resultado: LlamadaAgente<Record<string, unknown>> = jsons.length
      ? await this.agente.dictamen({
          nomenclatura: expediente.nomenclatura ?? '',
          modalidad: expediente.modalidad ?? '',
          tipo_contratacion: expediente.tipoContratacion ?? '',
          documentos: jsons,
          forzar_final: dictamen.forzarFinal,
        })
      : { status: 400, detalle: 'No hay documentos analizados.' };

    let decision = decidir(resultado, {
      intentos429: dictamen.intentos429,
      fallosTemporales: dictamen.fallosTemporales,
      primerIntentoAt,
    });
    const datos = resultado.datos;
    if (decision.tipo === 'OK' && typeof datos?.markdown !== 'string') {
      decision = { tipo: 'ERROR', definitivo: true, detalle: 'El agente respondió sin markdown.' };
    }
    this.registrarErrorTecnico('dictamen', id, resultado.status, decision);

    if (decision.tipo === 'REINTENTAR') {
      await this.prisma.dictamenCompliance.update({
        where: { id },
        data: this.reprogramar(decision),
      });
      return;
    }

    if (decision.tipo === 'OK' && datos) {
      const alcance = textoONull(datos.alcance) ?? (dictamen.forzarFinal ? 'FINAL' : 'PARCIAL');
      const ahora = new Date();
      await this.prisma.$transaction(async (tx) => {
        const listo = await tx.dictamenCompliance.update({
          where: { id },
          data: {
            estado: 'LISTO',
            alcance,
            markdown: datos.markdown as string,
            puntaje: comoJson(datos.puntaje),
            pendientes: comoJson(datos.pendientes),
            coherencia: comoJson(datos.coherencia),
            error: null,
            listoAt: ahora,
            tomadoHasta: null,
          },
        });
        await this.mensaje(tx, expediente.id, textoDictamenListo(listo), { dictamenId: id });
        // Un dictamen final cierra el expediente para siempre.
        if (alcance === 'FINAL') {
          await tx.expedienteCompliance.update({
            where: { id: expediente.id },
            data: { estado: 'CERRADA', cerradoAt: ahora },
          });
        }
      });
      return;
    }

    if (decision.tipo === 'RECHAZADO' || decision.tipo === 'ERROR') {
      await this.prisma.$transaction(async (tx) => {
        await tx.dictamenCompliance.update({
          where: { id },
          data: { estado: 'ERROR', error: decision.detalle, tomadoHasta: null },
        });
        await this.mensaje(tx, expediente.id, textoErrorDictamen(), { dictamenId: id });
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  Apoyo
  // ════════════════════════════════════════════════════════════════════

  private reprogramar(decision: Extract<Decision, { tipo: 'REINTENTAR' }>) {
    return {
      estado: 'PENDIENTE' as const,
      proximoIntentoAt: new Date(Date.now() + decision.esperaMs),
      intentos429: decision.intentos429,
      fallosTemporales: decision.fallosTemporales,
      tomadoHasta: null,
    };
  }

  /** 401 y 422 son de integración o de clave: el equipo técnico debe enterarse. */
  private registrarErrorTecnico(
    tabla: Tabla,
    id: string,
    status: number | null,
    decision: Decision,
  ) {
    if (decision.tipo === 'ERROR' && (status === 401 || status === 422)) {
      this.logger.error(
        `El agente respondió ${status} para el ${tabla} ${id}: ${decision.detalle}. Revisar la clave o la integración.`,
      );
    }
  }

  private async sigueVigente(tx: Prisma.TransactionClient, id: string) {
    const actual = await tx.documentoCompliance.findUnique({
      where: { id },
      select: { vigente: true },
    });
    return actual?.vigente === true;
  }

  private async mensaje(
    tx: Prisma.TransactionClient,
    expedienteId: string,
    texto: string,
    relacion: { documentoId?: string; dictamenId?: string },
  ) {
    await tx.mensajeCompliance.create({
      data: { expedienteId, rol: 'AGENTE', texto, ...relacion },
    });
    await tx.expedienteCompliance.update({
      where: { id: expedienteId },
      data: { updatedAt: new Date() },
    });
  }

  private async catalogoOpcional(): Promise<CatalogoAgente | null> {
    try {
      return await this.agente.obtenerCatalogo();
    } catch {
      return null;
    }
  }

  /** Archivo guardado: local en desarrollo (`/uploads/…`), Cloudinary en producción. */
  async leerArchivo(url: string): Promise<Buffer> {
    if (url.startsWith('/uploads/')) {
      const relativo = url.replace(/^\/uploads\//, '');
      return fs.readFile(path.join(process.cwd(), 'uploads', relativo));
    }
    const respuesta = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 5 * 60 * 1000,
    });
    return Buffer.from(respuesta.data);
  }
}

function nombreTipoDe(catalogo: CatalogoAgente | null, modalidad: string | null, tipo: string) {
  return (
    catalogo?.modalidades
      .find((m) => m.valor === modalidad)
      ?.checklist.find((c) => c.tipo_documento === tipo)?.nombre ?? tipo
  );
}

function esObjeto(valor: unknown): boolean {
  return valor != null && typeof valor === 'object' && !Array.isArray(valor);
}

function textoONull(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor : null;
}

function comoJson(valor: unknown): Prisma.InputJsonValue | undefined {
  return valor == null ? undefined : (valor as Prisma.InputJsonValue);
}
