import { numeroALetras } from '../common/utils/numero-a-letras.util';
import { type CondicionesBloques, expandirBloques } from './bloques-contrato';
import { LINEA_VACIA, aTextoPlano, renderizarPildoras } from './pildoras.util';
import { fechaLarga, formatearBs, montoFielCumplimiento } from './tokens-contrato.resolver';
import type { ClausulaContrato } from './types/fase4.types';

/**
 * Datos que reciben las plantillas `.docx` de la Fase 4.
 *
 * El contrato ya usa las marcas de su prototipo. Los documentos del ciclo aún no
 * tienen plantilla: sus nombres se ajustan aquí cuando se integren. Un dato
 * ausente se pinta como línea, igual que en las cláusulas.
 */

export interface OferenteDocumento {
  nombreProveedorEvaluado: string | null;
  rifProveedorEvaluado: string | null;
}

export interface EntradaDocumentoCiclo {
  expediente: {
    codigoNomenclatura: string | null;
    descripcionObjeto: string | null;
    ente: { nombre: string | null; rif: string | null } | null;
    fasePreparatoria: { porcentajeFielCumplimiento: unknown } | null;
  };
  ciclo: {
    numeroCiclo: number;
    caracterSnapshot: string;
    decision: string | null;
    causalDecaimiento: string | null;
    fechaNotificacionAdjudicacionIncumplidor: Date | null;
    fechaCertificacionIncumplimiento: Date | null;
    fechaVencimientoGarantias: Date | null;
    fechaVencimientoFirmaContrato: Date | null;
    alcanceReadjudicacionParcial: string | null;
    montoReadjudicadoParcialBs: unknown;
    montoReadjudicadoBs: unknown;
    plazoEjecucionSubsiguiente: number | null;
    modalidadDegradadaSugerida: string | null;
    renglonesAfectadosDecaimiento: string | null;
    numResolucionDecaimiento: string | null;
    fechaResolucionDecaimiento: Date | null;
    infractor: OferenteDocumento;
    subsiguiente: OferenteDocumento | null;
  };
  /** Quien recibe la notificación, cuando el documento va a un oferente. */
  destinatario: OferenteDocumento | null;
}

function texto(valor: string | number | null | undefined): string {
  return valor == null || `${valor}`.trim() === '' ? LINEA_VACIA : `${valor}`;
}

function fecha(valor: Date | null): string {
  return valor ? fechaLarga(valor) : LINEA_VACIA;
}

function montoEnNumeros(monto: number | null): string {
  return monto != null ? formatearBs(monto) : LINEA_VACIA;
}

function montoEnLetras(monto: number | null): string {
  return monto != null ? numeroALetras(monto) : LINEA_VACIA;
}

export function mapDatosCiclo({ expediente, ciclo, destinatario }: EntradaDocumentoCiclo) {
  const esParcial = ciclo.caracterSnapshot === 'PARCIAL';
  const montoCrudo = esParcial ? ciclo.montoReadjudicadoParcialBs : ciclo.montoReadjudicadoBs;
  const monto = montoCrudo == null ? null : Number(montoCrudo);
  const porcentaje = expediente.fasePreparatoria?.porcentajeFielCumplimiento;
  const fianza = montoFielCumplimiento(monto, porcentaje == null ? null : Number(porcentaje));

  return {
    // Bloques condicionales
    es_parcial: esParcial,
    es_total: !esParcial,
    decision_subsiguiente: ciclo.decision === 'SUBSIGUIENTE',
    decision_desierto: ciclo.decision === 'DESIERTO',

    // Expediente y ente
    nombre_ente_contratante_au_au: texto(expediente.ente?.nombre),
    rif_ente_au_au: texto(expediente.ente?.rif),
    nomenclatura_proceso_au_au: texto(expediente.codigoNomenclatura),
    objeto_contratacion_au_au: texto(expediente.descripcionObjeto),

    // Ciclo
    numero_ciclo_au_au: texto(ciclo.numeroCiclo),
    causal_decaimiento_au_au: texto(ciclo.causalDecaimiento),
    fecha_notificacion_adjudicacion_incumplidor_au_au: fecha(
      ciclo.fechaNotificacionAdjudicacionIncumplidor,
    ),
    fecha_certificacion_incumplimiento_au_au: fecha(ciclo.fechaCertificacionIncumplimiento),
    fecha_vencimiento_garantias_au_au: fecha(ciclo.fechaVencimientoGarantias),
    fecha_vencimiento_firma_contrato_au_au: fecha(ciclo.fechaVencimientoFirmaContrato),
    num_resolucion_decaimiento_au_au: texto(ciclo.numResolucionDecaimiento),
    fecha_resolucion_decaimiento_au_au: fecha(ciclo.fechaResolucionDecaimiento),

    // Oferentes
    nombre_infractor_au_au: texto(ciclo.infractor.nombreProveedorEvaluado),
    rif_infractor_au_au: texto(ciclo.infractor.rifProveedorEvaluado),
    nombre_subsiguiente_au_au: texto(ciclo.subsiguiente?.nombreProveedorEvaluado),
    rif_subsiguiente_au_au: texto(ciclo.subsiguiente?.rifProveedorEvaluado),
    nombre_destinatario_au_au: texto(destinatario?.nombreProveedorEvaluado),
    rif_destinatario_au_au: texto(destinatario?.rifProveedorEvaluado),

    // Readjudicación
    alcance_readjudicacion_parcial_au_au: texto(ciclo.alcanceReadjudicacionParcial),
    monto_readjudicado_numeros_au_au: montoEnNumeros(monto),
    monto_readjudicado_letras_au_au: montoEnLetras(monto),
    plazo_ejecucion_subsiguiente_au_au: texto(ciclo.plazoEjecucionSubsiguiente),
    monto_fiel_cumplimiento_subsiguiente_bs_au_au: montoEnNumeros(fianza),

    // Desierto
    modalidad_degradada_sugerida_au_au: texto(ciclo.modalidadDegradadaSugerida),
    renglones_afectados_decaimiento_au_au: texto(ciclo.renglonesAfectadosDecaimiento),
  };
}

const UNIDADES = [
  '',
  'PRIMERA',
  'SEGUNDA',
  'TERCERA',
  'CUARTA',
  'QUINTA',
  'SEXTA',
  'SÉPTIMA',
  'OCTAVA',
  'NOVENA',
];
const DECENAS = ['', 'DÉCIMA', 'VIGÉSIMA', 'TRIGÉSIMA', 'CUADRAGÉSIMA', 'QUINCUAGÉSIMA'];

/** Número de cláusula en ordinal: 1 → PRIMERA, 22 → VIGÉSIMA SEGUNDA. */
export function ordinalClausula(numero: number): string {
  const decena = DECENAS[Math.floor(numero / 10)];
  if (decena === undefined) return `${numero}`;
  return [decena, UNIDADES[numero % 10]].filter(Boolean).join(' ');
}

/** Lo que el contrato necesita además de las variables de las cláusulas. */
export interface DatosDocumentoContrato {
  bloques: CondicionesBloques;
  /** Autoridad o delegado que firma. Lo que no aplica viene vacío. */
  firmas: Record<string, string>;
  fechaFirma: string | null;
}

/** El contrato: marcas del prototipo y cláusulas en texto plano, en su orden. */
export function mapDatosContrato(
  tokens: Record<string, string | null>,
  clausulas: ClausulaContrato[],
  { bloques, firmas, fechaFirma }: DatosDocumentoContrato,
) {
  return {
    ...firmas,

    desc_objeto_contratacion_au_au: texto(tokens.objeto_contratacion_au_au),
    cod_nomenclatura_proceso_au_au: texto(tokens.nomenclatura_proceso_au_au),
    nom_ente_contratante: texto(tokens.nombre_ente_contratante_au_au),
    organo_adscripcion: texto(tokens.organo_adscripcion_au_au),
    rif_ente: texto(tokens.rif_ente_au_au),
    loc_ciudad_ente: texto(tokens.ciudad_domicilio_especial_au_au),
    fec_limite_firma_contrato_au_au: texto(fechaFirma),

    oferente_primera_opción_au_au: texto(tokens.nombre_contratista_au_au),
    rif_proveedor_evaluado_au_au: texto(tokens.rif_contratista_au_au),
    datos_registro_mercantil_proveedor_evaluado_au_au: texto(tokens.registro_mercantil_au_au),
    nombre_rep_legal_evaluado_au_au: texto(tokens.representante_contratista_au_au),
    cedula_rep_legal_evaluado_au_au: texto(tokens.cedula_representante_au_au),

    clausulas_custom_au_au: [...clausulas]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((clausula, indice) => ({
        num_clausula_custom_au_au: ordinalClausula(indice + 1),
        titulo_clausula_custom_au_au: clausula.titulo ?? '',
        cuerpo_clausula_custom_au_au: aTextoPlano(
          renderizarPildoras(expandirBloques(clausula.cuerpoHtml ?? '', bloques), tokens, 'VALOR'),
        ),
      })),
  };
}
