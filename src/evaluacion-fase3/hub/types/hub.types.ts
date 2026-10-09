/** Tipos del hub de evaluación del oferente (Fase 2 — CA / Acto Único). */

export type ResultadoFinal = 'pendiente' | 'en_evaluacion' | 'descalificado' | 'calificado';

export type ModuloHub = 'legal' | 'financiera' | 'tecnica' | 'evaluacion' | 'promocion';

export type AccionHub = 'draft' | 'confirm';

// ── Plantillas (snapshot inmutable de Fase 1) ──────────────────────────────

export interface ItemLegalPlantilla {
  id: string;
  sobre: 1 | 2;
  pregunta: string;
  etiquetaCorta: string;
  /** Un "NO" en un ítem eliminatorio descalifica; los demás no. */
  eliminatorio: boolean;
  personalizado: boolean;
}

export interface PlantillaLegal {
  items: ItemLegalPlantilla[];
}

export interface RangosIndice {
  rangoMaximo: number;
  puntajeMaximo: number;
  rangoMedioDesde: number;
  rangoMedioHasta: number;
  puntajeMedio: number;
  rangoMinimo: number;
  puntajeMinimo: number;
}

export interface CriterioDescapital {
  id: string;
  kind: 'descapital';
  titulo: string;
  pregunta: string;
  basamentoLegal: string;
  puntajeMaximo: number;
}

export interface CriterioIndice {
  id: string;
  kind: 'indice';
  titulo: string;
  pregunta: string;
  basamentoLegal: string;
  aspectoHint?: string;
  mode: 'ascendente' | 'inverso';
  rangos: RangosIndice;
}

export type CriterioFinanciero = CriterioDescapital | CriterioIndice;

export interface PlantillaFinanciera {
  puntuacionMinima: number;
  criterios: CriterioFinanciero[];
}

export interface RangoCriterio {
  id: string;
  descripcion: string;
  puntaje: number;
}

export interface CriterioPuntuado {
  id: string;
  nombre: string;
  descripcion: string;
  ponderacion: number;
  rangos: RangoCriterio[];
}

export interface PlantillaTecnica {
  puntuacionMinima: number;
  criterios: CriterioPuntuado[];
}

export interface LadoEvaluacion {
  puntuacionMinima: number;
  maxPuntos: number;
  criterios: CriterioPuntuado[];
}

export interface PlantillaEvaluacion {
  tecnica: LadoEvaluacion;
  economica: LadoEvaluacion;
}

export interface PlantillaPromocion {
  activa: boolean;
  requiereVan: boolean;
  puntajeVanMax: number;
  indPrefLocal: boolean;
  puntuacionBonoLocal: number;
  indBonoSujeto: boolean;
  puntuacionBonoSujeto: number;
}

export interface PlantillasSnapshot {
  legal: PlantillaLegal;
  financiera: PlantillaFinanciera;
  tecnica: PlantillaTecnica;
  evaluacion: PlantillaEvaluacion;
  /** null cuando Actividades Previas no activó la promoción económica. */
  promocion: PlantillaPromocion | null;
}

// ── Formularios (lo que responde el evaluador) ─────────────────────────────

export interface RespuestaLegal {
  consignado: 'SI' | 'NO' | null;
  observacion?: string;
}

export interface FormLegal {
  items: Record<string, RespuestaLegal>;
  justificacion: string;
  /** Sobre 2: ¿se verificó la garantía de mantenimiento de la oferta? (ind_verificado_garantia_au_au) */
  indVerificadoGarantia?: boolean | null;
  /** Sobre 2: ¿se verificó el compromiso de responsabilidad social? (ind_verificado_crs_au_au) */
  indVerificadoCrs?: boolean | null;
}

export interface RespuestaFinanciera {
  /** 'SI'/'NO' en descapital; string numérico en los índices. */
  valor: string;
}

export interface FormFinanciera {
  criterios: Record<string, RespuestaFinanciera>;
  justificacion: string;
}

export interface RespuestaPuntuada {
  rangoIdSeleccionado?: string;
  puntuacionObtenida?: number;
  valorObtenido?: string;
}

export interface FormPuntuado {
  criterios: Record<string, RespuestaPuntuada>;
  justificacion: string;
}

export interface FormEvaluacion {
  tecnica: FormPuntuado;
  economica: FormPuntuado;
  posicionPrelacion: string;
}

export interface FormPromocion {
  consignoDeclaracionVan?: boolean;
  valVanOferente?: number;
  ptsBonoVan?: number;
  aplicaPrefLocal?: boolean;
  aplicaBonoSujeto?: boolean;
}

// ── Estado persistido por pestaña ──────────────────────────────────────────

export interface EstadoLegal {
  submitted: boolean;
  oferenteCalificadoLegal: boolean | null;
  form: FormLegal;
}

export interface EstadoPuntuado {
  submitted: boolean;
  total: number | null;
  form: FormPuntuado;
}

export interface EstadoFinanciera extends Omit<EstadoPuntuado, 'form'> {
  oferenteCalificadoFinanciera: boolean | null;
  form: FormFinanciera;
}

export interface EstadoTecnica extends EstadoPuntuado {
  oferenteCalificadoTecnica: boolean | null;
}

export interface EstadoEvaluacion {
  submitted: boolean;
  oferenteEvaluadoTecnico: boolean | null;
  oferenteEvaluadoEconomico: boolean | null;
  totalTecnico: number | null;
  totalEconomico: number | null;
  notaBase: number | null;
  form: FormEvaluacion;
}

export interface EstadoPromocion {
  submitted: boolean;
  totalPuntosPromocion: number | null;
  puntuacionFinalConBonos: number | null;
  form: FormPromocion;
}

export interface Unlocked {
  financiera: boolean;
  tecnica: boolean;
  evaluacion: boolean;
  promocion: boolean;
}
