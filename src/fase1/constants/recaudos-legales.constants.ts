/**
 * Catálogo fijo de recaudos de la Calificación Legal (Sobres 1 y 2).
 *
 * El front presenta este mismo catálogo; el backend lo replica para poder
 * validar al completar el micromódulo sin depender de lo que envíe el cliente.
 */

export interface RecaudoCatalogo {
  id: string;
  sobre: 1 | 2;
  /** Id del recaudo sustituto (declaración jurada) cuando el recaudo es exigido. */
  sustitutoId?: string;
  /**
   * Cuando está presente, el recaudo se exige automáticamente si el campo
   * indicado de la fase está activo (no lo decide el usuario en este módulo).
   */
  autoFrom?: 'requiereVan' | 'requiereGarantiaLaboral';
}

export const RECAUDOS_SOBRE_1: RecaudoCatalogo[] = [
  { id: 'modCartaManifestacionVoluntadAuAu', sobre: 1 },
  { id: 'modCartaAutorizacionAuAu', sobre: 1 },
  { id: 'modDocConstitutivoAuAu', sobre: 1 },
  { id: 'modCopiaRifVigenteAuAu', sobre: 1, sustitutoId: 'sustitutoDjRifVigenteAuAu' },
  { id: 'modCertificadoRncAuAu', sobre: 1, sustitutoId: 'sustitutoDjCertificadoRncAuAu' },
  { id: 'modSolvenciaLaboralAuAu', sobre: 1 },
  { id: 'modDeclaracionSociosNoInhabilitadosAuAu', sobre: 1 },
  { id: 'modDeclaracionNoDeudasEnteAuAu', sobre: 1 },
  { id: 'modDeclaracionNoImpedimentosLcpAuAu', sobre: 1 },
  { id: 'modDeclaracionConocimientoLugarAuAu', sobre: 1 },
  { id: 'modDeclaracionInfoFinancieraAuAu', sobre: 1 },
  { id: 'modEvaluacionDesempenoAuAu', sobre: 1, sustitutoId: 'sustitutoDjEvalDesempenoAuAu' },
];

export const RECAUDOS_SOBRE_2: RecaudoCatalogo[] = [
  { id: 'modCartaOfertaAuAu', sobre: 2 },
  { id: 'modDeclaracionCapacidadFinancieraAuAu', sobre: 2 },
  { id: 'modDeclaracionCompromisoRespSocialAuAu', sobre: 2 },
  { id: 'modGarantiaMantenimientoOfertaAuAu', sobre: 2 },
  { id: 'modDeclaracionAutocalculoVanAuAu', sobre: 2, autoFrom: 'requiereVan' },
  { id: 'modCartaNotificacionesAuAu', sobre: 2 },
  { id: 'modGarantiaFielCumplAuAu', sobre: 2 },
  { id: 'modFianzaLaboralAuAu', sobre: 2, autoFrom: 'requiereGarantiaLaboral' },
];

export const RECAUDOS_CATALOGO: RecaudoCatalogo[] = [...RECAUDOS_SOBRE_1, ...RECAUDOS_SOBRE_2];

/** Modalidades de cumplimiento del Compromiso de Responsabilidad Social. */
export const MODALIDADES_CRS = [
  'Ejecución de proyectos de desarrollo socio comunitario',
  'Creación de nuevos empleos permanentes',
  'Formación socio productiva de integrantes de la comunidad',
  'Venta de bienes a precios solidarios o donaciones',
  'Aportes en dinero o especie a programas sociales del Ente',
  'Cualquier otra que satisfaga las necesidades del entorno social del Ente',
] as const;
