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
      case 'INFORME_RECOMENDACION':
        return this.generarInformeRecomendacion(docAnterior.expedienteId, userId);
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
}
