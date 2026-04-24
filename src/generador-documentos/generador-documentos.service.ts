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
        comision: true,
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
      correo_comision: e.comision?.correoElectronico || '___',
      telefono_comision: e.comision?.telefono || '___',
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
      correo_comision: e.comision?.correoElectronico || '___',
      telefono_comision: e.comision?.telefono || '___',
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

  // =========================================================================
  // GESTIÓN DE PARTICIPANTES — Registro de Adquirentes, Recepción y Apertura
  // =========================================================================

  /**
   * Obtiene datos mapeados para el Registro de Adquirentes del Pliego.
   */
  async getDatosRegistroAdquirentes(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        adquirientesPliego: {
          where: { deletedAt: null },
          include: { proveedor: { select: { nombre: true, rif: true } } },
          orderBy: { fechaAdquisicion: 'asc' },
        },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const { ente, comision } = expediente;

    const getMiembro = (area: string, tipo?: string) => {
      return (
        comision?.miembros?.find(
          (m) => m.areaRepresentacion === area && (!tipo || m.tipoMiembro === tipo),
        ) || null
      );
    };

    const secretario = getMiembro('SECRETARIO_A', 'MIEMBRO_PRINCIPAL');

    return {
      nom_ente_contratante: ente?.nombre || '___',
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      denominacion_comision: comision?.denominacionComision || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
      fec_acto_adquisicion_pliego: formatDateToSpanishLong(new Date()),
      // Loop de adquirientes — nombre "adquirientes" con "i" para coincidir con la plantilla
      adquirientes: expediente.adquirientesPliego.map((adq, index) => ({
        numero: index + 1,
        fec_adquisicion_pliego_au_au: formatToDDMMYYYY(adq.fechaAdquisicion),
        nombre_proveedor_adquiriente_au_au:
          adq.nombreProveedorAdquiriente || adq.proveedor?.nombre || '___',
        direccion_fiscal_proveedor_adquirente_au_au:
          adq.direccionFiscalProveedorAdquirente || '___',
        telefono_proveedor_adquirente_au_au: adq.telefonoProveedorAdquirente || '___',
        correo_proveedor_adquirente_au_au: adq.correoProveedorAdquirente || '___',
        datos_pago_pliego_au_au: adq.datosPagoPliego || '___',
      })),
      nom_completo_miembro_secretaria: secretario?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: secretario?.cedulaMiembro || '___',
    };
  }

  async generarRegistroAdquirentes(expedienteId: string, userId: string) {
    const data = await this.getDatosRegistroAdquirentes(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'REGISTRO_ADQUIRENTES',
      'registro-adquirentes-template.docx',
      userId,
      data,
    );
  }

  // ---------------------------------------------------------------------------

  /**
   * Obtiene datos mapeados para el Acta de Recepción de Sobres.
   * No incluye monto — en este acto solo se recibe físicamente el sobre.
   */
  async getDatosActaRecepcionSobres(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        fasePreparatoria: true,
        cronograma: true,
        ofertas: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const { ente, comision, fasePreparatoria, cronograma } = expediente;
    const getMiembroPrincipal = (area: string) =>
      comision?.miembros?.find(
        (m) => m.areaRepresentacion === area && m.tipoMiembro === 'MIEMBRO_PRINCIPAL',
      ) || null;

    return {
      nom_ente_contratante: ente?.nombre || '___',
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      denominacion_comision: comision?.denominacionComision || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
      dir_fiscal_ente: ente?.direccionFiscal || '___',
      fec_acto_recep_aper_sobres_au_au: formatDateToSpanishLong(
        cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      hora_acto_recep_aper_au_au: fasePreparatoria?.horaActoRecepAper || '___',
      loc_ciudad_ente: ente?.ciudad || '___',
      // Loop con clave "adquirientes" para coincidir con {#adquirientes} de la plantilla
      adquirientes: expediente.ofertas.map((of, index) => ({
        numero: index + 1,
        nombre_proveedor_oferente_au_au: of.nombreProveedorOferente || '___',
        rif_proveedor_oferente_au_au: of.rifProveedorOferente || '___',
        nombre_rep_legal_oferente_au_au: of.nombreRepLegalOferente || '___',
        cedula_rep_legal_oferente_au_au: of.cedulaRepLegalOferente || '___',
        num_sobres_entregados_au_au: of.numeroSobresEntregados,
      })),
      nom_completo_miembro_juridica:
        getMiembroPrincipal('AREA_JURIDICA')?.nombreCompletoMiembro || '___',
      cedula_miembro_juridica: getMiembroPrincipal('AREA_JURIDICA')?.cedulaMiembro || '___',
      // Alias para {cedula_miembro_juridico} (sin "a") que aparece en el texto narrativo
      cedula_miembro_juridico: getMiembroPrincipal('AREA_JURIDICA')?.cedulaMiembro || '___',
      nom_completo_miembro_economica:
        getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA')?.nombreCompletoMiembro || '___',
      cedula_miembro_economica:
        getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA')?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica:
        getMiembroPrincipal('AREA_TECNICA')?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: getMiembroPrincipal('AREA_TECNICA')?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria:
        getMiembroPrincipal('SECRETARIO_A')?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: getMiembroPrincipal('SECRETARIO_A')?.cedulaMiembro || '___',
    };
  }

  async generarActaRecepcionSobres(expedienteId: string, userId: string) {
    const data = await this.getDatosActaRecepcionSobres(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'ACTA_RECEPCION',
      'acta-recepcion-sobres-template.docx',
      userId,
      data,
    );
  }

  // ---------------------------------------------------------------------------

  /**
   * Obtiene datos mapeados para el Acta de Apertura de Sobres.
   * Incluye los montos de cada oferta (se abre el sobre en este acto).
   */
  async getDatosActaAperturaSobres(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        fasePreparatoria: true,
        cronograma: true,
        ofertas: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const { ente, comision, fasePreparatoria, cronograma } = expediente;
    const getMiembroPrincipal = (area: string) =>
      comision?.miembros?.find(
        (m) => m.areaRepresentacion === area && m.tipoMiembro === 'MIEMBRO_PRINCIPAL',
      ) || null;

    return {
      nom_ente_contratante: ente?.nombre || '___',
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      denominacion_comision: comision?.denominacionComision || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
      dir_fiscal_ente: ente?.direccionFiscal || '___',
      fec_acto_recep_aper_sobres_au_au: formatDateToSpanishLong(
        cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      hora_acto_recep_aper_au_au: fasePreparatoria?.horaActoRecepAper || '___',
      loc_ciudad_ente: ente?.ciudad || '___',
      // Loop con clave "adquirientes" para coincidir con {#adquirientes} de la plantilla
      adquirientes: expediente.ofertas.map((of, index) => ({
        numero: index + 1,
        nombre_proveedor_oferente_au_au: of.nombreProveedorOferente || '___',
        rif_proveedor_oferente_au_au: of.rifProveedorOferente || '___',
        nombre_rep_legal_oferente_au_au: of.nombreRepLegalOferente || '___',
        cedula_rep_legal_oferente_au_au: of.cedulaRepLegalOferente || '___',
        datos_registro_mercantil_proveedor_oferente_au_au:
          of.datosRegistroMercantilProveedorOferente || '___',
        monto_oferta_bs_au_au: formatCurrencyVE(Number(of.montoOfertaBs)),
      })),
      nom_completo_miembro_juridica:
        getMiembroPrincipal('AREA_JURIDICA')?.nombreCompletoMiembro || '___',
      cedula_miembro_juridica: getMiembroPrincipal('AREA_JURIDICA')?.cedulaMiembro || '___',
      // Alias para el marcador con typo {cedula_miembro_juridico} (sin "a") que aparece en el texto narrativo
      cedula_miembro_juridico: getMiembroPrincipal('AREA_JURIDICA')?.cedulaMiembro || '___',
      nom_completo_miembro_economica:
        getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA')?.nombreCompletoMiembro || '___',
      cedula_miembro_economica:
        getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA')?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica:
        getMiembroPrincipal('AREA_TECNICA')?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: getMiembroPrincipal('AREA_TECNICA')?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria:
        getMiembroPrincipal('SECRETARIO_A')?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: getMiembroPrincipal('SECRETARIO_A')?.cedulaMiembro || '___',
    };
  }

  async generarActaAperturaSobres(expedienteId: string, userId: string) {
    const data = await this.getDatosActaAperturaSobres(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'ACTA_APERTURA',
      'acta-apertura-sobres-template.docx',
      userId,
      data,
    );
  }

  async findByExpedienteYTipo(expedienteId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.prisma.documentoGenerado.findFirst({
      where: { expedienteId, tipoDocumento, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!doc) throw new NotFoundException('Documento no generado para este expediente');
    return doc;
  }

  private formatTituloDocumento(tipo: string): string {
    const dicc: Record<string, string> = {
      ACTA_INICIO: 'Acta de Inicio',
      PLIEGO_CONDICIONES: 'Pliego de Condiciones',
      LLAMADO_PARTICIPAR: 'Llamado a Participar',
      REGISTRO_ADQUIRENTES: 'Registro de Adquirentes del Pliego',
      ACTA_RECEPCION: 'Acta de Recepción de Sobres',
      ACTA_APERTURA: 'Acta de Apertura de Sobres',
      ACTA_ADJUDICACION: 'Acta de Adjudicación',
      CONTRATO: 'Contrato Formalizado',
    };
    return dicc[tipo] || tipo;
  }

  async getPreviewUrl(expedienteId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.findByExpedienteYTipo(expedienteId, tipoDocumento);
    const previewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(doc.urlArchivo)}&embedded=true`;
    return {
      previewUrl,
      tituloDocumento: `Documento - ${this.formatTituloDocumento(tipoDocumento)}`,
      urlArchivo: doc.urlArchivo,
      tipoDocumento,
    };
  }

  async download(expedienteId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.findByExpedienteYTipo(expedienteId, tipoDocumento);
    return {
      url: doc.urlArchivo,
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

  async marcarDocumentosComoDesactualizados(expedienteId: string) {
    await this.prisma.documentoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });

    await this.prisma.pliegoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
  }

  async regenerarDocumento(id: string, userId: string) {
    const docAnterior = await this.prisma.documentoGenerado.findUnique({
      where: { id },
    });

    if (!docAnterior) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }

    switch (docAnterior.tipoDocumento) {
      case 'ACTA_INICIO':
        return this.generarActaInicio(docAnterior.expedienteId, userId);
      case 'PLIEGO_CONDICIONES':
        return this.generarPliegoCondiciones(docAnterior.expedienteId, userId);
      case 'LLAMADO_PARTICIPAR':
        return this.generarLlamadoParticipar(docAnterior.expedienteId, userId);
      case 'REGISTRO_ADQUIRENTES':
        return this.generarRegistroAdquirentes(docAnterior.expedienteId, userId);
      case 'ACTA_RECEPCION':
        return this.generarActaRecepcionSobres(docAnterior.expedienteId, userId);
      case 'ACTA_APERTURA':
        return this.generarActaAperturaSobres(docAnterior.expedienteId, userId);
      default:
        throw new BadRequestException(
          `No se puede regenerar el documento de tipo ${docAnterior.tipoDocumento}`,
        );
    }
  }

  async getStatusPorExpediente(expedienteId: string) {
    // Lista de tipos de documentos que manejamos actualmente
    const tiposSoportados = [
      { tipo: 'ACTA_INICIO', label: 'Acta de Inicio' },
      { tipo: 'PLIEGO_CONDICIONES', label: 'Pliego de Condiciones' },
      { tipo: 'LLAMADO_PARTICIPAR', label: 'Llamado a Participar' },
      { tipo: 'REGISTRO_ADQUIRENTES', label: 'Registro de Adquirentes del Pliego' },
      { tipo: 'ACTA_RECEPCION', label: 'Acta de Recepción de Sobres' },
      { tipo: 'ACTA_APERTURA', label: 'Acta de Apertura de Sobres' },
    ];

    // Buscamos los documentos ya generados para este expediente
    const documentosGenerados = await this.prisma.documentoGenerado.findMany({
      where: { expedienteId, deletedAt: null },
    });

    // Mapeamos los tipos soportados con la info del documento si existe
    return tiposSoportados.map((item) => {
      const doc = documentosGenerados.find((d) => d.tipoDocumento === item.tipo);

      let infoDoc: any = null;
      if (doc) {
        infoDoc = {
          id: doc.id,
          urlArchivo: doc.urlArchivo,
          previewUrl: `https://docs.google.com/gview?url=${encodeURIComponent(doc.urlArchivo)}&embedded=true`,
          version: doc.versionDocumento,
          fechaGeneracion: doc.createdAt,
          estaDesactualizado: doc.estaDesactualizado,
        };
      }

      return {
        tipo: item.tipo,
        label: item.label,
        generado: !!doc,
        estaDesactualizado: doc ? !!doc.estaDesactualizado : false,
        documento: infoDoc,
      };
    });
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
