/**
 * Metadatos fijos de los criterios de Calificación Financiera.
 *
 * La Fase 1 sólo guarda si el criterio está activo y sus rangos; el título, la
 * pregunta y el basamento legal son constantes del dominio y viven aquí para
 * que la plantilla del hub los pueda mostrar sin que el usuario los redacte.
 */

export type ModoIndice = 'ascendente' | 'inverso';

export interface MetadatoCriterioFinanciero {
  /** Id con el que viaja en la plantilla y en las respuestas. */
  id: string;
  titulo: string;
  pregunta: string;
  basamentoLegal: string;
  /** Ayuda sobre qué dato del balance se toma. */
  aspectoHint?: string;
  /** Sufijo con el que Fase 1 nombra sus campos: criterioCalifFinan<Sufijo>. */
  sufijoFase1: string;
  modo: ModoIndice;
}

/** El único criterio que se responde SI/NO en vez de con un índice. */
export const CRITERIO_DESCAPITAL: MetadatoCriterioFinanciero = {
  id: 'descapital',
  titulo: 'Descapitalización',
  pregunta: '¿El oferente se encuentra en estado de descapitalización?',
  basamentoLegal: 'Art. 45 del Reglamento de la LCP',
  aspectoHint: 'Patrimonio neto respecto al capital social',
  sufijoFase1: 'Descapital',
  modo: 'ascendente',
};

/** Criterios que se evalúan con un índice numérico contra tres rangos. */
export const CRITERIOS_INDICE: MetadatoCriterioFinanciero[] = [
  {
    id: 'solvencia',
    titulo: 'Índice de solvencia',
    pregunta: 'Indique el índice de solvencia del oferente.',
    basamentoLegal: 'Art. 45 del Reglamento de la LCP',
    aspectoHint: 'Activo total entre pasivo total',
    sufijoFase1: 'Solvencia',
    modo: 'ascendente',
  },
  {
    id: 'rotacion',
    titulo: 'Índice de rotación',
    pregunta: 'Indique el índice de rotación de activos del oferente.',
    basamentoLegal: 'Art. 45 del Reglamento de la LCP',
    aspectoHint: 'Ventas netas entre activo total',
    sufijoFase1: 'Rotacion',
    modo: 'ascendente',
  },
  {
    id: 'rendimiento',
    titulo: 'Rendimiento sobre activos (ROA)',
    pregunta: 'Indique el rendimiento sobre activos del oferente.',
    basamentoLegal: 'Art. 45 del Reglamento de la LCP',
    aspectoHint: 'Utilidad neta entre activo total',
    sufijoFase1: 'Rendimiento',
    modo: 'ascendente',
  },
  {
    id: 'rentabilidad',
    titulo: 'Rentabilidad sobre patrimonio (ROE)',
    pregunta: 'Indique la rentabilidad sobre el patrimonio del oferente.',
    basamentoLegal: 'Art. 45 del Reglamento de la LCP',
    aspectoHint: 'Utilidad neta entre patrimonio',
    sufijoFase1: 'Rentabilidad',
    modo: 'ascendente',
  },
  {
    id: 'endeudamiento',
    titulo: 'Índice de endeudamiento',
    pregunta: 'Indique el índice de endeudamiento del oferente.',
    basamentoLegal: 'Art. 45 del Reglamento de la LCP',
    aspectoHint: 'Pasivo total entre activo total. A menor valor, mejor puntaje.',
    // El endeudamiento premia el valor más bajo, no el más alto.
    sufijoFase1: 'Endeudamiento',
    modo: 'inverso',
  },
];

/** Ítem fijo del Sobre 2 que siempre se coteja, exigido o no el resto. */
export const ITEM_OFERTA_TECNICO_ECONOMICA = {
  id: 'ofertaTecnicoEconomicaAuAu',
  sobre: 2 as const,
  etiquetaCorta: 'Oferta técnico-económica',
  pregunta: '¿Consignó la oferta técnico-económica?',
};
