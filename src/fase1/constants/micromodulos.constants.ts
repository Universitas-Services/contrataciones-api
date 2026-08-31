/**
 * Registro de micromódulos de la Fase 1 (Preparatoria).
 *
 * Cada micromódulo declara dónde vive su información dentro de FasePreparatoria:
 * en columnas planas o en una columna JSONB. El controlador y el servicio son
 * genéricos y se apoyan en este registro, de modo que agregar un micromódulo
 * nuevo no requiere endpoints nuevos.
 */

export type MicromoduloKey =
  | 'actividades-previas'
  | 'llamado'
  | 'aspectos-generales'
  | 'modelo-contrato'
  | 'calificacion-legal'
  | 'calificacion-financiera'
  | 'calificacion-tecnica'
  | 'evaluacion-tecnica-economica';

export type Almacenamiento =
  | { tipo: 'columnas'; campos: readonly string[] }
  | { tipo: 'json'; campo: string };

export interface MicromoduloConfig {
  key: MicromoduloKey;
  etiqueta: string;
  estadoField: string;
  almacenamiento: Almacenamiento;
}

const ACTIVIDADES_PREVIAS_CAMPOS = [
  'numReferenciaSnc',
  'modifRequerimientoSnc',
  'numeroModifRequerimientoSnc',
  'justificacionNecesidadContratacion',
  'justificacionVentajas',
  'condicionPlurianual',
  'proyectoAprobado',
  'permitePymesCooperativas',
  'justificacionPermitePymesCooperativas',
  'viabilidadContratoMarco',
  'justificacion_contrato_marco_au_au',
  'fecEstudioMercado',
  'numCertificacionPresupuestaria',
  'plazoEjecucionProcedimiento',
  'lugarLogisticaEjecucion',
  'requiereEspecializado',
  'detalleEspecializado',
  'requiereMuestras',
  'detalleProcedimientoMuestras',
  'activaPromocionEconomica',
  'requiereVan',
  'puntajeVan',
  'indPrefLocal',
  'puntuacionBonoLocal',
  'indBonoSujeto',
  'puntuacionBonoSujeto',
] as const;

const LLAMADO_CAMPOS = [
  'objetivosEspecificos1',
  'objetivosEspecificos2',
  'objetivosEspecificos3',
  'direccionRetiroPliego',
  'horarioRetiroPliego',
  'pliegoGratuito',
  'costoPliegoBs',
  'bancoPagoPliego',
  'cuentaPagoPliego',
  'titularPagoPliego',
  'rifPagoPliego',
  'horaActoRecepAper',
] as const;

const ASPECTOS_GENERALES_CAMPOS = [
  'datosActoAutorizacionInicio',
  'diasValidezOferta',
  'autoridadAclaratorias',
  'normativaLegal',
  'diasVigenciaGarantiaExtension',
  'monedaDiferente',
  'nomMonedaExtranjera',
  'idiomaDiferente',
  'nomIdiomaDiferente',
  'porcentajeResponsabilidadSocial',
  'unidadRespCumplimientoCrs',
  'modalidadCrs',
  'formaCumplimientoCrs',
  'porcentajeMantenimientoOferta',
  'porcentajeFielCumplimiento',
  'retencionFielCumplimiento',
  'requiereGarantiaLaboral',
  'porcentajeGarantiaLaboral',
  'retencionFianzaLaboral',
  'polizaResponsabilidadCivil',
  'porcentajeResponsabilidadCivil',
  'montoResponsabilidadCivilBs',
  'anticipoContrato',
  'porcentajeAnticipo',
  'anticipoEspecial',
  'porcentajeAnticipoEspecial',
] as const;

export const MICROMODULOS: Record<MicromoduloKey, MicromoduloConfig> = {
  'actividades-previas': {
    key: 'actividades-previas',
    etiqueta: 'Actividades Previas',
    estadoField: 'estadoActividadesPrevias',
    almacenamiento: { tipo: 'columnas', campos: ACTIVIDADES_PREVIAS_CAMPOS },
  },
  llamado: {
    key: 'llamado',
    etiqueta: 'Llamado',
    estadoField: 'estadoLlamado',
    almacenamiento: { tipo: 'columnas', campos: LLAMADO_CAMPOS },
  },
  'aspectos-generales': {
    key: 'aspectos-generales',
    etiqueta: 'Aspectos Generales del Pliego',
    estadoField: 'estadoAspectosGenerales',
    almacenamiento: { tipo: 'columnas', campos: ASPECTOS_GENERALES_CAMPOS },
  },
  'modelo-contrato': {
    key: 'modelo-contrato',
    etiqueta: 'Modelo de Contrato',
    estadoField: 'estadoModeloContrato',
    almacenamiento: { tipo: 'json', campo: 'modeloContratoData' },
  },
  'calificacion-legal': {
    key: 'calificacion-legal',
    etiqueta: 'Calificación Legal',
    estadoField: 'estadoCalificacionLegal',
    almacenamiento: { tipo: 'json', campo: 'calificacionLegalData' },
  },
  'calificacion-financiera': {
    key: 'calificacion-financiera',
    etiqueta: 'Calificación Financiera',
    estadoField: 'estadoCalificacionFinanciera',
    almacenamiento: { tipo: 'json', campo: 'calificacionFinancieraData' },
  },
  'calificacion-tecnica': {
    key: 'calificacion-tecnica',
    etiqueta: 'Calificación Técnica',
    estadoField: 'estadoCalificacionTecnica',
    almacenamiento: { tipo: 'json', campo: 'calificacionTecnicaData' },
  },
  'evaluacion-tecnica-economica': {
    key: 'evaluacion-tecnica-economica',
    etiqueta: 'Evaluación Técnica y Económica',
    estadoField: 'estadoEvaluacionTecnicaEconomica',
    almacenamiento: { tipo: 'json', campo: 'evaluacionTecnicaEconomicaData' },
  },
};

export const MICROMODULO_KEYS = Object.keys(MICROMODULOS) as MicromoduloKey[];

/** Micromódulos especiales: no siguen el patrón de formulario estándar. */
export const MICROMODULO_ESPECIFICACIONES = 'especificaciones-tecnicas';
export const MICROMODULO_PRESUPUESTO = 'presupuesto-base';

/** Documentos maestros de la Fase 1, en el orden en que se generan. */
export const DOCUMENTOS_FASE1 = [
  'actividades-previas',
  'pliego',
  'acta-inicio',
  'llamado',
] as const;
