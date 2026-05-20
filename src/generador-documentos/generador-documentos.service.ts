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
    evaluacionId?: string,
  ) {
    // 1. Eliminar documento anterior si existe
    const docAnterior = await this.prisma.documentoGenerado.findFirst({
      where: {
        expedienteId,
        tipoDocumento,
        deletedAt: null,
        evaluacionId: evaluacionId || null,
      },
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
        evaluacionId: evaluacionId || null,
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

  async findByEvaluacionYTipo(evaluacionId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.prisma.documentoGenerado.findFirst({
      where: { evaluacionId, tipoDocumento, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!doc) throw new NotFoundException('Documento no generado para esta evaluación');
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
      LISTA_COTEJO: 'Lista de Cotejo',
      INFORME_RECOMENDACION: 'Informe de Recomendación',
    };
    return dicc[tipo] || tipo;
  }

  async getPreviewUrl(expedienteId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.findByExpedienteYTipo(expedienteId, tipoDocumento);
    return this.mapDocToPreview(doc, tipoDocumento);
  }

  async getPreviewUrlByEvaluacion(evaluacionId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.findByEvaluacionYTipo(evaluacionId, tipoDocumento);
    return this.mapDocToPreview(doc, tipoDocumento);
  }

  private mapDocToPreview(doc: { urlArchivo: string }, tipoDocumento: TipoDocumento) {
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

  async downloadByEvaluacion(evaluacionId: string, tipoDocumento: TipoDocumento) {
    const doc = await this.findByEvaluacionYTipo(evaluacionId, tipoDocumento);
    return {
      url: doc.urlArchivo,
      fileName: `${tipoDocumento.toLowerCase()}-evaluacion.docx`,
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
      case 'INFORME_RECOMENDACION':
        return this.generarInformeRecomendacion(docAnterior.expedienteId, userId);
      case 'ACTA_ADJUDICACION':
        return this.generarAdjudicacion(docAnterior.expedienteId, userId);
      case 'CONTRATO':
        return this.generarContrato(docAnterior.expedienteId, userId);
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
      { tipo: 'INFORME_RECOMENDACION', label: 'Informe de Recomendación' },
      { tipo: 'ACTA_ADJUDICACION', label: 'Acta de Adjudicación' },
      { tipo: 'CONTRATO', label: 'Contrato Formalizado' },
    ];

    // Buscamos los documentos ya generados para este expediente
    const documentosGenerados = await this.prisma.documentoGenerado.findMany({
      where: { expedienteId, deletedAt: null },
    });

    // Mapeamos los tipos soportados con la info del documento si existe
    return tiposSoportados.map((item) => {
      // Filtramos todos los documentos de este tipo
      const docs = documentosGenerados.filter((d) => d.tipoDocumento === item.tipo);

      const documentosInfo = docs.map((doc) => ({
        id: doc.id,
        urlArchivo: doc.urlArchivo,
        previewUrl: `https://docs.google.com/gview?url=${encodeURIComponent(doc.urlArchivo)}&embedded=true`,
        version: doc.versionDocumento,
        fechaGeneracion: doc.createdAt,
        estaDesactualizado: doc.estaDesactualizado,
        evaluacionId: doc.evaluacionId,
      }));

      // Tomamos el último para compatibilidad con el frontend actual
      const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

      return {
        tipo: item.tipo,
        label: item.label,
        generado: docs.length > 0,
        estaDesactualizado: lastDoc ? !!lastDoc.estaDesactualizado : false,
        documento: documentosInfo.length > 0 ? documentosInfo[documentosInfo.length - 1] : null,
        documentos: documentosInfo, // Enviamos el array completo para que el front pueda listarlos todos
      };
    });
  }

  // =========================================================================
  // FASE 3 — Lista de Cotejo
  // =========================================================================

  /**
   * Mapea datos para la plantilla lista-cotejo-template.docx
   * Marcadores: {nombre_proveedor_evaluado_au_au}, {carta_manifestacion_voluntad_au_au}, etc.
   */
  async getDatosListaCotejo(expedienteId: string, evaluacionId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        cronograma: true,
      },
    });
    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const evaluacion = await this.prisma.evaluacionResultados.findUnique({
      where: { id: evaluacionId },
      include: { sobre1: true, sobre2: true },
    });
    if (!evaluacion) throw new NotFoundException(`Evaluación ${evaluacionId} no encontrada`);

    const boolToSiNo = (val: boolean | null | undefined) =>
      val === true ? 'SI' : val === false ? 'NO' : '___';

    const s1 = evaluacion.sobre1;
    const s2 = evaluacion.sobre2;
    const comision = expediente.comision;
    const getMiembro = (area: string) =>
      comision?.miembros?.find((m) => m.areaRepresentacion === area) || null;

    const mJuridica = getMiembro('AREA_JURIDICA');
    const mEconomica = getMiembro('AREA_ECONOMICA_FINANCIERA');
    const mTecnica = getMiembro('AREA_TECNICA');
    const mSecretaria = getMiembro('SECRETARIO_A');

    return {
      // Datos del expediente
      nom_ente_contratante: expediente.ente?.nombre || '___',
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      loc_ciudad_ente: expediente.ente?.ciudad || '___',
      fec_acto_recep_aper_sobres_au_au: expediente.cronograma?.fechaActoRecepcionAperturaSobres
        ? expediente.cronograma.fechaActoRecepcionAperturaSobres.toLocaleDateString('es-VE')
        : '___',

      // Datos del oferente evaluado
      nombre_proveedor_evaluado_au_au: evaluacion.nombreProveedorEvaluado || '___',
      rif_proveedor_evaluado_au_au: evaluacion.rifProveedorEvaluado || '___',
      nombre_rep_legal_evaluado_au_au: evaluacion.nombreRepLegalEvaluado || '___',
      cedula_rep_legal_evaluado_au_au: evaluacion.cedulaRepLegalEvaluado || '___',

      // Sección A — Sobre N°1
      carta_manifestacion_voluntad_au_au: boolToSiNo(s1?.cartaManifestacionVoluntad),
      obs_carta_manifestacion_voluntad_au_au: s1?.obsCartaManifestacionVoluntad || '',
      carta_autorizacion_au_au: boolToSiNo(s1?.cartaAutorizacion),
      obs_carta_autorizacion_au_au: s1?.obsCartaAutorizacion || '',
      copia_rif_vigente_au_au: boolToSiNo(s1?.copiaRifVigente),
      obs_copia_rif_vigente_au_au: s1?.obsCopiaRifVigente || '',
      certificado_rnc_au_au: boolToSiNo(s1?.certificadoRnc),
      obs_certificado_rnc_au_au: s1?.obsCertificadoRnc || '',
      solvencia_laboral_au_au: boolToSiNo(s1?.solvenciaLaboral),
      obs_solvencia_laboral_au_au: s1?.obsSolvenciaLaboral || '',
      declaracion_socios_no_inhabilitados_au_au: boolToSiNo(s1?.declaracionSociosNoInhabilitados),
      obs_declaracion_socios_no_inhabilitados_au_au: s1?.obsDeclaracionSociosNoInhabilitados || '',
      declaracion_no_deudas_ente_au_au: boolToSiNo(s1?.declaracionNoDeudas),
      obs_declaracion_no_deudas_ente_au_au: s1?.obsDeclaracionNoDeudas || '',
      declaracion_no_impedimentos_lcp_au_au: boolToSiNo(s1?.declaracionNoImpedimentosLcp),
      obs_declaracion_no_impedimentos_lcp_au_au: s1?.obsDeclaracionNoImpedimentosLcp || '',
      declaracion_info_financiera_au_au: boolToSiNo(s1?.declaracionInfoFinanciera),
      obs_declaracion_info_financiera_au_au: s1?.obsDeclaracionInfoFinanciera || '',
      relacion_servicios_prestados_au_au: boolToSiNo(s1?.relacionServiciosPrestados),
      obs_relacion_servicios_prestados_au_au: s1?.obsRelacionServiciosPrestados || '',
      referencias_comerciales_au_au: boolToSiNo(s1?.referenciasComerciales),
      obs_referencias_comerciales_au_au: s1?.obsReferenciasComerciales || '',

      // Sección B — Sobre N°2
      oferta_tecnico_economica_au_au: boolToSiNo(s2?.ofertaTecnicoEconomica),
      obs_oferta_tecnico_economica_au_au: s2?.obsOfertaTecnicoEconomica || '',
      carta_oferta_au_au: boolToSiNo(s2?.cartaOferta),
      obs_carta_oferta_au_au: s2?.obsCartaOferta || '',
      declaracion_capacidad_financiera_au_au: boolToSiNo(s2?.declaracionCapacidadFinanciera),
      obs_declaracion_capacidad_financiera_au_au: s2?.obsDeclaracionCapacidadFinanciera || '',
      declaracion_compromiso_resp_social_au_au: boolToSiNo(s2?.declaracionCompromisoRespSocial),
      obs_declaracion_compromiso_resp_social_au_au: s2?.obsDeclaracionCompromisoRespSocial || '',
      garantia_mantenimiento_oferta_au_au: boolToSiNo(s2?.garantiaMantenimientoOferta),
      obs_garantia_mantenimiento_oferta_au_au: s2?.obsGarantiaMantenimientoOferta || '',
      declaracion_autocalculo_van_au_au: boolToSiNo(s2?.declaracionAutocalculoVan),
      obs_declaracion_autocalculo_van_au_au: s2?.obsDeclaracionAutocalculoVan || '',

      // Calificación
      oferente_calificado_au_au: boolToSiNo(evaluacion.oferenteCalificado),
      motivo_descalificacion_oferente_au_au: evaluacion.motivoDescalificacion || '',

      // Miembros de la Comisión
      nom_completo_miembro_juridica: mJuridica?.nombreCompletoMiembro || '___',
      cedula_miembro_juridico: mJuridica?.cedulaMiembro || '___',
      nom_completo_miembro_economica: mEconomica?.nombreCompletoMiembro || '___',
      cedula_miembro_economica: mEconomica?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica: mTecnica?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: mTecnica?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria: mSecretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: mSecretaria?.cedulaMiembro || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
    };
  }

  async generarListaCotejo(expedienteId: string, evaluacionId: string, userId: string) {
    const data = await this.getDatosListaCotejo(expedienteId, evaluacionId);
    return this.generarDocumento(
      expedienteId,
      'LISTA_COTEJO',
      'lista-cotejo-template.docx',
      userId,
      data,
      evaluacionId,
    );
  }

  // =========================================================================
  // FASE 3 — Informe de Recomendación
  // =========================================================================

  /**
   * Obtiene los rangos de evaluación técnica según el tipo de contratación.
   * Marcadores: {rango_1_evaluacion_au_au} ... {rango_10_evaluacion_au_au}
   */
  private getRangosEvaluacion(tipoContratacion: string) {
    const rangos: Record<string, string[]> = {
      BIENES: [
        'Hasta 10 días hábiles.',
        'De 11 días hábiles a 15 días hábiles.',
        'De 16 días hábiles a 20 días hábiles.',
        'Mayor a 21 días o no presenta.',
        'Presenta garantía de los Insumos.',
        'No presenta.',
        'Si corresponde con lo solicitado.',
        'No corresponde con lo solicitado.',
        'Ofertó del 50% al 100% de lo solicitado.',
        'Ofertó del 1% al 49% de lo solicitado.',
      ],
      SERVICIOS: [
        'Presenta Cronograma detallado, metodología acorde a los TDR, secuencia lógica de actividades y asignación de recursos por etapa.',
        'Presenta Cronograma y metodología, pero la secuencia presenta holguras excesivas o no detalla los recursos a utilizar en cada etapa.',
        'Presenta un Plan de Trabajo genérico no ajustado a la realidad del Ente, o con inconsistencias en los lapsos de ejecución.',
        'No presenta Plan de Trabajo, o el mismo supera los lapsos máximos requeridos por el contratante.',
        'El personal propuesto cumple o supera el 100% de la experiencia y nivel académico solicitados en las Especificaciones Técnicas.',
        'El personal propuesto NO cumple con el perfil solicitado o no se consignaron los soportes curriculares (CV y Títulos).',
        'Demuestra la disponibilidad operativa del 100% de los equipos y herramientas exigidos (mediante facturas de propiedad o cartas de compromiso de arrendamiento).',
        'No demuestra la disponibilidad o presenta menos del 100% de los equipos mínimos requeridos.',
        'Garantiza un tiempo de respuesta (Atención in situ) MENOR al tiempo estándar solicitado en el Pliego.',
        'Garantiza un tiempo de respuesta (Atención in situ) IGUAL al tiempo máximo permitido en el Pliego.',
      ],
      OBRAS: [
        'Presenta Cronograma (Gantt/PERT) detallado con Ruta Crítica definida, asignación lógica de recursos y cumple el plazo de ejecución solicitado.',
        'Presenta Cronograma lógico y coherente con el plazo, pero NO define claramente la Ruta Crítica o la asignación de recursos.',
        'Presenta un Cronograma genérico, con inconsistencias en la secuencia constructiva o sin holguras razonables.',
        'No presenta Cronograma, o el plazo propuesto supera el máximo establecido en el Pliego.',
        'El profesional propuesto cumple o supera los años de graduado y la experiencia específica en obras similares solicitada en el Pliego (soportado con CV y constancias).',
        'El profesional propuesto NO cumple con la experiencia mínima exigida o no se consignaron los soportes curriculares.',
        'Demuestra la disponibilidad operativa y ubicación del 100% de la maquinaria esencial solicitada (con títulos de propiedad o cartas de intención de arrendamiento vigentes).',
        'No demuestra la disponibilidad o presenta menos del 100% de la maquinaria mínima requerida para el inicio de la obra.',
        'Describe detalladamente los procedimientos constructivos, normas de seguridad y logística adaptados específicamente a las condiciones de la obra a ejecutar.',
        'Presenta una metodología genérica o estándar, sin detallar procedimientos específicos para las partidas complejas de la obra.',
      ],
    };
    return rangos[tipoContratacion] || rangos['SERVICIOS'];
  }

  /**
   * Mapea datos para informe-recomendacion-template.docx.
   * Incluye loop de oferentes, calificación, matriz de totalización y preguntas del informe.
   */
  async getDatosInformeRecomendacion(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        modalidad: true,
        cronograma: true,
        fasePreparatoria: true,
        ofertas: {
          where: { deletedAt: null },
          include: {
            evaluacion: { include: { sobre1: true, sobre2: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        informeRecomendacion: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const tipoContratacion = expediente.modalidad?.tipoContratacion || 'SERVICIOS';
    const rangos = this.getRangosEvaluacion(tipoContratacion);
    const informe = expediente.informeRecomendacion;
    const cronograma = expediente.cronograma;
    const fasePrep = expediente.fasePreparatoria;
    const comision = expediente.comision;
    const boolToSiNo = (v: boolean | null | undefined) =>
      v === true ? 'Sí' : v === false ? 'No' : '___';

    const getMiembro = (area: string) =>
      comision?.miembros?.find((m) => m.areaRepresentacion === area) || null;

    const mJuridica = getMiembro('AREA_JURIDICA');
    const mEconomica = getMiembro('AREA_ECONOMICA_FINANCIERA');
    const mTecnica = getMiembro('AREA_TECNICA');
    const mSecretaria = getMiembro('SECRETARIO_A');

    const formatearFecha = (fecha: Date | null | undefined) =>
      fecha ? fecha.toLocaleDateString('es-VE') : '___';

    // Criterios fijos por tipo (para encabezados de la tabla)
    const criteriosPorTipo: Record<string, string[]> = {
      BIENES: [
        'Tiempo de entrega a partir de la recepción de la Orden de compra.',
        'Garantía de los insumos.',
        'Características de los insumos.',
        'Disponibilidad de los insumos requeridos.',
      ],
      SERVICIOS: [
        'Plan de trabajo y metodología propuesta.',
        'Perfil del personal Técnico clave.',
        'Disponibilidad de Equipos y Herramientas.',
        'Tiempo de respuesta ante fallas.',
      ],
      OBRAS: [
        'Cronograma de Ejecución y Plan de Trabajo.',
        'Experiencia de Ingeniero Residente.',
        'Maquinaria y Equipos disponibles (propios / alquilados).',
        'Memoria Descriptiva / Metodología de Ejecución.',
      ],
    };
    const criterios = criteriosPorTipo[tipoContratacion] || criteriosPorTipo['SERVICIOS'];

    // Loop de oferentes para tabla de recepción
    const adquirientes = expediente.ofertas.map((of, index) => ({
      numero: index + 1,
      nombre_proveedor_oferente_au_au: of.nombreProveedorOferente || '___',
      rif_proveedor_oferente_au_au: of.rifProveedorOferente || '___',
      nombre_rep_legal_oferente_au_au: of.nombreRepLegalOferente || '___',
      cedula_rep_legal_oferente_au_au: of.cedulaRepLegalOferente || '___',
      num_sobres_entregados_au_au: of.numeroSobresEntregados ?? '___',
    }));

    // Calificación por empresa
    const calificaciones = expediente.ofertas.map((of) => {
      const ev = of.evaluacion;
      if (!ev)
        return {
          calificacion_empresa_au_au: `Empresa ${of.nombreProveedorOferente} — Sin evaluación registrada.`,
        };
      return {
        calificacion_empresa_au_au:
          ev.oferenteCalificado === true
            ? `Empresa Calificada: ${of.nombreProveedorOferente} - Cumplió con todos los requisitos legales, financieros y técnicos.`
            : ev.oferenteCalificado === false
              ? `Empresa Descalificada: ${of.nombreProveedorOferente} - Justificación: ${ev.motivoDescalificacion || '___'}`
              : `${of.nombreProveedorOferente} — Evaluación pendiente.`,
      };
    });

    // Matriz de totalización ordenada por posición de prelación
    const prelacionOrden = [
      'Primera Opción',
      'Segunda Opción',
      'Tercera Opción',
      'Cuarta Opción',
      'Quinta Opción',
      'Sexta Opción',
    ];
    const evaluaciones = expediente.ofertas
      .filter((of) => of.evaluacion)
      .sort((a, b) => {
        const ia = prelacionOrden.indexOf(a.evaluacion!.posicionPrelacion || '');
        const ib = prelacionOrden.indexOf(b.evaluacion!.posicionPrelacion || '');
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((of) => {
        const ev = of.evaluacion!;
        return {
          nombre_proveedor_evaluado_au_au: ev.nombreProveedorEvaluado || '___',
          total_tecnica_au_au: Number(ev.totalTecnica ?? 0),
          total_economica_au_au: Number(ev.totalEconomica ?? 0),
          total_van_au_au: Number(ev.totalVan ?? 0),
          total_evaluacion_oferente_au_au: Number(ev.totalEvaluacion ?? 0),
          posicion_prelacion_au_au: ev.posicionPrelacion || '___',
          monto_oferta_bs_au_au: Number(ev.sobre2?.montoOfertaBs ?? 0),
          rif_proveedor_evaluado_au_au: ev.rifProveedorEvaluado || '___',
        };
      });

    // Formateador de moneda simple para los montos de la tabla
    const formatBs = (num: number) =>
      num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getOferenteEnPosicion = (index: number) =>
      evaluaciones[index] || {
        nombre_proveedor_evaluado_au_au: '___',
        monto_oferta_bs_au_au: 0,
        total_evaluacion_oferente_au_au: 0,
        rif_proveedor_evaluado_au_au: '___',
      };

    const op1 = getOferenteEnPosicion(0);
    const op2 = getOferenteEnPosicion(1);
    const op3 = getOferenteEnPosicion(2);
    const op4 = getOferenteEnPosicion(3);
    const op5 = getOferenteEnPosicion(4);
    const op6 = getOferenteEnPosicion(5);

    // Texto condicional actualización de presupuesto
    let textoActualizacionPresupuesto =
      'No fue necesario actualizar el presupuesto base, ya que las ofertas recibidas se encuentran dentro de un rango razonable respecto a la estimación inicial.';
    if (informe?.actualizacionPresupuesto) {
      textoActualizacionPresupuesto = `Se procedió a actualizar el presupuesto base a Bs. ${formatBs(Number(informe.montoNuevoPresupuesto ?? 0))}, debido a ${informe.justificacionActualizacionPresup || '___'}, para asegurar una comparación justa y objetiva de las ofertas.`;
    }

    // Texto condicional formalidades
    let textoFormalidades = 'No se observaron omisiones de formalidades durante el procedimiento.';
    if (informe?.observacionFormalidades) {
      textoFormalidades = `Se observó ${informe.omisionFormalidades || '___'}, y se decidió ${informe.subsanacionActo || '___'} mediante ${informe.datosActoSubsanacion || '___'} para garantizar la legalidad del proceso.`;
    }

    return {
      nom_ente_contratante: expediente.ente?.nombre || '___',
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      tipo_objeto_contratacion: tipoContratacion,
      loc_ciudad_ente: expediente.ente?.ciudad || '___',

      // Montos del presupuesto
      monto_estimado_bs: formatBs(Number(expediente.modalidad?.montoEstimadoBs ?? 0)),
      valor_ucau_base: formatBs(Number(expediente.modalidad?.valorUcauBase ?? 0)),

      // Cronograma y Fase Preparatoria
      fec_limite_evaluacion_au_au: formatearFecha(cronograma?.fechaLimiteEvaluacion),
      fec_acta_inicio_au_au: formatearFecha(fasePrep?.fechaActaInicio),
      pag_web_ente: '___', // Placeholder para web
      fec_llamado_participar_au_au: formatearFecha(cronograma?.fechaLlamadoParticipar),
      fec_inicio_disponibilidad_pliego_au_au: formatearFecha(
        cronograma?.fechaInicioDisponibilidadPliego,
      ),
      fec_fin_disponibilidad_pliego_au_au: formatearFecha(cronograma?.fechaFinDisponibilidadPliego),
      fec_acto_recep_aper_sobres_au_au: formatearFecha(
        cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      hora_acto_recep_aper_au_au: fasePrep?.horaActoRecepAper || '___',

      // Criterios técnicos para encabezados de tabla
      criterio_1_evaluacion_au_au: criterios[0] || '___',
      criterio_2_evaluacion_au_au: criterios[1] || '___',
      criterio_3_evaluacion_au_au: criterios[2] || '___',
      criterio_4_evaluacion_au_au: criterios[3] || '___',

      // Rangos de evaluación técnica
      rango_1_evaluacion_au_au: rangos[0] || '___',
      rango_2_evaluacion_au_au: rangos[1] || '___',
      rango_3_evaluacion_au_au: rangos[2] || '___',
      rango_4_evaluacion_au_au: rangos[3] || '___',
      rango_5_evaluacion_au_au: rangos[4] || '___',
      rango_6_evaluacion_au_au: rangos[5] || '___',
      rango_7_evaluacion_au_au: rangos[6] || '___',
      rango_8_evaluacion_au_au: rangos[7] || '___',
      rango_9_evaluacion_au_au: rangos[8] || '___',
      rango_10_evaluacion_au_au: rangos[9] || '___',

      // Loop de oferentes (tabla de recepción)
      adquirientes,

      // Calificación de cada empresa
      calificaciones,

      // Matriz de totalización ordenada por prelación
      evaluaciones,

      // Montos por opción
      monto_menor_oferta_au_au: op1.monto_oferta_bs_au_au
        ? formatBs(op1.monto_oferta_bs_au_au)
        : '___',
      monto_segunda_menor_oferta_au_au: op2.monto_oferta_bs_au_au
        ? formatBs(op2.monto_oferta_bs_au_au)
        : '___',
      monto_tercera_menor_oferta_au_au: op3.monto_oferta_bs_au_au
        ? formatBs(op3.monto_oferta_bs_au_au)
        : '___',
      monto_cuarta_menor_oferta_au_au: op4.monto_oferta_bs_au_au
        ? formatBs(op4.monto_oferta_bs_au_au)
        : '___',
      monto_quinta_menor_oferta_au_au: op5.monto_oferta_bs_au_au
        ? formatBs(op5.monto_oferta_bs_au_au)
        : '___',
      monto_sexta_menor_oferta_au_au: op6.monto_oferta_bs_au_au
        ? formatBs(op6.monto_oferta_bs_au_au)
        : '___',

      // Prelación - Ganadores
      oferente_primera_opción_au_au: op1.nombre_proveedor_evaluado_au_au,
      total1_evaluacion_oferente_au_au: op1.total_evaluacion_oferente_au_au,
      oferente_segunda_opción_au_au: op2.nombre_proveedor_evaluado_au_au,
      total2_evaluacion_oferente_au_au: op2.total_evaluacion_oferente_au_au,
      oferente_tercera_opción_au_au: op3.nombre_proveedor_evaluado_au_au,
      total3_evaluacion_oferente_au_au: op3.total_evaluacion_oferente_au_au,
      oferente_cuarta_opción_au_au: op4.nombre_proveedor_evaluado_au_au,
      total4_evaluacion_oferente_au_au: op4.total_evaluacion_oferente_au_au,
      oferente_quinta_opción_au_au: op5.nombre_proveedor_evaluado_au_au,
      total5_evaluacion_oferente_au_au: op5.total_evaluacion_oferente_au_au,
      oferente_sexta_opción_au_au: op6.nombre_proveedor_evaluado_au_au,
      total6_evaluacion_oferente_au_au: op6.total_evaluacion_oferente_au_au,

      rif_proveedor_evaluado_au_au: op1.rif_proveedor_evaluado_au_au,

      // Miembros de la Comisión
      nom_completo_miembro_juridica: mJuridica?.nombreCompletoMiembro || '___',
      cedula_miembro_jurico: mJuridica?.cedulaMiembro || '___',
      cedula_miembro_juridico: mJuridica?.cedulaMiembro || '___', // Backup for typo in template
      nom_completo_miembro_economica: mEconomica?.nombreCompletoMiembro || '___',
      cedula_miembro_economica: mEconomica?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica: mTecnica?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: mTecnica?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria: mSecretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: mSecretaria?.cedulaMiembro || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',

      // Informe de Recomendación
      actualizacion_presupuesto_au_au: textoActualizacionPresupuesto,
      ind_verificado_garantia_au_au: boolToSiNo(informe?.indVerificadoGarantia),
      ind_verificado_crs_au_au: boolToSiNo(informe?.indVerificadoCrs),
      observacion_formalidades_au_au: textoFormalidades,
      plazo_ejecucion_oferta_ganadora_au_au: informe?.plazoEjecucionOfertaGanadora ?? '___',
    };
  }

  async generarInformeRecomendacion(expedienteId: string, userId: string) {
    const data = await this.getDatosInformeRecomendacion(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'INFORME_RECOMENDACION',
      'informe-recomendacion-template.docx',
      userId,
      data,
    );
  }

  // =========================================================================

  private extractCloudinaryPublicId(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // FASE 4 — Adjudicación, Contrato Formalizado y Notificaciones
  // =========================================================================

  private async getFirmasExpediente(expediente: any) {
    const autoridad = expediente.autoridad;
    const esDelegado = expediente.autoridadFirmaComoDelegado;

    return {
      nom_completo_autoridad: esDelegado ? '' : autoridad?.nombreCompletoAutoridad || '___',
      cedula_autoridad: esDelegado ? '' : autoridad?.cedulaAutoridad || '___',
      cargo_oficial_autoridad: esDelegado ? '' : autoridad?.cargoOficialAutoridad || '___',
      datos_designacion_autoridad: esDelegado ? '' : autoridad?.datosDesignacionAutoridad || '___',
      leyes_atribuciones_suscribir_autoridad: esDelegado
        ? ''
        : autoridad?.leyesAtribucionesSuscribirAutoridad || '___',

      nom_completo_delegado: esDelegado ? autoridad?.nombreCompletoDelegado || '___' : '',
      cedula_delegado: esDelegado ? autoridad?.cedulaDelegado || '___' : '',
      cargo_oficial_delegado: esDelegado ? autoridad?.cargoOficialDelegado || '___' : '',
      datos_designacion_delegado: esDelegado ? autoridad?.datosDesignacionDelegado || '___' : '',
      leyes_atribuciones_suscribir_delegado: esDelegado
        ? autoridad?.leyesAtribucionesSuscribirDelegado || '___'
        : '',
    };
  }

  async getDatosAdjudicacion(expedienteId: string) {
    const adjudicacion = await this.prisma.adjudicacion.findUnique({
      where: { expedienteId },
      include: {
        expediente: {
          include: {
            autoridad: true,
            ente: true,
            cronograma: true,
            fasePreparatoria: true,
            modalidad: true,
          },
        },
        ofertaGanadora: {
          include: { evaluacion: true },
        },
      },
    });

    if (!adjudicacion) throw new NotFoundException('Adjudicación no encontrada');

    const firmas = await this.getFirmasExpediente(adjudicacion.expediente);
    const exp = adjudicacion.expediente;
    const crono = exp.cronograma;
    const fasePrep = exp.fasePreparatoria;

    // Criterios fijos por tipo
    const tipoContratacion = exp.modalidad?.tipoContratacion || 'SERVICIOS';
    const criteriosPorTipo: Record<string, string[]> = {
      BIENES: [
        'Tiempo de entrega a partir de la recepción de la Orden de compra.',
        'Garantía de los insumos.',
        'Características de los insumos.',
        'Disponibilidad de los insumos requeridos.',
      ],
      SERVICIOS: [
        'Plan de trabajo y metodología propuesta.',
        'Perfil del personal Técnico clave.',
        'Disponibilidad de Equipos y Herramientas.',
        'Tiempo de respuesta ante fallas.',
      ],
      OBRAS: [
        'Cronograma de Ejecución y Plan de Trabajo.',
        'Experiencia de Ingeniero Residente.',
        'Maquinaria y Equipos disponibles (propios / alquilados).',
        'Memoria Descriptiva / Metodología de Ejecución.',
      ],
    };
    const criterios = criteriosPorTipo[tipoContratacion] || criteriosPorTipo['SERVICIOS'];

    return {
      ...firmas,
      nom_ente_contratante: exp.ente?.nombre || '___',
      cod_nomenclatura_proceso: exp.codigoNomenclatura || '___',
      cod_nomenclatura_proceso_au_au: exp.codigoNomenclatura || '___',
      desc_objeto_contratacion: exp.descripcionObjeto || '___',
      desc_objeto_contratacion_au_au: exp.descripcionObjeto || '___',
      normativa_legal: fasePrep?.normativaLegal || 'Decreto de Ley de Contrataciones vigente',

      fec_llamado_participar_au_au: crono?.fechaLlamadoParticipar
        ? formatDateToSpanishLong(crono.fechaLlamadoParticipar)
        : '___',
      fec_acto_recep_aper_sobres_au_au: crono?.fechaActoRecepcionAperturaSobres
        ? formatDateToSpanishLong(crono.fechaActoRecepcionAperturaSobres)
        : '___',
      dir_fiscal_ente: exp.ente?.direccionFiscal || '___',
      fec_limite_evaluacion_au_au: crono?.fechaLimiteEvaluacion
        ? formatDateToSpanishLong(crono.fechaLimiteEvaluacion)
        : '___',
      fec_limite_adjudicacion_au_au: crono?.fechaLimiteAdjudicacion
        ? formatDateToSpanishLong(crono.fechaLimiteAdjudicacion)
        : '___',
      loc_ciudad_ente: exp.ente?.ciudad || '___',

      criterio_1_evaluacion_au_au: criterios[0] || '___',
      criterio_2_evaluacion_au_au: criterios[1] || '___',
      criterio_3_evaluacion_au_au: criterios[2] || '___',
      criterio_4_evaluacion_au_au: criterios[3] || '___',

      oferente_primera_opción_au_au:
        adjudicacion.ofertaGanadora?.evaluacion?.nombreProveedorEvaluado ||
        adjudicacion.ofertaGanadora?.nombreProveedorOferente ||
        '___',
      rif_proveedor_evaluado_au_au:
        adjudicacion.ofertaGanadora?.evaluacion?.rifProveedorEvaluado ||
        adjudicacion.ofertaGanadora?.rifProveedorOferente ||
        '___',

      monto_adjudicado_bs_au_au: formatCurrencyVE(Number(adjudicacion.montoAdjudicadoBs)),
      partida_presupuest_gasto_au_au: adjudicacion.partidaPresupuestariaGasto || '___',
      monto_crs_bs_au_au: formatCurrencyVE(Number(adjudicacion.montoCrsBs)),
      referencia_recomendacion_au_au: adjudicacion.referenciaRecomendacion || '___',

      // Mapeo adaptado para el loop {#adquirientes} que solicita la plantilla para mostrar la partida
      adquirientes: [
        {
          codigo_partida_au_au: adjudicacion.partidaPresupuestariaGasto || '___',
          total_items_au_au: formatCurrencyVE(Number(adjudicacion.montoAdjudicadoBs)),
        },
      ],
    };
  }

  async generarAdjudicacion(expedienteId: string, userId: string) {
    const data = await this.getDatosAdjudicacion(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'ACTA_ADJUDICACION',
      'acta-adjudicacion-template.docx',
      userId,
      data,
    );
  }

  async getDatosContrato(expedienteId: string) {
    const contrato = await this.prisma.contratoFormalizado.findFirst({
      where: { adjudicacion: { expedienteId } },
      include: {
        adjudicacion: {
          include: {
            ofertaGanadora: { include: { evaluacion: true } },
            expediente: {
              include: { modalidad: true, autoridad: true, ente: true, cronograma: true },
            },
          },
        },
      },
    });

    if (!contrato) throw new NotFoundException('Contrato Formalizado no encontrado');

    const exp = contrato.adjudicacion.expediente;
    const adjudicacion = contrato.adjudicacion;
    const firmas = await this.getFirmasExpediente(exp);
    const tipo = exp.modalidad?.tipoContratacion || 'SERVICIOS';

    let soporteEjecucion = '___';
    if (tipo === 'BIENES') soporteEjecucion = 'El Acta de Entrega y Recepción Conforme';
    else if (tipo === 'SERVICIOS')
      soporteEjecucion =
        'El Informe de Actividades o la certificación de cumplimiento del servicio correspondiente al período';
    else if (tipo === 'OBRAS') soporteEjecucion = 'La Valuación de Obra ejecutada';

    let textoGarantiaLaboral = '';
    if (contrato.requiereGarantiaLaboral) {
      textoGarantiaLaboral = `c) Garantía Laboral (si aplica): “LA CONTRATISTA” deberá constituir a favor y a satisfacción de “EL CONTRATANTE”, debidamente autenticada y emitida por una Institución Bancaria o Compañía de Seguros debidamente inscrita por ante la Superintendencia respectiva o Sociedad Nacional de Garantías Recíprocas para la Mediana y Pequeña Industria, por un monto equivalente al ${Number(contrato.porcentajeGarantiaLaboral)}% del costo total de la mano de obra mensual incluida en la estructura de costos de su oferta, la fianza es de ${formatCurrencyVE(Number(contrato.montoGarantiaLaboralBs))} bolívares la cual deberá permanecer vigente por la duración del contrato y/o que se verifique el definitivo cumplimiento de la obligación afianzada, de acuerdo al artículo 124 del Decreto con Rango, Valor y Fuerza de Ley de Contrataciones Públicas.`;
    }

    let textoRespCivil = '';
    if (contrato.polizaResponsabilidadCivil) {
      textoRespCivil = `d) Póliza de Responsabilidad Civil: “LA CONTRATISTA” se obliga a constituir y mantener vigente durante todo el plazo de ejecución del contrato, una Póliza de Responsabilidad Civil que ampare los daños, pérdidas o perjuicios que pudieren ocasionarse a personas o a la propiedad de terceros, con ocasión de ${exp.descripcionObjeto || '___'}. Dicha cobertura deberá incluir, sin limitarse a, los daños derivados de los trabajos, el uso de maquinaria, las acciones del personal del contratista y, en caso de que aplique a la naturaleza del servicio, la Responsabilidad Civil Profesional por errores u omisiones. La póliza deberá ser emitida por una empresa de seguros de reconocida solvencia en la República, por un monto no menor a ${formatCurrencyVE(Number(contrato.montoResponsabilidadCivilBs))}. o al ${Number(contrato.porcentajeResponsabilidadCivil)} % del Contrato. Este instrumento deberá ser consignado y aprobado por “EL CONTRATANTE” antes de la firma del Acta de Inicio. El incumplimiento de esta obligación será causal de decaimiento de la adjudicación, sin que ello genere derecho a indemnización alguna para “LA CONTRATISTA”.`;
    }

    let textoAnticipo = '';
    if (contrato.anticipoContrato) {
      textoAnticipo = `b) Garantía de Anticipo: En caso de que “EL CONTRATANTE” otorgue un anticipo, el cual no podrá exceder el 50% del monto del contrato conforme al artículo 122 de la Ley de Contrataciones Públicas, “LA CONTRATISTA” deberá constituir previamente una garantía por el cien por ciento (100%) del monto otorgado. Dicha garantía deberá mantenerse vigente hasta la total amortización del anticipo, la cual se efectuará mediante deducciones proporcionales en los pagos correspondientes.`;
    }

    return {
      ...firmas,
      nom_ente_contratante: exp.ente?.nombre || '___',
      organo_adscripcion: exp.ente?.organoAdscripcion || '___',
      rif_ente: exp.ente?.rif || '___',
      loc_ciudad_ente: exp.ente?.ciudad || '___',

      cod_nomenclatura_proceso_au_au: exp.codigoNomenclatura || '___',
      desc_objeto_contratacion_au_au: exp.descripcionObjeto || '___',

      oferente_primera_opción_au_au:
        adjudicacion.ofertaGanadora?.evaluacion?.nombreProveedorEvaluado ||
        adjudicacion.ofertaGanadora?.nombreProveedorOferente ||
        '___',
      rif_proveedor_evaluado_au_au:
        adjudicacion.ofertaGanadora?.evaluacion?.rifProveedorEvaluado ||
        adjudicacion.ofertaGanadora?.rifProveedorOferente ||
        '___',
      datos_registro_mercantil_proveedor_evaluado_au_au:
        adjudicacion.ofertaGanadora?.datosRegistroMercantilProveedorOferente || '___',
      nombre_rep_legal_evaluado_au_au:
        adjudicacion.ofertaGanadora?.evaluacion?.nombreRepLegalEvaluado ||
        adjudicacion.ofertaGanadora?.nombreRepLegalOferente ||
        '___',
      cedula_rep_legal_evaluado_au_au:
        adjudicacion.ofertaGanadora?.evaluacion?.cedulaRepLegalEvaluado ||
        adjudicacion.ofertaGanadora?.cedulaRepLegalOferente ||
        '___',

      fec_inicio_vigencia_au_au: contrato.fechaInicioVigencia
        ? formatDateToSpanishLong(contrato.fechaInicioVigencia)
        : '___',
      fec_fin_vigencia_au_au: contrato.fechaFinVigencia
        ? formatDateToSpanishLong(contrato.fechaFinVigencia)
        : '___',
      fec_limite_firma_contrato_au_au: exp.cronograma?.fechaLimiteFirmaContrato
        ? formatDateToSpanishLong(exp.cronograma.fechaLimiteFirmaContrato)
        : '___',

      monto_contrato_bs_au_au: formatCurrencyVE(Number(contrato.montoContratoBs)),
      valor_ucau_contrato_au_au: formatCurrencyVE(Number(contrato.valorUcauContrato)),

      plazo_ejecucion_dias_au_au: contrato.plazoEjecucionDias || '___',

      plazo_garantia_calidad_funcionamiento_au_au:
        contrato.plazoGarantiaCalidadFuncionamiento || '___',
      soporte_ejecucion_contrato_au_au: soporteEjecucion,

      nombre_supervisor_au_au: contrato.nombreSupervisor || '___',
      cedula_supervisor_au_au: contrato.cedulaSupervisor || '___',
      cargo_supervisor_au_au: contrato.cargoSupervisor || '___',
      criterio_aceptacion_contrato_au_au: contrato.criterioAceptacionContrato || '___',
      plazo_consignacion_facturas_au_au: contrato.plazoConsignacionFacturas || '___',

      monto_fiel_cumplimiento_bs_au_au: formatCurrencyVE(Number(contrato.montoFielCumplimientoBs)),
      garantia_laboral_au_au: textoGarantiaLaboral,
      poliza_responsabilidad_civil_au_au: textoRespCivil,
      anticipo_contrato_au_au: textoAnticipo,

      forma_cumplimiento_crs_au_au: contrato.formaCumplimientoCrs || '___',
      unidad_resp_cumplimiento_crs_au_au: contrato.unidadRespCumplimientoCrs || '___',

      porcentaje_multa_diaria_au_au: contrato.porcentajeMultaDiaria || '___',
      base_calculo_multa_diaria_au_au: formatCurrencyVE(Number(contrato.baseCalculoMultaDiaria)),
      plazo_regularizar_incumplimiento_au_au: contrato.plazoRegularizarIncumplimiento || '___',
      porcentaje_procedimiento_rescision_au_au: contrato.porcentajeProcedimientoRescision || '___',
      formula_ajuste_precios_au_au: contrato.formulaAjustePrecios || '___',

      evaluacion_desempeño_au_au: contrato.evaluacionDesempeno || '___',
      garantia_post_ejecucion_au_au: contrato.garantiaPostEjecucion || '___',
      lugar_tribunal_au_au: contrato.lugarTribunal || '___',

      adquirientes: [
        {
          codigo_partida_au_au: adjudicacion.partidaPresupuestariaGasto || '___',
          total_items_au_au: formatCurrencyVE(Number(contrato.montoContratoBs)),
        },
      ],
    };
  }

  async generarContrato(expedienteId: string, userId: string) {
    const data = await this.getDatosContrato(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'CONTRATO',
      'contrato-formalizado-template.docx',
      userId,
      data,
    );
  }

  async generarNotificacionesFase4(expedienteId: string, userId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        cronograma: true,
        comision: {
          include: { miembros: true },
        },
      },
    });

    if (!expediente) throw new NotFoundException('Expediente no encontrado');

    const secretaria = expediente.comision?.miembros?.find((m) => m.tipoMiembro === 'SECRETARIO');

    const commonData = {
      nom_ente_contratante: expediente.ente?.nombre || '___',
      cod_nomenclatura_proceso_au_au: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion_au_au: expediente.descripcionObjeto || '___',
      loc_ciudad_ente: expediente.ente?.ciudad || '___',
      fec_limite_notificacion_au_au: expediente.cronograma?.fechaLimiteNotificacion
        ? formatDateToSpanishLong(expediente.cronograma.fechaLimiteNotificacion)
        : '___',
      nom_completo_miembro_secretaria: secretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: secretaria?.cedulaMiembro || '___',
      datos_designacion_comision: expediente.comision?.datosDesignacionComision || '___',
      fec_limite_adjudicacion_au_au: expediente.cronograma?.fechaLimiteAdjudicacion
        ? formatDateToSpanishLong(expediente.cronograma.fechaLimiteAdjudicacion)
        : '___',
    };

    const evaluaciones = await this.prisma.evaluacionResultados.findMany({
      where: { oferta: { expedienteId } },
      include: { oferta: true },
    });

    const ganadora = evaluaciones.find((e) => e.posicionPrelacion === 'Primera Opción');
    const perdedoras = evaluaciones.filter(
      (e) => e.posicionPrelacion && e.posicionPrelacion !== 'Primera Opción',
    );

    const documentosGenerados: any[] = [];

    // Generar Notificación Adjudicado
    if (ganadora) {
      const dataAdjudicado = {
        ...commonData,
        oferente_primera_opción_au_au: ganadora.nombreProveedorEvaluado || '___',
        rif_proveedor_evaluado_au_au: ganadora.rifProveedorEvaluado || '___',
        correo_proveedor_evaluado_au_au: ganadora.oferta.proveedorId
          ? (await this.prisma.proveedor.findUnique({ where: { id: ganadora.oferta.proveedorId } }))
              ?.correo || '___'
          : '___',
      };

      const res = await this.generarDocumento(
        expedienteId,
        'NOTIFICACION_ADJUDICADO',
        'notificacion-adjudicado-template.docx',
        userId,
        dataAdjudicado,
        ganadora.id,
      );
      documentosGenerados.push(res);
    }

    // Generar Notificaciones No Adjudicados
    for (const perdedora of perdedoras) {
      const dataNoAdjudicado = {
        ...commonData,
        oferente_no_adjudicado_au_au: perdedora.nombreProveedorEvaluado || '___',
        oferente_primera_opción_au_au: ganadora?.nombreProveedorEvaluado || '___',
        rif_proveedor_evaluado_au_au: perdedora.rifProveedorEvaluado || '___',
        correo_proveedor_evaluado_au_au: perdedora.oferta.proveedorId
          ? (
              await this.prisma.proveedor.findUnique({
                where: { id: perdedora.oferta.proveedorId },
              })
            )?.correo || '___'
          : '___',
      };

      const res = await this.generarDocumento(
        expedienteId,
        'NOTIFICACION_NO_ADJUDICADO',
        'notificacion-no-adjudicado-template.docx',
        userId,
        dataNoAdjudicado,
        perdedora.id,
      );
      documentosGenerados.push(res);
    }

    return documentosGenerados;
  }
}
