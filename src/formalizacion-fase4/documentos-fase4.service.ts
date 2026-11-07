import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { TipoDocumento } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { GeneradorDocumentosService } from '../generador-documentos/generador-documentos.service';
import { mapDatosCiclo, mapDatosContrato } from './documentos-fase4.mapper';
import type { CondicionesBloques } from './bloques-contrato';
import type { ClausulaContrato } from './types/fase4.types';

/** Plantilla de cada documento del ciclo de decaimiento. */
const PLANTILLAS_CICLO = {
  CERTIFICADO_INCUMPLIMIENTO: 'certificado-incumplimiento-template.docx',
  RESOLUCION_DECAIMIENTO: 'resolucion-decaimiento-template.docx',
  NOTIFICACION_DECAIMIENTO: 'notificacion-decaimiento-template.docx',
  NOTIFICACION_ADJUDICACION_SUBSIGUIENTE: 'notificacion-adjudicacion-subsiguiente-template.docx',
  NOTIFICACION_FIN_PROCEDIMIENTO: 'notificacion-fin-procedimiento-template.docx',
} as const satisfies Partial<Record<TipoDocumento, string>>;

const PLANTILLA_CONTRATO = 'contrato-fase4-template.docx';

const TIPOS_CICLO = Object.keys(PLANTILLAS_CICLO) as (keyof typeof PLANTILLAS_CICLO)[];
const TIPOS_FASE4: TipoDocumento[] = [...TIPOS_CICLO, 'CONTRATO'];

const OFERENTE = { select: { nombreProveedorEvaluado: true, rifProveedorEvaluado: true } };

export interface ContratoPorEmitir {
  contratoId: string;
  expedienteId: string;
  evaluacionId: string;
  documentoAnteriorId: string | null;
  clauses: ClausulaContrato[];
  tokens: Record<string, string | null>;
  bloques: CondicionesBloques;
  fechaFirma: string | null;
  userId: string;
}

/**
 * Archivos `.docx` de la Fase 4.
 *
 * El paso legal y su archivo van separados a propósito: el paso se confirma en
 * su transacción y el archivo se genera después. Si falta la plantilla o falla
 * la subida, el registro queda con `urlArchivo` vacío y se reintenta, sin
 * revertir nada. Los documentos nunca se borran: son evidencia del procedimiento.
 */
@Injectable()
export class DocumentosFase4Service {
  private readonly logger = new Logger(DocumentosFase4Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly generador: GeneradorDocumentosService,
  ) {}

  /** Genera el archivo de los registros del ciclo que siguen sin URL. */
  async completarPendientes(expedienteId: string) {
    const pendientes = await this.prisma.documentoGenerado.findMany({
      where: {
        expedienteId,
        urlArchivo: '',
        deletedAt: null,
        estaDesactualizado: false,
        decaimientoId: { not: null },
        tipoDocumento: { in: TIPOS_CICLO },
      },
      include: {
        evaluacion: OFERENTE,
        decaimiento: { include: { infractor: OFERENTE, subsiguiente: OFERENTE } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const resultado = { generados: 0, pendientes: 0 };
    if (pendientes.length === 0) return resultado;

    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      select: {
        codigoNomenclatura: true,
        descripcionObjeto: true,
        ente: { select: { nombre: true, rif: true, ciudad: true } },
        fasePreparatoria: { select: { porcentajeFielCumplimiento: true } },
        cronograma: { select: { fechaLimiteAdjudicacion: true, fechaLimiteEvaluacion: true } },
        autoridad: true,
        autoridadFirmaComoDelegado: true,
        comision: {
          select: {
            datosDesignacionComision: true,
            miembros: {
              select: {
                areaRepresentacion: true,
                tipoMiembro: true,
                nombreCompletoMiembro: true,
                cedulaMiembro: true,
              },
            },
          },
        },
      },
    });
    const firmas = expediente ? await this.generador.getFirmasExpediente(expediente) : {};

    for (const documento of pendientes) {
      const plantilla = PLANTILLAS_CICLO[documento.tipoDocumento as keyof typeof PLANTILLAS_CICLO];

      if (!expediente || !documento.decaimiento || !this.generador.plantillaExiste(plantilla)) {
        resultado.pendientes += 1;
        continue;
      }

      try {
        const { fileUrl } = await this.generador.renderizarYSubir(
          expedienteId,
          documento.tipoDocumento,
          plantilla,
          mapDatosCiclo({
            expediente,
            ciclo: documento.decaimiento,
            destinatario: documento.evaluacion,
            firmas,
          }),
        );
        await this.prisma.documentoGenerado.update({
          where: { id: documento.id },
          data: { urlArchivo: fileUrl },
        });
        resultado.generados += 1;
      } catch (error) {
        this.logger.error(`No se generó el documento ${documento.id}`, error);
        resultado.pendientes += 1;
      }
    }

    return resultado;
  }

  /**
   * Genera el `.docx` del contrato y lo enlaza. El archivo anterior se conserva
   * como desactualizado. Devuelve el id del documento, o `null` si quedó
   * pendiente.
   */
  async emitirContrato(contrato: ContratoPorEmitir): Promise<string | null> {
    if (!this.generador.plantillaExiste(PLANTILLA_CONTRATO)) return null;

    try {
      const expediente = await this.prisma.expedienteContratacion.findUnique({
        where: { id: contrato.expedienteId },
        select: { autoridadFirmaComoDelegado: true, autoridad: true },
      });
      const firmas = await this.generador.getFirmasExpediente(expediente);

      const { fileUrl } = await this.generador.renderizarYSubir(
        contrato.expedienteId,
        'CONTRATO',
        PLANTILLA_CONTRATO,
        mapDatosContrato(contrato.tokens, contrato.clauses, {
          bloques: contrato.bloques,
          firmas,
          fechaFirma: contrato.fechaFirma,
        }),
      );

      return await this.prisma.$transaction(async (tx) => {
        const anterior = contrato.documentoAnteriorId
          ? await tx.documentoGenerado.update({
              where: { id: contrato.documentoAnteriorId },
              data: { estaDesactualizado: true },
            })
          : null;

        const documento = await tx.documentoGenerado.create({
          data: {
            expedienteId: contrato.expedienteId,
            evaluacionId: contrato.evaluacionId,
            tipoDocumento: 'CONTRATO',
            urlArchivo: fileUrl,
            versionDocumento: anterior ? anterior.versionDocumento + 1 : 1,
            createdBy: contrato.userId,
          },
        });

        await tx.contratoFase4.update({
          where: { id: contrato.contratoId },
          data: { documentoId: documento.id },
        });

        return documento.id;
      });
    } catch (error) {
      this.logger.error(`No se generó el contrato ${contrato.contratoId}`, error);
      return null;
    }
  }

  /** Vista previa de un documento de la Fase 4 de este expediente. */
  async preview(expedienteId: string, documentoId: string) {
    const documento = await this.conArchivo(expedienteId, documentoId);
    return {
      ...this.generador.mapDocToPreview(documento, documento.tipoDocumento),
      documentoId: documento.id,
      estaDesactualizado: documento.estaDesactualizado,
    };
  }

  /** Lo necesario para servir la descarga de un documento de este expediente. */
  async descarga(expedienteId: string, documentoId: string) {
    const documento = await this.conArchivo(expedienteId, documentoId);
    return {
      url: documento.urlArchivo,
      fileName: `${documento.tipoDocumento.toLowerCase()}-v${documento.versionDocumento}.docx`,
    };
  }

  private async conArchivo(expedienteId: string, documentoId: string) {
    const documento = await this.prisma.documentoGenerado.findFirst({
      where: {
        id: documentoId,
        expedienteId,
        deletedAt: null,
        tipoDocumento: { in: TIPOS_FASE4 },
      },
    });
    if (!documento) throw new NotFoundException('Documento no encontrado en este expediente');

    if (!documento.urlArchivo) {
      throw new ConflictException('El archivo de este documento aún no se ha generado.');
    }
    return documento;
  }
}
