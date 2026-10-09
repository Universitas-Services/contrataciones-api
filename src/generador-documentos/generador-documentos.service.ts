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
import { Prisma, TipoDocumento, EstadoMicromodulo } from '@prisma/client';
import { MICROMODULO_KEYS, MICROMODULOS } from '../fase1/constants/micromodulos.constants';
import { mapDatosPliegoCondiciones } from './mappers/pliego-condiciones.mapper';
import { mapOferentesDesierto } from './mappers/informe-desierto.mapper';
import { RECAUDOS_CATALOGO } from '../fase1/constants/recaudos-legales.constants';
import {
  esPrimeraOpcion,
  prelacionEfectiva,
} from '../evaluacion-fase3/gestion-adjudicacion/prelacion.util';

function formatNormativaLegalForDoc(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return 'Decreto de Ley de Contrataciones vigente';
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.join(', ');
      }
    } catch {
      // Ignore JSON parse error and fallback to raw trimmed string
    }
  }
  return trimmed;
}

@Injectable()
export class GeneradorDocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject('IStorageService') private storage: IStorageService,
  ) {}

  /**
   * Obtiene la estructura JSON mapeada para el Acta de Inicio.
   * Gate: debe existir pliego generado (PliegoGenerado o DocumentoGenerado PLIEGO_CONDICIONES).
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

    await this.assertPliegoGenerado(expedienteId, 'el Acta de Inicio');

    const { ente, comision, unidadUsuaria, fasePreparatoria, modalidad, cronograma } = expediente;

    const getMiembro = (area: string) => {
      return comision?.miembros?.find((m) => m.areaRepresentacion === area) || null;
    };

    const miembroJuridica = getMiembro('AREA_JURIDICA');
    const miembroEconomica = getMiembro('AREA_ECONOMICA_FINANCIERA');
    const miembroTecnica = getMiembro('AREA_TECNICA');
    const miembroSecretaria = getMiembro('SECRETARIO_A');

    const siNo = (v: boolean | null | undefined): string => {
      if (v === true) return 'SÍ';
      if (v === false) return 'NO';
      return '___';
    };

    const justificacionMarco = fasePreparatoria.justificacion_contrato_marco_au_au || '___';
    let viabilidadContratoMarcoTexto: string;
    if (fasePreparatoria.viabilidadContratoMarco === true) {
      viabilidadContratoMarcoTexto = `Se deja constancia de la evaluación realizada en las actividades previas respecto a la posibilidad de agrupar la presente contratación o utilizar la figura del contrato marco, según lo establecido en el Art. 24 (j) de las Normas SUNAI, concluyendo lo siguiente: ${justificacionMarco}`;
    } else if (fasePreparatoria.viabilidadContratoMarco === false) {
      viabilidadContratoMarcoTexto =
        'Se deja constancia de la evaluación realizada en las actividades previas respecto a la posibilidad de agrupar la presente contratación o utilizar la figura del contrato marco, según lo establecido en el Art. 24 (j) de las Normas SUNAI, concluyendo que no resulta viable ni procedente su aplicación dadas las características y necesidades específicas de esta contratación.';
    } else {
      viabilidadContratoMarcoTexto = '___';
    }

    return {
      nom_ente_contratante: ente?.nombre || '___',
      cod_nomenclatura_proceso_au_au: expediente.codigoNomenclatura || '___',
      loc_ciudad_ente: ente?.ciudad || '___',
      fec_acta_inicio_au_au: formatDateToSpanishLong(
        expediente.fechaActaInicio ?? fasePreparatoria.fechaActaInicio,
      ),
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
      desc_objeto_contratacion_au_au: expediente.descripcionObjeto || '___',
      id_unidad_usuaria: unidadUsuaria?.nombreUnidadUsuaria || '___',

      monto_estimado_bs: formatCurrencyVE(Number(modalidad?.montoEstimadoBs)),
      valor_ucau_base: formatCurrencyVE(Number(modalidad?.valorUcauBase)),

      condicion_plurianual_au_au: siNo(fasePreparatoria.condicionPlurianual),

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

      viabilidad_contrato_marco_au_au: viabilidadContratoMarcoTexto,
      tipo_objeto_contratacion: modalidad?.tipoContratacion || '___',
      tasa_referencial_bcv: expediente.tasaReferencialBcv
        ? Number(expediente.tasaReferencialBcv).toFixed(4)
        : '___',
    };
  }

  /**
   * Gate Fase 1: Acta / Llamado requieren pliego generado
   * (PliegoGenerado o DocumentoGenerado PLIEGO_CONDICIONES).
   */
  private async assertPliegoGenerado(expedienteId: string, documentoLabel: string): Promise<void> {
    const [pliegoGenerado, docPliego] = await Promise.all([
      this.prisma.pliegoGenerado.findFirst({
        where: { expedienteId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.documentoGenerado.findFirst({
        where: {
          expedienteId,
          tipoDocumento: 'PLIEGO_CONDICIONES',
          deletedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!pliegoGenerado && !docPliego) {
      throw new BadRequestException(
        `Debe existir un Pliego de Condiciones generado antes de elaborar ${documentoLabel}`,
      );
    }
  }

  /**
   * Obtiene la estructura JSON mapeada para el Llamado a Participar.
   * Gate: debe existir pliego generado (igual que Acta / progress Fase 1).
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

    await this.assertPliegoGenerado(expedienteId, 'el Llamado a Participar');

    const e = expediente;
    const f = expediente.fasePreparatoria;
    const c = expediente.cronograma;

    // DATOS LLAMADOS: pliego_costo SÍ = tiene costo; en Prisma pliegoGratuito=true = sin costo
    let pliegoCostoTexto = 'Costo del Pliego: Sin costo.';
    if (!f.pliegoGratuito) {
      const costoBs = f.costoPliegoBs ? formatCurrencyVE(Number(f.costoPliegoBs)) : '0,00';
      pliegoCostoTexto = `El COSTO para la adquisición de dicho pliego es de Bs. ${costoBs} (No reembolsables) a ser depositados en la cuenta del Banco ${f.bancoPagoPliego || '___'} Nº ${f.cuentaPagoPliego || '___'} (RIF: ${f.rifPagoPliego || '___'}) a favor de ${f.titularPagoPliego || '___'}`;
    }

    const horarioRetiro = f.horarioRetiroPliego || '___';
    const direccionRetiro = f.direccionRetiroPliego || '___';

    return {
      nom_ente_contratante: e.ente?.nombre || '___',
      // Tokens plantilla nueva
      cod_nomenclatura_proceso_au_au: e.codigoNomenclatura || '___',
      desc_objeto_contratacion_au_au: e.descripcionObjeto || '___',
      direccion_retiro_pliego_au_au: direccionRetiro,
      horario_retiro_pliego_au_au: horarioRetiro,
      // Misma clave sin _au_au (aparece en sección aclaratorias de la plantilla)
      horario_retiro_pliego: horarioRetiro,
      direccion_retiro_pliego: direccionRetiro,
      // Alias legacy por si alguna plantilla vieja aún los usa
      cod_nomenclatura_proceso: e.codigoNomenclatura || '___',
      desc_objeto_contratacion: e.descripcionObjeto || '___',

      objetivos_especificos_llamado_1_au_au: f.objetivosEspecificos1 || '___',
      objetivos_especificos_llamado_2_au_au: f.objetivosEspecificos2 || '___',
      objetivos_especificos_llamado_3_au_au: f.objetivosEspecificos3 || '___',
      fec_acto_recep_aper_sobres_au_au: c.fechaActoRecepcionAperturaSobres
        ? formatDateToSpanishLong(c.fechaActoRecepcionAperturaSobres)
        : '___',
      hora_acto_recep_aper_au_au: f.horaActoRecepAper || '___',
      dir_fiscal_ente: e.ente?.direccionFiscal || '___',
      fec_inicio_disponibilidad_pliego_au_au: c.fechaInicioDisponibilidadPliego
        ? formatDateToSpanishLong(c.fechaInicioDisponibilidadPliego)
        : '___',
      fec_fin_disponibilidad_pliego_au_au: c.fechaFinDisponibilidadPliego
        ? formatDateToSpanishLong(c.fechaFinDisponibilidadPliego)
        : '___',
      correo_comision: e.comision?.correoElectronico || '___',
      telefono_comision: e.comision?.telefono || '___',
      pliego_costo_au_au: pliegoCostoTexto,
      pliego_gratuito_au_au: pliegoCostoTexto,
      fec_solicitud_aclaratorias_au_au: c.fechaSolicitudAclaratorias
        ? formatDateToSpanishLong(c.fechaSolicitudAclaratorias)
        : '___',
      fec_respuesta_aclaratorias_au_au: c.fechaRespuestaAclaratorias
        ? formatDateToSpanishLong(c.fechaRespuestaAclaratorias)
        : '___',
    };
  }

  /**
   * Obtiene la estructura JSON mapeada para el Requerimiento de Actividades Previas.
   * Gate: micromódulo actividades-previas debe estar COMPLETADO.
   */
  async getDatosActividadesPrevias(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        unidadUsuaria: true,
        fasePreparatoria: true,
        modalidad: true,
        comision: { include: { miembros: true } },
        presupuestoItems: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);
    if (!expediente.fasePreparatoria) {
      throw new NotFoundException('Fase preparatoria incompleta para este expediente');
    }

    const f = expediente.fasePreparatoria;
    if (f.estadoActividadesPrevias !== 'COMPLETADO') {
      throw new BadRequestException(
        'El micromódulo Actividades Previas debe estar COMPLETADO para generar el requerimiento',
      );
    }

    const siNo = (v: boolean | null | undefined): string => {
      if (v === true) return 'SÍ';
      if (v === false) return 'NO';
      return '___';
    };

    const tipo = expediente.modalidad?.tipoContratacion;
    const tipoObjetoLabel =
      tipo === 'BIENES'
        ? 'Bienes'
        : tipo === 'SERVICIOS'
          ? 'Servicios'
          : tipo === 'OBRAS'
            ? 'Obras'
            : tipo === 'MIXTO'
              ? 'Mixto'
              : '___';

    let categorizacion = '___';
    if (tipo === 'BIENES') {
      categorizacion = 'ADQUISICIÓN DE MATERIALES O BIENES (X)';
    } else if (tipo === 'SERVICIOS') {
      categorizacion = 'PRESTACIÓN DE SERVICIOS (X)';
    } else if (tipo === 'OBRAS') {
      categorizacion = `EJECUCIÓN DE OBRAS (X)\nPROYECTO APROBADO: ${siNo(f.proyectoAprobado)}`;
    } else if (tipo === 'MIXTO') {
      categorizacion = 'CONTRATACIÓN MIXTA (X)';
    }

    const tipoContrato =
      tipo === 'BIENES'
        ? 'Orden de Compra'
        : tipo === 'SERVICIOS'
          ? 'Orden de Servicio'
          : tipo === 'OBRAS'
            ? 'Valuación'
            : tipo === 'MIXTO'
              ? 'Orden de Compra / Orden de Servicio / Valuación'
              : '___';

    const textoVan = f.requiereVan
      ? 'sí se incorporarán estos mecanismos de preferencia en la matriz de evaluación del procedimiento.'
      : 'no se incorporarán estos mecanismos de preferencia en la matriz de evaluación del procedimiento.';

    const textoPrefLocal = f.indPrefLocal
      ? 'sí se incorporará el mecanismo de preferencia por regionalización, a aquellos oferentes cuyo domicilio fiscal principal y base operativa se encuentren ubicados en el Municipio de ejecución del objeto, con el fin de fortalecer el tejido productivo local.'
      : 'no se incorporará el mecanismo de preferencia por regionalización, debido a que la naturaleza técnica del objeto o la oferta de mercado existente en la localidad no permite garantizar la pluralidad de oferentes bajo este criterio territorial.';

    const justificacionNoPymes = f.justificacionPermitePymesCooperativas || '___';
    const textoPymes = f.permitePymesCooperativas
      ? 'si es compatible con la escala operativa de PyMES y Cooperativas, garantizando su plena inclusión en el procedimiento y la aplicación de los márgenes de preferencia legal destinados a fomentar la democratización del gasto público.'
      : `no es compatible con la escala operativa de PyMES y Cooperativas, en virtud de los requerimientos específicos que demanda la ejecución del objeto, fundamentándose técnicamente por: ${justificacionNoPymes}.`;

    // Sección condicional: visible si hay al menos un mecanismo de promoción
    const activaPromocionEconomica = Boolean(
      f.requiereVan || f.indPrefLocal || f.permitePymesCooperativas,
    );

    let viabilidadMarco = '___';
    if (f.viabilidadContratoMarco === true) {
      viabilidadMarco = f.justificacion_contrato_marco_au_au
        ? `SÍ. ${f.justificacion_contrato_marco_au_au}`
        : 'SÍ';
    } else if (f.viabilidadContratoMarco === false) {
      viabilidadMarco = f.justificacion_contrato_marco_au_au
        ? `NO. ${f.justificacion_contrato_marco_au_au}`
        : 'NO';
    }

    const formatoEspecializado =
      f.requiereEspecializado === true
        ? f.detalleEspecializado
          ? `SÍ. ${f.detalleEspecializado}`
          : 'SÍ'
        : f.requiereEspecializado === false
          ? 'NO'
          : '___';

    const formatoMuestras =
      f.requiereMuestras === true
        ? f.detalleProcedimientoMuestras
          ? `SÍ. ${f.detalleProcedimientoMuestras}`
          : 'SÍ'
        : f.requiereMuestras === false
          ? 'NO'
          : '___';

    const items = expediente.presupuestoItems || [];
    const subtotalNum = items.reduce((acc, item) => acc + Number(item.totalItem || 0), 0);
    const ivaNum = subtotalNum * 0.16;

    const getMiembro = (area: string) =>
      expediente.comision?.miembros?.find((m) => m.areaRepresentacion === area) || null;

    const miembroJuridica = getMiembro('AREA_JURIDICA');
    const miembroEconomica = getMiembro('AREA_ECONOMICA_FINANCIERA');
    const miembroTecnica = getMiembro('AREA_TECNICA');
    const miembroSecretaria = getMiembro('SECRETARIO_A');

    return {
      nom_ente_contratante: expediente.ente?.nombre || '___',
      nom_unidad_usuaria: expediente.unidadUsuaria?.nombreUnidadUsuaria || '___',
      nom_responsable_unidad_usuaria:
        expediente.unidadUsuaria?.nombreResponsableUnidadUsuaria || '___',
      cargo_responsable_unidad_usuaria:
        expediente.unidadUsuaria?.cargoResponsableUnidadUsuaria || '___',

      tipo_objeto_contratacion: tipoObjetoLabel,
      num_referencia_snc_au_au: f.numReferenciaSnc || '___',
      modif_requerimiento_snc_au_au: siNo(f.modifRequerimientoSnc),
      numero_modif_requerimiento_snc_au_au: f.numeroModifRequerimientoSnc || '___',

      desc_objeto_contratacion_au_au: expediente.descripcionObjeto || '___',
      justificacion_necesidad_contratacion_au_au: f.justificacionNecesidadContratacion || '___',
      justificacion_ventajas_au_au: f.justificacionVentajas || '___',
      viabilidad_marco_agrupacion_au_au: viabilidadMarco,

      categorizacion_contratacion_au_au: categorizacion,
      proyecto_aprobado_au_au: siNo(f.proyectoAprobado),
      valor_ucau_base: formatCurrencyVE(Number(expediente.modalidad?.valorUcauBase)),
      monto_estimado_bs: formatCurrencyVE(Number(expediente.modalidad?.montoEstimadoBs)),
      sub_total: formatCurrencyVE(subtotalNum),
      monto_total_renglon_au_au: formatCurrencyVE(subtotalNum + ivaNum),
      fec_estudio_mercado_au_au: formatToDDMMYYYY(f.fecEstudioMercado),
      num_certificacion_presupuestaria_au_au: f.numCertificacionPresupuestaria || '___',

      plazo_ejecucion_procedimiento_au_au:
        f.plazoEjecucionProcedimiento != null ? `${f.plazoEjecucionProcedimiento} días` : '___',
      lugar_logistica_ejecucion_au_au: f.lugarLogisticaEjecucion || '___',
      requiere_especializado_au_au: formatoEspecializado,
      requiere_muestras_au_au: formatoMuestras,

      activa_promocion_economica_au_au: activaPromocionEconomica,
      requiere_van_au_au: textoVan,
      ind_pref_local_au_au: textoPrefLocal,
      permite_pymes_cooperativas_au_au: textoPymes,
      justificacion_permite_pymes_cooperativas_au_au: justificacionNoPymes,

      tipo_contrato: tipoContrato,
      requiere_garantia_laboral_au_au: siNo(f.requiereGarantiaLaboral),
      poliza_responsabilidad_civil_au_au: siNo(f.polizaResponsabilidadCivil),
      anticipo_contrato_au_au: siNo(f.anticipoContrato),
      porcentaje_mantenimiento_oferta_au_au:
        f.porcentajeMantenimientoOferta != null
          ? formatCurrencyVE(Number(f.porcentajeMantenimientoOferta))
          : '___',
      porcentaje_fiel_cumplimiento_au_au:
        f.porcentajeFielCumplimiento != null
          ? formatCurrencyVE(Number(f.porcentajeFielCumplimiento))
          : '___',
      porcentaje_garantia_laboral_au_au:
        f.porcentajeGarantiaLaboral != null
          ? formatCurrencyVE(Number(f.porcentajeGarantiaLaboral))
          : '___',
      porcentaje_anticipo_au_au:
        f.porcentajeAnticipo != null ? formatCurrencyVE(Number(f.porcentajeAnticipo)) : '___',

      nom_completo_miembro_juridica: miembroJuridica?.nombreCompletoMiembro || '___',
      nom_completo_miembro_economica: miembroEconomica?.nombreCompletoMiembro || '___',
      nom_completo_miembro_tecnica: miembroTecnica?.nombreCompletoMiembro || '___',
      nom_completo_miembro_secretaria: miembroSecretaria?.nombreCompletoMiembro || '___',

      items_presupuesto: items.map((item, index) => ({
        num_renglon: index + 1,
        especificacion: item.descripcionItem,
        unidad_medida: item.unidadMedida,
        cantidad: formatCurrencyVE(Number(item.cantidadRequerida)),
        precio_unitario: formatCurrencyVE(Number(item.precioUnitarioEstimado)),
        sub_total: formatCurrencyVE(Number(item.totalItem)),
        monto_total_renglon: formatCurrencyVE(Number(item.totalItem)),
      })),
    };
  }

  /**
   * Obtiene la estructura JSON mapeada para el Pliego de Condiciones.
   * Gate: pliegoReady (micromódulos Fase 1 + especificaciones + presupuesto).
   */
  async getDatosPliegoCondiciones(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        fasePreparatoria: { include: { especificaciones: true } },
        cronograma: true,
        modalidad: true,
        comision: true,
        autoridad: true,
        presupuestoItems: { where: { deletedAt: null } },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);
    if (!expediente.fasePreparatoria) throw new NotFoundException('Fase preparatoria incompleta');
    if (!expediente.cronograma) throw new NotFoundException('Cronograma incompleto');
    if (!expediente.modalidad) throw new NotFoundException('Modalidad incompleta');

    await this.assertPliegoReady(expedienteId, expediente.fasePreparatoria);

    return mapDatosPliegoCondiciones(expediente);
  }

  /** Gate alineado a fase1.service: 8 micromódulos + especificaciones + >=1 ítem. */
  private async assertPliegoReady(expedienteId: string, fase: any): Promise<void> {
    const missing: string[] = [];
    for (const key of MICROMODULO_KEYS) {
      const estado = fase[MICROMODULOS[key].estadoField] as EstadoMicromodulo;
      if (estado !== EstadoMicromodulo.COMPLETADO) {
        missing.push(MICROMODULOS[key].etiqueta);
      }
    }
    const espec = fase.especificaciones;
    if (!espec || espec.deletedAt) {
      missing.push('Especificaciones Técnicas');
    }
    const totalItems = await this.prisma.presupuestoItem.count({
      where: { expedienteId, deletedAt: null },
    });
    if (totalItems === 0) {
      missing.push('Presupuesto base (al menos un ítem)');
    }
    if (missing.length > 0) {
      throw new BadRequestException(
        `El Pliego aún no está listo. Falta completar: ${missing.join(', ')}`,
      );
    }
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

    // Parchear loops anónimos {#}...{/} → {#items_presupuesto}...{/items_presupuesto}
    if (jsonData.items_presupuesto) {
      const docXml = zip.file('word/document.xml');
      if (docXml) {
        let xmlContent = docXml.asText();
        xmlContent = xmlContent.replace(/\{#\}/g, '{#items_presupuesto}');
        xmlContent = xmlContent.replace(/\{\/\}/g, '{/items_presupuesto}');
        zip.file('word/document.xml', xmlContent);
      }
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
    const doc = await this.generarDocumento(
      expedienteId,
      'PLIEGO_CONDICIONES',
      'pliego-condiciones-template.docx',
      userId,
      data,
    );

    // Fase1 progress / Acta miran PliegoGenerado (además de DocumentoGenerado)
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      select: { enteId: true, codigoNomenclatura: true },
    });
    if (expediente) {
      const existente = await this.prisma.pliegoGenerado.findFirst({
        where: { expedienteId, deletedAt: null },
      });
      if (existente) {
        await this.prisma.pliegoGenerado.update({
          where: { id: existente.id },
          data: {
            urlArchivo: doc.url,
            tituloPliego: `Pliego de Condiciones - ${expediente.codigoNomenclatura}`,
            versionDocumento: existente.versionDocumento + 1,
            estaDesactualizado: false,
            updatedBy: userId,
          },
        });
      } else {
        await this.prisma.pliegoGenerado.create({
          data: {
            enteId: expediente.enteId,
            expedienteId,
            urlArchivo: doc.url,
            tituloPliego: `Pliego de Condiciones - ${expediente.codigoNomenclatura}`,
            descripcion: `Pliego generado automáticamente para ${expediente.codigoNomenclatura}`,
            versionDocumento: 1,
            createdBy: userId,
          },
        });
      }
    }

    return doc;
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

  async generarActividadesPrevias(expedienteId: string, userId: string) {
    const data = await this.getDatosActividadesPrevias(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'ACTIVIDADES_PREVIAS',
      'requerimiento-actividades-previas-template.docx',
      userId,
      data,
    );
  }

  // =========================================================================
  // GESTIÓN DE PARTICIPANTES — Registro de Adquirentes, Recepción y Apertura
  // =========================================================================

  /**
   * Obtiene datos mapeados para el Registro de Adquirentes del Pliego.
   * Tokens alineados al prototipo registro-adquirentes-template.docx (14 marcadores).
   * Gate: al menos un adquirente activo en el expediente.
   */
  async getDatosRegistroAdquirentes(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        comision: { include: { miembros: true } },
        adquirientesPliego: {
          where: { deletedAt: null },
          include: { proveedor: { select: { nombre: true, rif: true } } },
          orderBy: { fechaAdquisicion: 'asc' },
        },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    if (expediente.adquirientesPliego.length === 0) {
      throw new BadRequestException(
        'Debe registrar al menos un adquirente del pliego antes de generar el documento.',
      );
    }

    const { comision } = expediente;

    const secretario =
      comision?.miembros?.find(
        (m) => m.areaRepresentacion === 'SECRETARIO_A' && m.tipoMiembro === 'MIEMBRO_PRINCIPAL',
      ) || null;

    return {
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
      // Loop {#adquirientes} — nombre con "i" para coincidir con la plantilla
      adquirientes: expediente.adquirientesPliego.map((adq, index) => ({
        numero: index + 1,
        fec_adquisicion_pliego_au_au: formatToDDMMYYYY(adq.fechaAdquisicion),
        nombre_proveedor_adquiriente_au_au:
          adq.nombreProveedorAdquiriente || adq.proveedor?.nombre || '___',
        direccion_fiscal_proveedor_adquirente_au_au:
          adq.direccionFiscalProveedorAdquirente || '___',
        telefono_proveedor_adquirente_au_au: adq.telefonoProveedorAdquirente || '___',
        correo_proveedor_adquirente_au_au: adq.correoProveedorAdquirente || '___',
        // Opcional en el formulario: vacío si no hay depósito/transferencia
        datos_pago_pliego_au_au: adq.datosPagoPliego || '',
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
   * Solo 15 tokens de cabecera/comisión/firma. La tabla de oferentes queda vacía
   * a propósito (imprimir y llenar a mano), por eso no exige oferentes registrados.
   */
  async getDatosActaRecepcionSobres(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        fasePreparatoria: true,
        cronograma: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const { ente, comision, fasePreparatoria, cronograma } = expediente;
    const getMiembroPrincipal = (area: string) =>
      comision?.miembros?.find(
        (m) => m.areaRepresentacion === area && m.tipoMiembro === 'MIEMBRO_PRINCIPAL',
      ) || null;

    const juridica = getMiembroPrincipal('AREA_JURIDICA');
    const economica = getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA');
    const tecnica = getMiembroPrincipal('AREA_TECNICA');
    const secretaria = getMiembroPrincipal('SECRETARIO_A');

    return {
      hora_acto_recep_aper_au_au: fasePreparatoria?.horaActoRecepAper || '___',
      fec_acto_recep_aper_sobres_au_au: formatDateToSpanishLong(
        cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      dir_fiscal_ente: ente?.direccionFiscal || '___',
      nom_ente_contratante: ente?.nombre || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
      nom_completo_miembro_juridica: juridica?.nombreCompletoMiembro || '___',
      cedula_miembro_juridica: juridica?.cedulaMiembro || '___',
      nom_completo_miembro_economica: economica?.nombreCompletoMiembro || '___',
      cedula_miembro_economica: economica?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica: tecnica?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: tecnica?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria: secretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: secretaria?.cedulaMiembro || '___',
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
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
   * Solo 15 tokens de cabecera/comisión/firma. La tabla de resultados queda vacía
   * a propósito (imprimir y llenar a mano), por eso no exige oferentes registrados.
   */
  async getDatosActaAperturaSobres(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        fasePreparatoria: true,
        cronograma: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const { ente, comision, fasePreparatoria, cronograma } = expediente;
    const getMiembroPrincipal = (area: string) =>
      comision?.miembros?.find(
        (m) => m.areaRepresentacion === area && m.tipoMiembro === 'MIEMBRO_PRINCIPAL',
      ) || null;

    const juridica = getMiembroPrincipal('AREA_JURIDICA');
    const economica = getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA');
    const tecnica = getMiembroPrincipal('AREA_TECNICA');
    const secretaria = getMiembroPrincipal('SECRETARIO_A');

    return {
      hora_acto_recep_aper_au_au: fasePreparatoria?.horaActoRecepAper || '___',
      fec_acto_recep_aper_sobres_au_au: formatDateToSpanishLong(
        cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      dir_fiscal_ente: ente?.direccionFiscal || '___',
      nom_ente_contratante: ente?.nombre || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
      nom_completo_miembro_juridica: juridica?.nombreCompletoMiembro || '___',
      cedula_miembro_juridica: juridica?.cedulaMiembro || '___',
      nom_completo_miembro_economica: economica?.nombreCompletoMiembro || '___',
      cedula_miembro_economica: economica?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica: tecnica?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: tecnica?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria: secretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: secretaria?.cedulaMiembro || '___',
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
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
      case 'ACTIVIDADES_PREVIAS':
        return this.generarActividadesPrevias(docAnterior.expedienteId, userId);
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
      { tipo: 'ACTIVIDADES_PREVIAS', label: 'Requerimiento Actividades Previas' },
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
   * Id camelCase de Fase 1 (modCartaOfertaAuAu) → clave Docxtemplater (mod_carta_oferta_au_au).
   */
  private camelRecaudoIdToToken(id: string): string {
    return (
      id
        .replace(/AuAu$/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toLowerCase() + '_au_au'
    );
  }

  /**
   * Checklist vacío: filas = recaudos exigidos en Fase 1 (mod_* / personalizados).
   * No imprime SI/NO ni observaciones de la evaluación.
   */
  async getDatosListaCotejo(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        cronograma: true,
        fasePreparatoria: true,
      },
    });
    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    type ItemSnap = {
      id: string;
      sobre: 1 | 2;
      etiquetaCorta?: string;
      personalizado?: boolean;
    };
    const items: ItemSnap[] = [];
    const data =
      (expediente.fasePreparatoria?.calificacionLegalData as {
        exigidos?: Record<string, boolean>;
        personalizados?: Array<{
          id?: string;
          sobre?: number;
          descripcion?: string;
          exigido?: boolean;
        }>;
      }) || {};
    const exigidos = data.exigidos ?? {};
    for (const recaudo of RECAUDOS_CATALOGO) {
      if (exigidos[recaudo.id] === true) {
        items.push({
          id: recaudo.id,
          sobre: recaudo.sobre,
          etiquetaCorta: recaudo.etiquetaCorta,
          personalizado: false,
        });
      }
    }
    const personalizados = Array.isArray(data.personalizados) ? data.personalizados : [];
    personalizados.forEach((p, i) => {
      if (p?.exigido !== true) return;
      items.push({
        id: String(p?.id ?? `personalizado-${i + 1}`),
        sobre: p?.sobre === 2 ? 2 : 1,
        etiquetaCorta: String(p?.descripcion ?? `Recaudo personalizado ${i + 1}`),
        personalizado: true,
      });
    });
    // Ítem fijo Sobre 2 (igual que snapshot.service)
    items.push({
      id: 'ofertaTecnicoEconomicaAuAu',
      sobre: 2,
      etiquetaCorta: 'Oferta técnico-económica',
      personalizado: false,
    });

    const catalogIds = new Set(RECAUDOS_CATALOGO.map((r) => r.id));
    const modFlags: Record<string, boolean> = {};
    for (const recaudo of RECAUDOS_CATALOGO) {
      modFlags[this.camelRecaudoIdToToken(recaudo.id)] = false;
    }
    modFlags.oferta_tecnico_economica_au_au = false;

    const otrosSobre1: Array<{ desc_otro_recaudo_sobre1_au_au: string }> = [];
    const otrosSobre2: Array<{ desc_otro_recaudo_sobre2_au_au: string }> = [];

    for (const item of items) {
      if (item.personalizado) {
        const desc = item.etiquetaCorta || 'Recaudo personalizado';
        if (item.sobre === 2) {
          otrosSobre2.push({ desc_otro_recaudo_sobre2_au_au: desc });
        } else {
          otrosSobre1.push({ desc_otro_recaudo_sobre1_au_au: desc });
        }
        continue;
      }
      if (item.id === 'ofertaTecnicoEconomicaAuAu') {
        modFlags.oferta_tecnico_economica_au_au = true;
        continue;
      }
      if (catalogIds.has(item.id)) {
        modFlags[this.camelRecaudoIdToToken(item.id)] = true;
      }
    }

    // Siempre se coteja la oferta técnico-económica en el checklist vacío
    modFlags.oferta_tecnico_economica_au_au = true;

    const exigidosCatalogo = Object.entries(modFlags).filter(
      ([k, v]) => v && k !== 'oferta_tecnico_economica_au_au',
    ).length;
    if (exigidosCatalogo === 0 && otrosSobre1.length === 0 && otrosSobre2.length === 0) {
      throw new BadRequestException(
        'No hay recaudos exigidos en la Calificación Legal de Fase 1 para generar la Lista de Cotejo.',
      );
    }

    const comision = expediente.comision;
    const getMiembroPrincipal = (area: string) =>
      comision?.miembros?.find(
        (m) => m.areaRepresentacion === area && m.tipoMiembro === 'MIEMBRO_PRINCIPAL',
      ) || null;

    const juridica = getMiembroPrincipal('AREA_JURIDICA');
    const economica = getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA');
    const tecnica = getMiembroPrincipal('AREA_TECNICA');
    const secretaria = getMiembroPrincipal('SECRETARIO_A');

    return {
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      loc_ciudad_ente: expediente.ente?.ciudad || '___',
      fec_acto_recep_aper_sobres_au_au: formatDateToSpanishLong(
        expediente.cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      nombre_proveedor_evaluado_au_au: '___',
      nombre_rep_legal_evaluado_au_au: '___',
      cedula_rep_legal_evaluado_au_au: '___',
      ...modFlags,
      desc_otro_recaudo_sobre1_au_au: otrosSobre1,
      desc_otro_recaudo_sobre2_au_au: otrosSobre2,
      nom_completo_miembro_juridica: juridica?.nombreCompletoMiembro || '___',
      cedula_miembro_juridico: juridica?.cedulaMiembro || '___',
      nom_completo_miembro_economica: economica?.nombreCompletoMiembro || '___',
      cedula_miembro_economica: economica?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica: tecnica?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: tecnica?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria: secretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: secretaria?.cedulaMiembro || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
    };
  }

  async generarListaCotejo(expedienteId: string, userId: string) {
    const data = await this.getDatosListaCotejo(expedienteId);
    return this.generarDocumento(
      expedienteId,
      'LISTA_COTEJO',
      'lista-cotejo-template.docx',
      userId,
      data,
      undefined, // Sin evaluación asociada
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
            evaluacion: {
              include: {
                sobre1: true,
                sobre2: true,
                dictamenAdjudicacion: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        informeRecomendacion: true,
        dictamenesAdjudicacion: { where: { deletedAt: null } },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const tipoContratacion = expediente.modalidad?.tipoContratacion || 'SERVICIOS';
    const rangos = this.getRangosEvaluacion(tipoContratacion);
    const informe = expediente.informeRecomendacion;
    // Plazo desde dictámenes (Gestión); fallback informe legacy.
    const dictamenRef =
      expediente.dictamenesAdjudicacion.find((d) => d.tipoDictamen === 'TOTAL') ||
      expediente.dictamenesAdjudicacion.find((d) => d.oferenteAdjudicadoProcedimiento === true) ||
      null;
    // Garantía/CRS se verifican en el hub legal (Sobre 2) del oferente adjudicado.
    const evaluacionAdjudicada = dictamenRef
      ? expediente.ofertas.find((of) => of.evaluacion?.id === dictamenRef.evaluacionId)?.evaluacion
      : undefined;
    const indGarantia = evaluacionAdjudicada?.indVerificadoGarantia;
    const indCrs = evaluacionAdjudicada?.indVerificadoCrs;
    const plazoGanadora =
      dictamenRef?.plazoEjecucionOfertaGanadora ??
      dictamenRef?.plazoEjecucionOfertaParcial ??
      informe?.plazoEjecucionOfertaGanadora;
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

    // Matriz de totalización ordenada por prelación efectiva (adjudicación ?? evaluación)
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
        const pa = prelacionEfectiva(
          a.evaluacion!.posicionPrelacion,
          a.evaluacion!.posicionPrelacionAdjudicacion,
        );
        const pb = prelacionEfectiva(
          b.evaluacion!.posicionPrelacion,
          b.evaluacion!.posicionPrelacionAdjudicacion,
        );
        const ia = prelacionOrden.indexOf(pa || '');
        const ib = prelacionOrden.indexOf(pb || '');
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((of) => {
        const ev = of.evaluacion!;
        const efectiva = prelacionEfectiva(ev.posicionPrelacion, ev.posicionPrelacionAdjudicacion);
        return {
          nombre_proveedor_evaluado_au_au: ev.nombreProveedorEvaluado || '___',
          total_tecnica_au_au: Number(ev.totalTecnica ?? 0),
          total_economica_au_au: Number(ev.totalEconomica ?? 0),
          total_van_au_au: Number(ev.totalVan ?? 0),
          total_evaluacion_oferente_au_au: Number(ev.totalEvaluacion ?? 0),
          posicion_prelacion_au_au: efectiva || '___',
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

    let textoItemsSinOfertas = 'No existen ítems del presupuesto sin ofertas.';
    if (informe?.existeItemsSinOfertas) {
      textoItemsSinOfertas = `Existen ítems sin ofertas: ${informe.itemsSinOfertas || '___'}. Motivo: ${informe.motivoItemsSinOfertas || '___'}.`;
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
      tasa_referencial_bcv: expediente.tasaReferencialBcv
        ? Number(expediente.tasaReferencialBcv).toFixed(4)
        : '___',

      // Cronograma y Fase Preparatoria
      fec_limite_evaluacion_au_au: formatearFecha(cronograma?.fechaLimiteEvaluacion),
      fec_acta_inicio_au_au: formatearFecha(
        expediente.fechaActaInicio ?? fasePrep?.fechaActaInicio,
      ),
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
      existe_items_sin_ofertas_au_au: boolToSiNo(informe?.existeItemsSinOfertas),
      items_sin_ofertas_au_au: informe?.itemsSinOfertas || '___',
      motivo_items_sin_ofertas_au_au: informe?.motivoItemsSinOfertas || '___',
      texto_items_sin_ofertas_au_au: textoItemsSinOfertas,
      ind_verificado_garantia_au_au: boolToSiNo(indGarantia),
      ind_verificado_crs_au_au: boolToSiNo(indCrs),
      observacion_formalidades_au_au: textoFormalidades,
      plazo_ejecucion_oferta_ganadora_au_au: plazoGanadora ?? '___',
    };
  }

  /**
   * Causal Art. 113 LCP → 1 | 2 | 3.
   * Acepta el texto completo del desplegable o variantes sin el prefijo "N.".
   */
  private resolveCausalDesierto(causal: string | null | undefined): 1 | 2 | 3 | null {
    if (!causal?.trim()) return null;
    const t = causal.trim();
    if (t.startsWith('1.') || /ninguna oferta haya sido presentada/i.test(t)) return 1;
    if (t.startsWith('2.') || /todas las ofertas resulten rechazadas/i.test(t)) return 2;
    if (t.startsWith('3.') || /perjuicio al contratante/i.test(t)) return 3;
    return null;
  }

  /**
   * Tokens del Informe de Recomendación Desierto #1
   * (ninguna oferta presentada). Plantilla: informe-desierto-1-template.docx
   */
  async getDatosInformeDesierto1(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        modalidad: true,
        cronograma: true,
        fasePreparatoria: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    if (!expediente.declaratoriaDesierto) {
      throw new BadRequestException(
        'El expediente no está declarado desierto. No se puede generar el Informe Desierto #1.',
      );
    }

    const causalNum = this.resolveCausalDesierto(expediente.causalDeclaratoriaDesierto);
    if (causalNum !== 1) {
      throw new BadRequestException(
        'El Informe Desierto #1 solo aplica cuando la causal es "1. Ninguna oferta haya sido presentada."',
      );
    }

    return this.datosBaseInformeDesierto(expediente, 1);
  }

  /** Cabecera, comisión, cronograma y causal comunes a los 3 informes de desierto. */
  private datosBaseInformeDesierto(
    expediente: Prisma.ExpedienteContratacionGetPayload<{
      include: {
        ente: true;
        comision: { include: { miembros: true } };
        modalidad: true;
        cronograma: true;
        fasePreparatoria: true;
      };
    }>,
    causalNum: 1 | 2 | 3,
  ) {
    const { ente, comision, modalidad, cronograma, fasePreparatoria } = expediente;
    const getMiembroPrincipal = (area: string) =>
      comision?.miembros?.find(
        (m) => m.areaRepresentacion === area && m.tipoMiembro === 'MIEMBRO_PRINCIPAL',
      ) || null;

    const juridica = getMiembroPrincipal('AREA_JURIDICA');
    const economica = getMiembroPrincipal('AREA_ECONOMICA_FINANCIERA');
    const tecnica = getMiembroPrincipal('AREA_TECNICA');
    const secretaria = getMiembroPrincipal('SECRETARIO_A');

    const formatBs = (num: number) =>
      num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // En el narrativo: "numeral {causal_...}" → solo el número de la causal
    const causalToken = String(causalNum);

    return {
      cod_nomenclatura_proceso: expediente.codigoNomenclatura || '___',
      desc_objeto_contratacion: expediente.descripcionObjeto || '___',
      loc_ciudad_ente: ente?.ciudad || '___',
      fec_limite_evaluacion_au_au: formatDateToSpanishLong(cronograma?.fechaLimiteEvaluacion),
      nom_ente_contratante: ente?.nombre || '___',
      nom_completo_miembro_juridica: juridica?.nombreCompletoMiembro || '___',
      cedula_miembro_juridico: juridica?.cedulaMiembro || '___',
      nom_completo_miembro_economica: economica?.nombreCompletoMiembro || '___',
      cedula_miembro_economica: economica?.cedulaMiembro || '___',
      nom_completo_miembro_tecnica: tecnica?.nombreCompletoMiembro || '___',
      cedula_miembro_tecnica: tecnica?.cedulaMiembro || '___',
      nom_completo_miembro_secretaria: secretaria?.nombreCompletoMiembro || '___',
      cedula_miembro_secretaria: secretaria?.cedulaMiembro || '___',
      datos_designacion_comision: comision?.datosDesignacionComision || '___',
      monto_estimado_bs: formatBs(Number(modalidad?.montoEstimadoBs ?? 0)),
      valor_ucau_base: formatBs(Number(modalidad?.valorUcauBase ?? 0)),
      fec_acta_inicio_au_au: formatDateToSpanishLong(
        expediente.fechaActaInicio ?? fasePreparatoria?.fechaActaInicio,
      ),
      // EntePublico aún no tiene URL web; placeholder hasta que exista el campo
      pag_web_ente: '___',
      fec_llamado_participar_au_au: formatDateToSpanishLong(cronograma?.fechaLlamadoParticipar),
      fec_inicio_disponibilidad_pliego_au_au: formatDateToSpanishLong(
        cronograma?.fechaInicioDisponibilidadPliego,
      ),
      fec_fin_disponibilidad_pliego_au_au: formatDateToSpanishLong(
        cronograma?.fechaFinDisponibilidadPliego,
      ),
      fec_acto_recep_aper_sobres_au_au: formatDateToSpanishLong(
        cronograma?.fechaActoRecepcionAperturaSobres,
      ),
      hora_acto_recep_aper_au_au: fasePreparatoria?.horaActoRecepAper || '___',
      causal_declaratoria_desierto_au_au: causalToken,
      justificacion_declaratoria_desierto_au_au:
        expediente.justificacionDeclaratoriaDesierto || '___',
    };
  }

  /**
   * Tokens del Informe de Recomendación Desierto #2 (ofertas rechazadas / descalificados)
   * y #3 (perjuicio al contratante; incluye evaluación y promoción).
   * Plantillas: informe-desierto-2-template.docx / informe-desierto-3-template.docx
   */
  async getDatosInformeDesierto23(expedienteId: string, causalNum: 2 | 3) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      include: {
        ente: true,
        comision: { include: { miembros: true } },
        modalidad: true,
        cronograma: true,
        fasePreparatoria: true,
        presupuestoItems: { where: { deletedAt: null } },
        ofertas: {
          where: { deletedAt: null },
          include: { evaluacion: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);
    if (!expediente.fasePreparatoria || !expediente.cronograma || !expediente.modalidad) {
      throw new BadRequestException(
        'El expediente no tiene Fase 1, cronograma o modalidad completos para generar el informe.',
      );
    }
    if (!expediente.declaratoriaDesierto) {
      throw new BadRequestException(
        `El expediente no está declarado desierto. No se puede generar el Informe Desierto #${causalNum}.`,
      );
    }

    const oferentes = mapOferentesDesierto(expediente.ofertas, {
      incluirEvaluacion: causalNum === 3,
    });
    if ((oferentes.calificacion_legal_au_au as unknown[]).length === 0) {
      throw new BadRequestException(
        `Debe confirmar la Calificación Legal de al menos un oferente en el hub antes de generar el Informe Desierto #${causalNum}.`,
      );
    }

    // Matrices y recaudos tal como se exigieron en el pliego (Fase 1)
    const pliego = mapDatosPliegoCondiciones(expediente);
    const promocionActiva = Boolean(pliego.activa_promocion_economica_au_au);

    return {
      ...pliego,
      ...this.datosBaseInformeDesierto(expediente, causalNum),
      ...oferentes,
      total_matriz_1_evaluacion_au_au: !promocionActiva,
      total_matriz_2_evaluacion_au_au: promocionActiva,
    };
  }

  /**
   * Datos del informe: si el expediente está desierto, enruta por causal (#1, #2 o #3).
   */
  async getDatosInformeRecomendacionSegunCaso(expedienteId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      select: {
        id: true,
        declaratoriaDesierto: true,
        causalDeclaratoriaDesierto: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    if (expediente.declaratoriaDesierto) {
      const causal = this.resolveCausalDesierto(expediente.causalDeclaratoriaDesierto);
      if (causal === 1) return this.getDatosInformeDesierto1(expedienteId);
      if (causal === 2 || causal === 3) return this.getDatosInformeDesierto23(expedienteId, causal);
      throw new BadRequestException(
        'Causal de declaratoria de desierto no reconocida. Use una de las 3 opciones del Art. 113 LCP.',
      );
    }

    return this.getDatosInformeRecomendacion(expedienteId);
  }

  async generarInformeRecomendacion(expedienteId: string, userId: string) {
    const expediente = await this.prisma.expedienteContratacion.findUnique({
      where: { id: expedienteId },
      select: {
        id: true,
        declaratoriaDesierto: true,
        causalDeclaratoriaDesierto: true,
      },
    });

    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    if (expediente.declaratoriaDesierto) {
      const causal = this.resolveCausalDesierto(expediente.causalDeclaratoriaDesierto);
      if (causal === 1) {
        const data = await this.getDatosInformeDesierto1(expedienteId);
        return this.generarDocumento(
          expedienteId,
          'INFORME_RECOMENDACION',
          'informe-desierto-1-template.docx',
          userId,
          data,
        );
      }
      if (causal === 2 || causal === 3) {
        const data = await this.getDatosInformeDesierto23(expedienteId, causal);
        return this.generarDocumento(
          expedienteId,
          'INFORME_RECOMENDACION',
          `informe-desierto-${causal}-template.docx`,
          userId,
          data,
        );
      }
      throw new BadRequestException(
        'Causal de declaratoria de desierto no reconocida. Use una de las 3 opciones del Art. 113 LCP.',
      );
    }

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
      // Almacenamiento local de desarrollo: /uploads/...
      if (url.startsWith('/uploads/')) {
        return url;
      }
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
    // Preferir dictámenes Gestión Fase 3; fallback a Adjudicacion legacy (Elaboración).
    const dictamenes = await this.prisma.dictamenAdjudicacion.findMany({
      where: {
        expedienteId,
        deletedAt: null,
        OR: [{ tipoDictamen: 'TOTAL' }, { oferenteAdjudicadoProcedimiento: true }],
      },
      include: {
        evaluacion: true,
        expediente: {
          include: {
            autoridad: true,
            ente: true,
            cronograma: true,
            fasePreparatoria: true,
            modalidad: true,
          },
        },
      },
    });

    if (dictamenes.length > 0) {
      const exp = dictamenes[0].expediente;
      const firmas = await this.getFirmasExpediente(exp);
      const crono = exp.cronograma;
      const fasePrep = exp.fasePreparatoria;
      const tipoContratacion = exp.modalidad?.tipoContratacion || 'SERVICIOS';
      const criterios = this.criteriosEvaluacionPorTipo(tipoContratacion);

      const adjudicados = dictamenes.map((d) => ({
        nombre: d.evaluacion.nombreProveedorEvaluado || '___',
        rif: d.evaluacion.rifProveedorEvaluado || '___',
        monto: Number(d.montoAdjudicadoTotal ?? d.montoAdjudicadoParcial ?? 0),
        partida: d.partidasAdjudicadasTotal || d.partidasAdjudicadasParcial || '___',
      }));

      const primario = adjudicados[0];
      const montoTotal = adjudicados.reduce((s, a) => s + a.monto, 0);

      return {
        ...firmas,
        nom_ente_contratante: exp.ente?.nombre || '___',
        cod_nomenclatura_proceso: exp.codigoNomenclatura || '___',
        cod_nomenclatura_proceso_au_au: exp.codigoNomenclatura || '___',
        desc_objeto_contratacion: exp.descripcionObjeto || '___',
        desc_objeto_contratacion_au_au: exp.descripcionObjeto || '___',
        normativa_legal: formatNormativaLegalForDoc(fasePrep?.normativaLegal),
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
        oferente_primera_opción_au_au: adjudicados.map((a) => a.nombre).join('; ') || '___',
        rif_proveedor_evaluado_au_au: primario?.rif || '___',
        monto_adjudicado_bs_au_au: formatCurrencyVE(montoTotal),
        partida_presupuest_gasto_au_au: primario?.partida || '___',
        monto_crs_bs_au_au: '___',
        referencia_recomendacion_au_au: 'Informe de Recomendación — Gestión Fase 3',
        caracter_adjudicacion_au_au: exp.caracterAdjudicacion || '___',
        adjudicados,
        adquirientes: adjudicados.map((a) => ({
          codigo_partida_au_au: a.partida,
          total_items_au_au: formatCurrencyVE(a.monto),
        })),
      };
    }

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

    if (!adjudicacion) {
      throw new NotFoundException(
        'No hay dictámenes de adjudicación ni registro legacy de Adjudicación.',
      );
    }

    const firmas = await this.getFirmasExpediente(adjudicacion.expediente);
    const exp = adjudicacion.expediente;
    const crono = exp.cronograma;
    const fasePrep = exp.fasePreparatoria;
    const criterios = this.criteriosEvaluacionPorTipo(
      exp.modalidad?.tipoContratacion || 'SERVICIOS',
    );

    return {
      ...firmas,
      nom_ente_contratante: exp.ente?.nombre || '___',
      cod_nomenclatura_proceso: exp.codigoNomenclatura || '___',
      cod_nomenclatura_proceso_au_au: exp.codigoNomenclatura || '___',
      desc_objeto_contratacion: exp.descripcionObjeto || '___',
      desc_objeto_contratacion_au_au: exp.descripcionObjeto || '___',
      normativa_legal: formatNormativaLegalForDoc(fasePrep?.normativaLegal),

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
      caracter_adjudicacion_au_au: exp.caracterAdjudicacion || 'TOTAL',

      adquirientes: [
        {
          codigo_partida_au_au: adjudicacion.partidaPresupuestariaGasto || '___',
          total_items_au_au: formatCurrencyVE(Number(adjudicacion.montoAdjudicadoBs)),
        },
      ],
    };
  }

  private criteriosEvaluacionPorTipo(tipoContratacion: string): string[] {
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
    return criteriosPorTipo[tipoContratacion] || criteriosPorTipo['SERVICIOS'];
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
      where: { oferta: { expedienteId }, deletedAt: null },
      include: { oferta: true, dictamenAdjudicacion: true },
    });

    const dictamenes = evaluaciones
      .map((e) => e.dictamenAdjudicacion)
      .filter((d): d is NonNullable<typeof d> => !!d && !d.deletedAt);

    let ganadoras = evaluaciones.filter((e) => {
      const efectiva = prelacionEfectiva(e.posicionPrelacion, e.posicionPrelacionAdjudicacion);
      return esPrimeraOpcion(efectiva);
    });
    let perdedoras = evaluaciones.filter((e) => {
      if (!e.oferenteCalificado) return false;
      const efectiva = prelacionEfectiva(e.posicionPrelacion, e.posicionPrelacionAdjudicacion);
      return !!efectiva && !esPrimeraOpcion(efectiva);
    });

    // Si hay dictámenes Gestión: ganadores = adjudicados; no adjudicados = dictamen false o resto calificados
    if (dictamenes.length > 0) {
      const adjudicadoIds = new Set(
        dictamenes
          .filter((d) => d.tipoDictamen === 'TOTAL' || d.oferenteAdjudicadoProcedimiento === true)
          .map((d) => d.evaluacionId),
      );
      const noAdjudicadoIds = new Set(
        dictamenes
          .filter((d) => d.oferenteAdjudicadoProcedimiento === false)
          .map((d) => d.evaluacionId),
      );
      ganadoras = evaluaciones.filter((e) => adjudicadoIds.has(e.id));
      perdedoras = evaluaciones.filter(
        (e) => noAdjudicadoIds.has(e.id) || (e.oferenteCalificado && !adjudicadoIds.has(e.id)),
      );
    }

    const documentosGenerados: any[] = [];
    const nombrePrimera =
      ganadoras
        .map((g) => g.nombreProveedorEvaluado)
        .filter(Boolean)
        .join('; ') || '___';

    // Generar Notificación Adjudicado (multi si parcial)
    for (const ganadora of ganadoras) {
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
        oferente_primera_opción_au_au: nombrePrimera,
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
