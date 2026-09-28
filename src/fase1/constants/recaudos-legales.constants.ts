/**
 * Catálogo fijo de recaudos de la Calificación Legal (Sobres 1 y 2).
 *
 * El front presenta este mismo catálogo; el backend lo replica para poder
 * validar al completar el micromódulo sin depender de lo que envíe el cliente.
 */

export interface RecaudoCatalogo {
  id: string;
  sobre: 1 | 2;
  /** Nombre corto del recaudo, para listados y chips. */
  etiquetaCorta: string;
  /** Pregunta que se le muestra al evaluador en el cotejo de la Fase 2. */
  pregunta: string;
  /** Id del recaudo sustituto (declaración jurada) cuando el recaudo es exigido. */
  sustitutoId?: string;
  /**
   * Cuando está presente, el recaudo se exige automáticamente si el campo
   * indicado de la fase está activo (no lo decide el usuario en este módulo).
   */
  autoFrom?: 'requiereVan' | 'requiereGarantiaLaboral';
}

export const RECAUDOS_SOBRE_1: RecaudoCatalogo[] = [
  {
    id: 'modCartaManifestacionVoluntadAuAu',
    sobre: 1,
    etiquetaCorta: 'Carta de manifestación de voluntad',
    pregunta: '¿Consignó carta de manifestación de voluntad de participar?',
  },
  {
    id: 'modCartaAutorizacionAuAu',
    sobre: 1,
    etiquetaCorta: 'Carta de autorización',
    pregunta: '¿Consignó carta de autorización del representante legal?',
  },
  {
    id: 'modDocConstitutivoAuAu',
    sobre: 1,
    etiquetaCorta: 'Documento constitutivo',
    pregunta: '¿Consignó el documento constitutivo estatutario vigente?',
  },
  {
    id: 'modCopiaRifVigenteAuAu',
    sobre: 1,
    etiquetaCorta: 'Copia del RIF vigente',
    pregunta: '¿Consignó copia del RIF vigente?',
    sustitutoId: 'sustitutoDjRifVigenteAuAu',
  },
  {
    id: 'modCertificadoRncAuAu',
    sobre: 1,
    etiquetaCorta: 'Certificado RNC',
    pregunta: '¿Consignó el certificado del Registro Nacional de Contratistas?',
    sustitutoId: 'sustitutoDjCertificadoRncAuAu',
  },
  {
    id: 'modSolvenciaLaboralAuAu',
    sobre: 1,
    etiquetaCorta: 'Solvencia laboral',
    pregunta: '¿Consignó la solvencia laboral vigente?',
  },
  {
    id: 'modDeclaracionSociosNoInhabilitadosAuAu',
    sobre: 1,
    etiquetaCorta: 'Declaración de socios no inhabilitados',
    pregunta: '¿Consignó la declaración jurada de socios no inhabilitados?',
  },
  {
    id: 'modDeclaracionNoDeudasEnteAuAu',
    sobre: 1,
    etiquetaCorta: 'Declaración de no deudas con el Ente',
    pregunta: '¿Consignó la declaración jurada de no mantener deudas con el Ente?',
  },
  {
    id: 'modDeclaracionNoImpedimentosLcpAuAu',
    sobre: 1,
    etiquetaCorta: 'Declaración de no impedimentos LCP',
    pregunta: '¿Consignó la declaración jurada de no estar incurso en los impedimentos de la LCP?',
  },
  {
    id: 'modDeclaracionConocimientoLugarAuAu',
    sobre: 1,
    etiquetaCorta: 'Declaración de conocimiento del lugar',
    pregunta: '¿Consignó la declaración de conocimiento del lugar de ejecución?',
  },
  {
    id: 'modDeclaracionInfoFinancieraAuAu',
    sobre: 1,
    etiquetaCorta: 'Declaración de información financiera',
    pregunta: '¿Consignó la declaración jurada de información financiera?',
  },
  {
    id: 'modEvaluacionDesempenoAuAu',
    sobre: 1,
    etiquetaCorta: 'Evaluación de desempeño',
    pregunta: '¿Consignó la evaluación de desempeño de contrataciones anteriores?',
    sustitutoId: 'sustitutoDjEvalDesempenoAuAu',
  },
];

export const RECAUDOS_SOBRE_2: RecaudoCatalogo[] = [
  {
    id: 'modCartaOfertaAuAu',
    sobre: 2,
    etiquetaCorta: 'Carta de oferta',
    pregunta: '¿Consignó la carta de oferta debidamente firmada?',
  },
  {
    id: 'modDeclaracionCapacidadFinancieraAuAu',
    sobre: 2,
    etiquetaCorta: 'Declaración de capacidad financiera',
    pregunta: '¿Consignó la declaración jurada de capacidad financiera?',
  },
  {
    id: 'modDeclaracionCompromisoRespSocialAuAu',
    sobre: 2,
    etiquetaCorta: 'Compromiso de responsabilidad social',
    pregunta: '¿Consignó el compromiso de responsabilidad social?',
  },
  {
    id: 'modGarantiaMantenimientoOfertaAuAu',
    sobre: 2,
    etiquetaCorta: 'Garantía de mantenimiento de oferta',
    pregunta: '¿Consignó la garantía de mantenimiento de la oferta?',
  },
  {
    id: 'modDeclaracionAutocalculoVanAuAu',
    sobre: 2,
    etiquetaCorta: 'Declaración de autocálculo del VAN',
    pregunta: '¿Consignó la declaración de autocálculo del Valor Agregado Nacional?',
    autoFrom: 'requiereVan',
  },
  {
    id: 'modCartaNotificacionesAuAu',
    sobre: 2,
    etiquetaCorta: 'Carta de notificaciones',
    pregunta: '¿Consignó la carta de domicilio para notificaciones?',
  },
  {
    id: 'modGarantiaFielCumplAuAu',
    sobre: 2,
    etiquetaCorta: 'Garantía de fiel cumplimiento',
    pregunta: '¿Consignó la garantía de fiel cumplimiento?',
  },
  {
    id: 'modFianzaLaboralAuAu',
    sobre: 2,
    etiquetaCorta: 'Fianza laboral',
    pregunta: '¿Consignó la fianza laboral?',
    autoFrom: 'requiereGarantiaLaboral',
  },
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
