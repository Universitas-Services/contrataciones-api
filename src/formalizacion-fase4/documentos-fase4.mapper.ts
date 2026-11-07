import { numeroALetras } from '../common/utils/numero-a-letras.util';
import { LINEA_VACIA, aTextoPlano, renderizarPildoras } from './pildoras.util';
import { fechaLarga, formatearBs, montoFielCumplimiento } from './tokens-contrato.resolver';
import type { ClausulaContrato } from './types/fase4.types';

/**
 * Datos que reciben las plantillas `.docx` de la Fase 4.
 *
 * Las plantillas todavía no existen: los nombres de variables y de bloques
 * condicionales se ajustan aquí cuando lleguen los textos legales (§7 del brief
 * y PDF 3). Un dato ausente se pinta como línea, igual que en las cláusulas.
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

/** El contrato: variables resueltas y cláusulas en texto plano, en su orden. */
export function mapDatosContrato(
  tokens: Record<string, string | null>,
  clausulas: ClausulaContrato[],
) {
  const variables = Object.fromEntries(
    Object.entries(tokens).map(([clave, valor]) => [clave, texto(valor)]),
  );

  return {
    ...variables,
    clausulas: [...clausulas]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((clausula) => ({
        titulo: clausula.titulo ?? '',
        cuerpo: aTextoPlano(renderizarPildoras(clausula.cuerpoHtml ?? '', tokens, 'VALOR')),
      })),
  };
}
