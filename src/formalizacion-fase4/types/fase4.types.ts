/** Tipos de la Fase 4 de gestión, compartidos entre servicio y controlador. */

export type CaracterAdjudicacion = 'TOTAL' | 'PARCIAL';

/** Situación de un oferente calificado dentro de la Fase 4. */
export type EstatusOferenteFase4 = 'ADJUDICADO' | 'RESERVA' | 'DECAIDO' | 'EN_DECAIMIENTO';

/** Una cláusula, en el mismo formato que `modeloContratoData.clauses`. */
export interface ClausulaContrato {
  id?: string;
  instanceId?: string;
  order?: number;
  titulo?: string;
  cuerpoHtml?: string;
  kind?: 'preceptiva' | 'facultativa';
  origen?: 'generica' | 'biblioteca' | 'custom';
  codigo?: string;
  basamentoLegal?: string;
  variablesSugeridas?: string[];
}

export interface ResumenContrato {
  estado: 'BORRADOR' | 'GENERADO';
  generadoAt: Date | null;
  documentoId: string | null;
  estaDesactualizado: boolean;
}

export interface OferenteFase4 {
  evaluacionId: string;
  nombre: string;
  rif: string;
  representanteLegal: string | null;
  posicionPrelacion: string | null;
  puntuacionFinal: number | null;
  montoOfertaBs: number | null;
  estatus: EstatusOferenteFase4;
  montoContratoBs: number | null;
  alcance: string | null;
  contrato: ResumenContrato | null;
}

export interface CandidatoSubsiguiente {
  evaluacionId: string;
  nombre: string;
  rif: string;
  posicionPrelacion: string | null;
  montoOfertaBs: number | null;
}

export interface ParticipanteCierre {
  evaluacionId: string;
  nombre: string;
  rif: string;
  notificacionEmitidaAt: Date | null;
}

export interface GatesFase4 {
  /** La Fase 3 ya definió carácter y dictámenes. */
  faseHabilitada: boolean;
  decaimientoHabilitado: boolean;
  /** TOTAL con ciclo abierto: no se toca ningún contrato. */
  contratosBloqueados: boolean;
  puedeDeclararDecaimiento: boolean;
}
