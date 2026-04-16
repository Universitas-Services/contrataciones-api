import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { IStorageService } from '../common/interfaces/storage-service.interface';
import { EmailService } from '../email/email.service';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {
  formatDateToSpanishLong,
  formatToDDMMYYYY,
  formatCurrencyVE,
} from '../common/utils/date-formatter.util';
import { TipoDocumento } from '@prisma/client';

@Injectable()
export class GeneradorDocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject('IStorageService') private storage: IStorageService,
  ) {}

  /**
   * Obtiene la estructura JSON mapeada para el Acta de Inicio
   */
  async getDatosActaInicio(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        unidadUsuaria: true,
        fasePreparatoria: true,
        modalidad: true,
        cronograma: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);
    if (!expediente.fasePreparatoria)
      throw new NotFoundException(`Fase Preparatoria incompleta para este expediente`);

    const { ente, comision, unidadUsuaria, fasePreparatoria, modalidad, cronograma } = expediente;

    const getMiembro = (area: string) => {
      return comision?.miembros?.find((m) => m.areaRepresentacion === area) || null;
    };

    const miembroJuridica = getMiembro('AREA_JURIDICA');
    const miembroEconomica = getMiembro('AREA_ECONOMICA_FINANCIERA');
    const miembroTecnica = getMiembro('AREA_TECNICA');
    const miembroSecretaria = getMiembro('SECRETARIO_A');

    return {
      nom_ente_contratante: ente?.nombre || '___',
      cod_nomenclatura_proceso_au_au: expediente.codigoNomenclatura || '___',
      loc_ciudad_ente: ente?.ciudad || '___',
      fec_acta_inicio_au_au: formatDateToSpanishLong(fasePreparatoria.fechaActaInicio),
      datos_acto_autorizacion_inicio_au_au: fasePreparatoria.datosActoAutorizacionInicio || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',

      nom_completo_miembro_juridica: miembroJuridica?.nombreCompletoMiembro || '___',
      cedula_miembro_juridica: miembroJuridica?.cedulaMiembro || '___',

      nom_completo_miembro_economica: miembroEconomica?.nombreCompletoMiembro || '___',
      cedula_miembro_economica: miembroEconomica?.cedulaMiembro || '___',

      nom_completo_miembro_tecnica: miembroTecnica?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: miembroTecnica?.cedulaMiembro || '___',

      nom_completo_miembro_secretaria: miembroSecretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: miembroSecretaria?.cedulaMiembro || '___',

      ind_comision_certificado: comision?.comisionCertificada
        ? 'están debidamente certificados'
        : 'no cuentan con certificación',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      id_unidad_usuaria: unidadUsuaria?.nombreUnidadUsuaria || '___',

      monto_estimado_bs: formatCurrencyVE(Number(modalidad?.montoEstimadoBs)),
      valor_ucau_base: formatCurrencyVE(Number(modalidad?.valorUcauBase)),

      condicion_plurianual_au_au: fasePreparatoria.condicionPlurianual || '___',

      fec_inicio_disponibilidad_pliego_au_au: formatToDDMMYYYY(
        cronograma?.fechaInicioDisponibilidadPliego,
      ),
      fec_fin_disponibilidad_pliego_au_au: formatToDDMMYYYY(
        cronograma?.fechaFinDisponibilidadPliego,
      ),
      fec_solicitud_aclaratorias_au_au: formatToDDMMYYYY(cronograma?.fechaSolicitudAclaratorias),
      fec_modific_pliego_au_au: formatToDDMMYYYY(cronograma?.fechaModificacionPliego),
      fec_respuesta_aclaratorias_au_au: formatToDDMMYYYY(cronograma?.fechaRespuestaAclaratorias),
      fec_acto_recep_aper_sobres_au_au: formatToDDMMYYYY(
        cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      fec_limite_evaluacion_au_au: formatToDDMMYYYY(cronograma?.fechaLimiteEvaluacion),
      fec_limite_adjudicacion_au_au: formatToDDMMYYYY(cronograma?.fechaLimiteAdjudicacion),
      fec_limite_notificacion_au_au: formatToDDMMYYYY(cronograma?.fechaLimiteNotificacion),
      fec_limite_garantias_au_au: formatToDDMMYYYY(cronograma?.fechaLimiteGarantias),
      fec_limite_firma_contrato_au_au: formatToDDMMYYYY(cronograma?.fechaLimiteFirmaContrato),

      viabilidad_contrato_marco: fasePreparatoria.viabilidadContratoMarco || '___',
      tipo_objeto_contratacion: modalidad?.tipoContratacion || '___',
    };
  }

  /**
   * Obtiene la estructura JSON mapeada para el Llamado a Participar
   */
  async getDatosLlamadoParticipar(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        fasePreparatoria: true,
        cronograma: true,
        modalidad: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);
    if (!expediente.fasePreparatoria) throw new NotFoundException('Fase preparatoria incompleta');
    if (!expediente.cronograma) throw new NotFoundException('Cronograma incompleto');

    const e = expediente;
    const f = expediente.fasePreparatoria;
    const c = expediente.cronograma;

    let textoPliegoGratuito = 'El Pliego de Condiciones será entregado de forma gratuita.';
    if (!f.pliegoGratuito) {
      const costoBs = f.costoPliegoBs ? formatCurrencyVE(Number(f.costoPliegoBs)) : '0,00';
      textoPliegoGratuito = `El costo del pliego es de Bs. ${costoBs}. El pago deberá realizarse en la cuenta ${f.cuentaPagoPliego || 'N/A'} del banco ${f.bancoPagoPliego || 'N/A'} a nombre de ${f.titularPagoPliego || 'N/A'}.`;
    }

    return {
      nom_ente_contratante: e.ente.nombre || '___',
      cod_nomenclatura_proceso: e.codigoNomenclatura || '___',
      desc_objeto_contratacion: e.descripcionObjeto || '___',
      objetivos_especificos_llamado_1_au_au: f.objetivosEspecificos1 || '___',
      objetivos_especificos_llamado_2_au_au: f.objetivosEspecificos2 || '___',
      objetivos_especificos_llamado_3_au_au: f.objetivosEspecificos3 || '___',
      fec_acto_recep_aper_sobres_au_au: c.fechaActoRecepcionAperturaSobres
        ? formatDateToSpanishLong(c.fechaActoRecepcionAperturaSobres)
        : '___',
      hora_acto_recep_aper_au_au: f.horaActoRecepAper || '___',
      dir_fiscal_ente: e.ente.direccionFiscal || '___',
      direccion_retiro_pliego: f.direccionRetiroPliego || '___',
      fec_inicio_disponibilidad_pliego_au_au: c.fechaInicioDisponibilidadPliego
        ? formatDateToSpanishLong(c.fechaInicioDisponibilidadPliego)
        : '___',
      fec_fin_disponibilidad_pliego_au_au: c.fechaFinDisponibilidadPliego
        ? formatDateToSpanishLong(c.fechaFinDisponibilidadPliego)
        : '___',
      horario_retiro_pliego: f.horarioRetiroPliego || '___',
      correo_comision: f.correoComision || '___',
      telefono_comision: f.telefonoComision || '___',
      pliego_gratuito_au_au: textoPliegoGratuito,
      fec_solicitud_aclaratorias_au_au: c.fechaSolicitudAclaratorias
        ? formatDateToSpanishLong(c.fechaSolicitudAclaratorias)
        : '___',
      fec_respuesta_aclaratorias_au_au: c.fechaRespuestaAclaratorias
        ? formatDateToSpanishLong(c.fechaRespuestaAclaratorias)
        : '___',
    };
  }

  /**
   * Obtiene la estructura JSON mapeada para el Pliego de Condiciones
   */
  async getDatosPliegoCondiciones(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        fasePreparatoria: true,
        cronograma: true,
        modalidad: true,
        comision: true,
        autoridad: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);
    if (!expediente.fasePreparatoria) throw new NotFoundException('Fase preparatoria incompleta');
    if (!expediente.cronograma) throw new NotFoundException('Cronograma incompleto');
    if (!expediente.modalidad) throw new NotFoundException('Modalidad incompleta');

    const e = expediente;
    const f = expediente.fasePreparatoria;
    const c = expediente.cronograma;
    const m = expediente.modalidad;

    return {
      desc_objeto_contratacion: e.descripcionObjeto || '___',
      cod_nomenclatura_proceso: e.codigoNomenclatura || '___',
      nom_ente_contratante: e.ente?.nombre || '___',
      normativa_legal: f.normativaLegal || 'Decreto de Ley de Contrataciones vigente',
      valor_ucau_base: formatCurrencyVE(Number(m.valorUcauBase)),
      denominacion_comision:
        e.comision?.denominacionComision || 'Comisión de Contrataciones Públicas',
      dir_fiscal_ente: e.ente?.direccionFiscal || '___',
      loc_estado_ente: e.ente?.estado || '___',
      correo_comision: f.correoComision || '___',
      telefono_comision: f.telefonoComision || '___',
      pag_web_ente: 'www.snd.gob.ve',
      fec_acto_recep_aper_sobres_au_au: c.fechaActoRecepcionAperturaSobres
        ? formatDateToSpanishLong(c.fechaActoRecepcionAperturaSobres)
        : '___',
      hora_acto_recep_aper_au_au: f.horaActoRecepAper || '___',
      fec_solicitud_aclaratorias_au_au: c.fechaSolicitudAclaratorias
        ? formatDateToSpanishLong(c.fechaSolicitudAclaratorias)
        : '___',
      fec_respuesta_aclaratorias_au_au: c.fechaRespuestaAclaratorias
        ? formatDateToSpanishLong(c.fechaRespuestaAclaratorias)
        : '___',
      horario_retiro_pliego: f.horarioRetiroPliego || '___',
      direccion_retiro_pliego: f.direccionRetiroPliego || '___',
      fec_modific_pliego_au_au: c.fechaModificacionPliego
        ? formatDateToSpanishLong(c.fechaModificacionPliego)
        : '___',
      dias_validez_oferta: f.diasValidezOferta?.toString() || '30',
      loc_municipio_ente: e.ente?.municipio || '___',
      monto_estimado_bs: formatCurrencyVE(Number(m.montoEstimadoBs)),
      nom_completo_autoridad: e.autoridad?.nombreCompletoAutoridad || '___',
      cedula_autoridad: e.autoridad?.cedulaAutoridad || '___',
      cargo_oficial_autoridad: e.autoridad?.cargoOficialAutoridad || '___',
      datos_designacion_autoridad: e.autoridad?.datosDesignacionAutoridad || '___',
      loc_ciudad_ente: e.ente?.ciudad || '___',
      es_bienes: m.tipoContratacion === 'BIENES',
      es_servicios: m.tipoContratacion === 'SERVICIOS',
      es_obras: m.tipoContratacion === 'OBRAS',
    };
  }

  /**
   * Helper unificado para generar el archivo mediante DocxTemplater,
   * subirlo a Cloudinary, y guardarlo en Base de Datos.
   */
  async generarDocumento(
    expedienteId: string,
    tipoDocumento: TipoDocumento,
    templateName: string,
    userId: string,
    jsonData: any,
  ) {
    // 1. Eliminar documento anterior si existe
    const docAnterior = await this.prisma.documentoGenerado.findFirst({
      where: { expedienteId, tipoDocumento, deletedAt: null },
    });

    if (docAnterior) {
      try {
        const publicId = this.extractCloudinaryPublicId(docAnterior.urlArchivo);
        if (publicId) await this.storage.deleteFile(publicId);
      } catch {
        console.warn('⚠️ No se pudo eliminar doc anterior de Cloudinary');
      }

      await this.prisma.documentoGenerado.delete({
        where: { id: docAnterior.id },
      });
    }

    // 2. Cargar plantilla base
    const templatePath = path.join(__dirname, 'templates', templateName);
    if (!fs.existsSync(templatePath)) {
      throw new BadRequestException(`Plantilla no encontrada: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, 'binary');
    let zip: any;
    try {
      zip = new PizZip(content);
    } catch (e: any) {
      throw new BadRequestException(`Error cargando PizZip: ${e.message}`);
    }

    let doc: Docxtemplater;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
      });
    } catch (e: any) {
      throw new BadRequestException(`Error en Docxtemplater inicializacion: ${e.message}`);
    }

    // 3. Renderizar y generar buffer
    try {
      doc.render(jsonData);
    } catch (e: any) {
      throw new BadRequestException(`Error al rellenar la plantilla: ${e.message}`);
    }

    let buffer: Buffer;
    try {
      buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (e: any) {
      throw new BadRequestException(`Error generando buffer ZIP: ${e.message}`);
    }

    // 4. Subir a Cloudinary
    const fileName = `${tipoDocumento.toLowerCase()}-${expedienteId}-${Date.now()}.docx`;
    const filePath = `expedientes/${expedienteId}/${fileName}`;

    let fileUrl: string;
    try {
      fileUrl = await this.storage.uploadFile(buffer, filePath);
    } catch (e: any) {
      throw new BadRequestException(`Error subiendo a Storage: ${e.message}`);
    }

    // 5. Guardar registro en Prisma
    const newDoc = await this.prisma.documentoGenerado.create({
      data: {
        expedienteId,
        tipoDocumento,
        urlArchivo: fileUrl,
        versionDocumento: docAnterior ? docAnterior.versionDocumento + 1 : 1,
        createdBy: userId,
      },
    });

    return {
      id: newDoc.id,
      url: fileUrl,
      fileName,
      tipoDocumento: newDoc.tipoDocumento,
      generatedAt: newDoc.createdAt,
    };
  }

  // --- Endpoints Específicos para cada archivo ---

  async generarActaInicio(expedienteId: string, userId: string) {
    const data = await this.getDatosActaInicio(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'ACTA_INICIO',
      'acta-inicio-template.docx',
      userId,
      data,
    );
  }

  // Generador de Pliego
  async generarPliegoCondiciones(expedienteId: string, userId: string) {
    const data = await this.getDatosPliegoCondiciones(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'PLIEGO_CONDICIONES',
      'pliego-condiciones-template.docx',
      userId,
      data,
    );
  }

  // Placeholder para Llamado
  async generarLlamadoParticipar(expedienteId: string, userId: string) {
    const data = await this.getDatosLlamadoParticipar(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'LLAMADO_PARTICIPAR',
      'llamado-participar-template.docx',
      userId,
      data,
    );
  }

  // --- Funciones de Previsualización y Envío ---

  async findByExpedienteYTipo(expedienteId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.prisma.documentoGenerado.findFirst({
      where: { expedienteId, tipoDocumento, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!doc) throw new NotFoundException('Documento no generado para este expediente');
    return doc;
  }

  async getPreviewUrl(expedienteId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.findByExpedienteYTipo(expedienteId, tipoDocumento);
    const urlCorregida = doc.urlArchivo.endsWith('.docx')
      ? doc.urlArchivo
      : `${doc.urlArchivo}.docx`;
    const previewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(urlCorregida)}&embedded=true`;
    return { previewUrl, urlArchivo: urlCorregida, tipoDocumento };
  }

  async download(expedienteId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.findByExpedienteYTipo(expedienteId, tipoDocumento);
    const urlCorregida = doc.urlArchivo.endsWith('.docx')
      ? doc.urlArchivo
      : `${doc.urlArchivo}.docx`;
    return {
      url: urlCorregida,
      fileName: `${tipoDocumento.toLowerCase()}.docx`,
    };
  }

  async sendDocumentoByEmail(
    expedienteId: string,
    tipoDocumento: TipoDocumento,
    emailDestino: string,
  ) {
    import('axios')
      .then(async (axios) => {
        try {
          const docInfo = await this.download(expedienteId, tipoDocumento);
          const response = await axios.default.get(docInfo.url, { responseType: 'arraybuffer' });
          const fileBuffer = Buffer.from(response.data as ArrayBuffer);

          // Buscar usuario si existe
          const usuario = await this.prisma.usuario.findUnique({
            where: { email: emailDestino, deletedAt: null },
          });
          const nombre = usuario ? usuario.nombre : emailDestino;

          await this.emailService.sendDocumentoExpedienteEmail(
            emailDestino,
            nombre,
            fileBuffer,
            docInfo.fileName,
          );
        } catch (e) {
          console.error('Error al enviar email asincrono:', e);
        }
      })
      .catch((err) => console.error('Error cargando modulo axios:', err));

    return {
      message: `Enviando correo a ${emailDestino} en background`,
    };
  }

  private extractCloudinaryPublicId(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
