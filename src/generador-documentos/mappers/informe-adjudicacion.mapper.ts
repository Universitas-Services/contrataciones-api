import { formatCurrencyVE } from '../../common/utils/date-formatter.util';
import { enteroALetras } from '../../common/utils/numero-a-letras.util';
import { ETIQUETAS_PRELACION } from '../../evaluacion-fase3/hub/prelacion.service';
import type { EstadoPromocion } from '../../evaluacion-fase3/hub/types/hub.types';
import type { TextosEstatus } from './informe-desierto.mapper';

/**
 * Secciones propias del Informe de Recomendación de adjudicación (Fase 3):
 * análisis de costos, formalidades, determinación de opciones, recomendación
 * TOTAL/PARCIAL, desierto parcial, CRS, garantías y numerales ordinales.
 * Las secciones 1 a 6 (oferentes, calificación, evaluación) las aporta mapOferentesDesierto.
 */

type Numerico = number | string | { toString(): string } | null | undefined;

export interface DictamenInforme {
  evaluacionId: string;
  tipoDictamen: string;
  partidasAdjudicadasTotal: string | null;
  montoAdjudicadoTotal: Numerico;
  plazoEjecucionOfertaGanadora: number | null;
  oferenteAdjudicadoProcedimiento: boolean | null;
  cantidadRenglones: number | null;
  alcanceAdjudicacionParcial: string | null;
  partidasAdjudicadasParcial: string | null;
  montoAdjudicadoParcial: Numerico;
  plazoEjecucionOfertaParcial: number | null;
  montoManoObraOfertado: Numerico;
  createdAt: Date;
}

export interface EvaluacionInforme {
  id: string;
  nombreProveedorEvaluado: string;
  rifProveedorEvaluado: string;
  oferenteCalificado: boolean | null;
  posicionPrelacion: string | null;
  totalEvaluacion: Numerico;
  hubPromocion: unknown;
}

export interface FaseInforme {
  porcentajeFielCumplimiento: Numerico;
  retencionFielCumplimiento: boolean | null;
  requiereGarantiaLaboral: boolean | null;
  porcentajeGarantiaLaboral: Numerico;
  retencionFianzaLaboral: boolean | null;
  calificacionLegalData: unknown;
}

export interface InformeForm {
  existeItemsSinOfertas: boolean | null;
  itemsSinOfertas: string | null;
  motivoItemsSinOfertas: string | null;
  actualizacionPresupuesto: boolean | null;
  montoNuevoPresupuesto: Numerico;
  justificacionActualizacionPresup: string | null;
  observacionFormalidades: boolean | null;
  omisionFormalidades: string | null;
  subsanacionActo: string | null;
  datosActoSubsanacion: string | null;
}

/** Textos de estatus del informe de adjudicación (lógica de documentación). */
export const ESTATUS_INFORME_ADJUDICACION: TextosEstatus = {
  legal: ['sí califica legalmente', 'no califica legalmente'],
  financiera: ['sí califica financieramente', 'no califica financieramente'],
};

const ORDINALES = [
  'PRIMERO',
  'SEGUNDO',
  'TERCERO',
  'CUARTO',
  'QUINTO',
  'SEXTO',
  'SÉPTIMO',
  'OCTAVO',
  'NOVENO',
  'DÉCIMO',
  'UNDÉCIMO',
  'DUODÉCIMO',
  'DECIMOTERCERO',
  'DECIMOCUARTO',
  'DECIMOQUINTO',
  'DECIMOSEXTO',
  'DECIMOSÉPTIMO',
  'DECIMOCTAVO',
  'DECIMONOVENO',
  'VIGÉSIMO',
];
const ordinal = (n: number) => ORDINALES[n - 1] ?? String(n);

const num = (v: Numerico): number => {
  const n = Number(v ?? NaN);
  return Number.isFinite(n) ? n : 0;
};
const bs = (v: number) => formatCurrencyVE(v);
/** Cifra en palabras sin la palabra "bolívares" (la plantilla ya la escribe). */
const letras = (v: number) => {
  const entero = Math.floor(Math.abs(v));
  const centimos = Math.round((Math.abs(v) - entero) * 100);
  const texto = enteroALetras(entero);
  return centimos > 0 ? `${texto} CON ${String(centimos).padStart(2, '0')}/100` : texto;
};

const normalizar = (v: string | null | undefined) =>
  (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const esPosicion = (v: string | null | undefined, etiqueta: string) =>
  normalizar(v) === normalizar(etiqueta);

// ── Textos de la lógica de automatización ────────────────────────────────

const TEXTO_RIF = '- Copia del Registro de Información Fiscal (R.I.F.).';
const TEXTO_RIF_SUSTITUTO =
  '- Copia del Registro de Información Fiscal (R.I.F.) o declaración jurada de Registro de Información Fiscal (R.I.F.) (Ver Modelo en Anexo III) en caso de que el proponente acredite que el documento se encuentra en proceso de actualización o trámite ante el SENIAT.';
const TEXTO_RNC =
  '- Certificado de Inscripción en el Registro Nacional de Contratistas, con el respectivo reporte de calificación o Planilla Resumen.';
const TEXTO_RNC_SUSTITUTO =
  "- Certificado de Inscripción en el Registro Nacional de Contratistas, con el respectivo reporte de calificación o Planilla Resumen o Declaración Jurada de Registro en Trámite (R.N.C.) (Ver Modelo en Anexo III); no obstante, el adjudicado quedará obligado a consignar el certificado en status 'Calificado' vigente como condición indispensable para la formalización del contrato, de conformidad con el Artículo 48 de la LCP.";
const TEXTO_DESEMPENO =
  '-Informe de Evaluación de desempeño en Contrataciones de los últimos dos (2) años, para determinar el Nivel General de Evaluación del Contratista en los últimos veinticuatro (24) meses según el Servicio Nacional de Contratista (SNC), en caso de haber contratado con el Estado.';
const TEXTO_DESEMPENO_SUSTITUTO =
  '-Informe de Evaluación de desempeño en Contrataciones: Su ausencia en la oferta constituye una omisión no sustancial, siempre que se consigne la Declaración Jurada de Evaluación de Desempeño (Ver Anexo III). Asimismo, en aquellos casos donde el oferente no posea historial previo de contratación con el sector público, deberá adjuntar al menos dos (02) referencias comerciales de empresas privadas como medio alternativo para validar su capacidad técnica, de conformidad con lo previsto en los Artículos 51 de la LCP y 61 de su Reglamento';

const ANALISIS_TOTAL =
  'De conformidad con lo establecido en el Artículo 95 de la LCP y el Artículo 21 de las Normas de Control Interno de la SUNAI, esta Comisión asienta que se procedió a realizar un análisis comparativo de la oferta económica frente al Presupuesto Base actualizado, determinándose que los precios unitarios presentados guardan una relación de razonabilidad técnica con los valores del mercado. Asimismo, se verificó la estructura de costos de la empresa, constatando que los márgenes de utilidad y costos operativos se ajustan a lo indicado en el Pliego de condiciones, garantizando la eficiencia del gasto público.';
const ANALISIS_PARCIAL =
  'De conformidad con lo establecido en el Artículo 95 de la LCP y el Artículo 21 de las Normas de Control Interno de la SUNAI, esta Comisión asienta que tras el examen detallado de las ofertas ítem por ítem, se determinó que la distribución propuesta responde al criterio de menor precio unitario y mayor disponibilidad técnica. Los montos se contrastaron con la estructura de costos institucional, certificando que los precios son justos y razonables, asegurando el abastecimiento oportuno y optimizando los fondos públicos.';

/** Numerales de la recomendación, con los valores fijos que define la lógica. */
interface Numerales {
  advertencia?: number;
  prelacion?: number;
  potestad?: number;
  desierto: number;
  crs: number;
  cumplimiento: number;
  laboral: number;
  notificar: number;
  consultoria: number;
}

function calcularNumerales(
  caracter: 'TOTAL' | 'PARCIAL',
  haySegunda: boolean,
  adjudicados: number,
): Numerales {
  if (caracter === 'TOTAL') {
    const [desierto, crs, cumplimiento, laboral, notificar, consultoria] = haySegunda
      ? [5, 6, 7, 8, 9, 10]
      : [3, 4, 5, 6, 8, 9];
    return { desierto, crs, cumplimiento, laboral, notificar, consultoria };
  }
  const advertencia = adjudicados + 1;
  const prelacion = advertencia + 1;
  const potestad = prelacion + 1;
  const desierto = (haySegunda ? potestad : advertencia) + 1;
  const crs = desierto + 1;
  const cumplimiento = crs + 1;
  const laboral = cumplimiento + 1;
  const notificar = laboral + 1;
  const consultoria = notificar + 1;
  return {
    advertencia,
    prelacion,
    potestad,
    desierto,
    crs,
    cumplimiento,
    laboral,
    notificar,
    consultoria,
  };
}

export function mapInformeAdjudicacion(input: {
  caracter: 'TOTAL' | 'PARCIAL';
  fase: FaseInforme;
  informe: InformeForm;
  evaluaciones: EvaluacionInforme[];
  dictamenes: DictamenInforme[];
}): Record<string, unknown> {
  const { caracter, fase, informe, evaluaciones, dictamenes } = input;
  const esTotal = caracter === 'TOTAL';

  // ── Recaudos con sustituto (RIF / RNC / desempeño) ────────────────────
  const legal = (fase.calificacionLegalData ?? {}) as { sustitutos?: Record<string, boolean> };
  const sust = legal.sustitutos ?? {};

  // ── Prelación (ranking de evaluación de Fase 2) ───────────────────────
  const calificados = evaluaciones.filter((e) => e.oferenteCalificado === true);
  const puntuacionFinal = (e: EvaluacionInforme) => {
    const promo = e.hubPromocion as EstadoPromocion | null;
    return promo?.submitted && promo.puntuacionFinalConBonos != null
      ? promo.puntuacionFinalConBonos
      : num(e.totalEvaluacion);
  };
  const rango = (e: EvaluacionInforme) => {
    const i = ETIQUETAS_PRELACION.findIndex((et) => esPosicion(e.posicionPrelacion, et));
    return i === -1 ? 99 : i;
  };
  const ordenados = [...calificados].sort(
    (a, b) => rango(a) - rango(b) || puntuacionFinal(b) - puntuacionFinal(a),
  );
  const identidad = (e: EvaluacionInforme) => ({
    nombre_proveedor_evaluado_au_au: e.nombreProveedorEvaluado || '___',
    rif_proveedor_evaluado_au_au: e.rifProveedorEvaluado || '___',
  });

  const primera = ordenados.find((e) => esPosicion(e.posicionPrelacion, 'Primera Opción'));
  const segunda = ordenados.find((e) => esPosicion(e.posicionPrelacion, 'Segunda Opción'));
  const tercera = ordenados.find((e) => esPosicion(e.posicionPrelacion, 'Tercera Opción'));

  // Objeto de sección: cambia el contexto para que "{nombre_proveedor_evaluado_au_au}"
  // del texto TOTAL apunte a la segunda/tercera opción sin tocar la plantilla.
  const opcion_varias_ofertas_au_au = segunda
    ? {
        ...identidad(segunda),
        nombre_segunda_opcion_au_au: segunda.nombreProveedorEvaluado || '___',
        rif_segunda_opcion_au_au: segunda.rifProveedorEvaluado || '___',
        nombre_tercera_opcion_au_au: tercera?.nombreProveedorEvaluado || '___',
        rif_tercera_opcion_au_au: tercera?.rifProveedorEvaluado || '___',
        oferente_tercera_opcion_au_au: tercera ? identidad(tercera) : false,
      }
    : false;

  // ── Dictámenes ────────────────────────────────────────────────────────
  const evalPorId = new Map(evaluaciones.map((e) => [e.id, e]));
  const pctFiel = num(fase.porcentajeFielCumplimiento);
  const pctLaboral = num(fase.porcentajeGarantiaLaboral);
  const garantias = (montoAdjudicado: number, manoObra: Numerico) => {
    const fiel = montoAdjudicado * 0.16 * (pctFiel / 100);
    const laboral = num(manoObra) * (pctLaboral / 100);
    return {
      porcentaje_fiel_cumplimiento_au_au: String(pctFiel),
      monto_fiel_cumplimiento_bs_au_au: bs(fiel),
      monto_fiel_cumplimiento_bs_letras_au_au: letras(fiel),
      monto_fiel_cumplimiento_bs_letras: letras(fiel),
      porcentaje_garantia_laboral_au_au: String(pctLaboral),
      monto_garantia_laboral_bs_au_au: manoObra == null ? '___' : bs(laboral),
      monto_garantia_laboral_bs_letras_au_au: manoObra == null ? '___' : letras(laboral),
      monto_garantia_laboral_bs_letra_au_au: manoObra == null ? '___' : letras(laboral),
    };
  };

  // En TOTAL también hay dictámenes de no adjudicados (causa): solo cuenta el adjudicado.
  const totalesAdjudicados = esTotal
    ? dictamenes.filter((d) => d.tipoDictamen === 'TOTAL' && d.oferenteAdjudicadoProcedimiento)
    : [];
  const dictamenTotal =
    totalesAdjudicados.find((d) => d.evaluacionId === primera?.id) ?? totalesAdjudicados[0];
  const adjudicadoTotal = dictamenTotal ? evalPorId.get(dictamenTotal.evaluacionId) : undefined;

  const adjudicadosParcial = esTotal
    ? []
    : dictamenes
        .filter((d) => d.tipoDictamen === 'PARCIAL' && d.oferenteAdjudicadoProcedimiento === true)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((d, i) => {
          const ev = evalPorId.get(d.evaluacionId);
          const monto = num(d.montoAdjudicadoParcial);
          return {
            numeral_adjudicacion_au_au: ordinal(i + 1),
            oferente_adjudicado_au_au: ev?.nombreProveedorEvaluado || '___',
            rif_oferente_adjudicado_au_au: ev?.rifProveedorEvaluado || '___',
            cantidad_renglones_parcial_au_au: d.cantidadRenglones ?? '___',
            alcance_adjudicacion_parcial_au_au: d.alcanceAdjudicacionParcial || '___',
            partidas_adjudicadas_parcial_au_au: d.partidasAdjudicadasParcial || '___',
            monto_adjudicado_parcial_au_au: bs(monto),
            plazo_ejecucion_oferta_parcial_au_au: d.plazoEjecucionOfertaParcial ?? '___',
            ...garantias(monto, d.montoManoObraOfertado),
          };
        });

  const n = calcularNumerales(caracter, !!segunda, adjudicadosParcial.length);
  const montoTotal = num(dictamenTotal?.montoAdjudicadoTotal);

  // ── Informe (formulario de Fase 3) ────────────────────────────────────
  const actualizacion = informe.actualizacionPresupuesto
    ? `Se procedió a actualizar el presupuesto base a Bs. ${bs(num(informe.montoNuevoPresupuesto))}, debido a ${informe.justificacionActualizacionPresup || '___'}, para asegurar una comparación justa y objetiva de las ofertas.`
    : 'No fue necesario actualizar el presupuesto base, ya que las ofertas recibidas se encuentran dentro de un rango razonable respecto a la estimación inicial.';
  const formalidades = informe.observacionFormalidades
    ? `Se observó: ${informe.omisionFormalidades || '___'}, y se decidió ${informe.subsanacionActo || '___'} mediante ${informe.datosActoSubsanacion || '___'} para garantizar la legalidad del proceso.`
    : 'No se observaron omisiones de formalidades durante el procedimiento.';
  const hayDesiertoParcial = informe.existeItemsSinOfertas === true;

  return {
    // Recaudos con sustituto
    texto_mod_copia_rif_vigente_au_au: sust.sustitutoDjRifVigenteAuAu
      ? TEXTO_RIF_SUSTITUTO
      : TEXTO_RIF,
    texto_mod_certificado_rnc_au_au: sust.sustitutoDjCertificadoRncAuAu
      ? TEXTO_RNC_SUSTITUTO
      : TEXTO_RNC,
    texto_mod_evaluacion_desempeno_au_au: sust.sustitutoDjEvalDesempenoAuAu
      ? TEXTO_DESEMPENO_SUSTITUTO
      : TEXTO_DESEMPENO,

    // 7 y 8
    analisis_resultados_consolidados_au_au: esTotal ? ANALISIS_TOTAL : ANALISIS_PARCIAL,
    actualizacion_presupuesto_au_au: actualizacion,
    observacion_formalidades_au_au: formalidades,

    // 9. Determinación de opciones
    determinacion_opciones_total_au_au: esTotal,
    determinacion_opciones_parcial_au_au: !esTotal,
    opciones_prelacion_total_au_au: ordenados.map((e) => ({
      ...identidad(e),
      posicion_prelacion_au_au: e.posicionPrelacion || '___',
      puntuacion_final_con_bonos_au_au: puntuacionFinal(e).toFixed(2),
    })),
    opciones_parcial_au_au: adjudicadosParcial,
    items_desierta_parcial_au_au: hayDesiertoParcial,
    declaratoria_desierta_parcial_au_au: hayDesiertoParcial,
    items_sin_ofertas_au_au: informe.itemsSinOfertas || '___',
    motivo_items_sin_ofertas_au_au: informe.motivoItemsSinOfertas || '___',

    // 10. Recomendación TOTAL (raíz = Primera Opción)
    recomendacion_adjudicacion_total_au_au: esTotal,
    ...(adjudicadoTotal ? identidad(adjudicadoTotal) : primera ? identidad(primera) : {}),
    partidas_adjudicadas_total_au_au: dictamenTotal?.partidasAdjudicadasTotal || '___',
    monto_adjudicado_total_au_au: dictamenTotal ? bs(montoTotal) : '___',
    plazo_ejecucion_oferta_ganadora_au_au: dictamenTotal?.plazoEjecucionOfertaGanadora ?? '___',
    opcion_varias_ofertas_au_au,

    // 10. Recomendación PARCIAL
    recomendacion_adjudicacion_parcial_au_au: !esTotal,
    recomendacion_parcial_au_au: adjudicadosParcial,
    numeral_advertencia_parcial_au_au: n.advertencia ? ordinal(n.advertencia) : '___',
    numeral_prelacion_parcial_au_au: n.prelacion ? ordinal(n.prelacion) : '___',
    numeral_potestad_parcial_au_au: n.potestad ? ordinal(n.potestad) : '___',

    // Numerales comunes
    numeral_desierto_au_au: ordinal(n.desierto),
    numeral_crs_au_au: ordinal(n.crs),
    numeral_garantias_cumplimiento_au_au: ordinal(n.cumplimiento),
    numeral_garantias_laboral_au_au: ordinal(n.laboral),
    numeral_notificar_au_au: ordinal(n.notificar),
    numeral_consultoria_au_au: ordinal(n.consultoria),

    // Garantías
    garantia_cumplimiento_total_au_au: esTotal,
    garantia_cumplimiento_parcial_au_au: !esTotal,
    monto_garantia_cumplimiento_parcial_au_au: adjudicadosParcial,
    retencion_fiel_cumplimiento_au_au: fase.retencionFielCumplimiento === true,
    requiere_garantia_laboral_au_au: fase.requiereGarantiaLaboral === true,
    garantia_laboral_total_au_au: esTotal,
    garantia_laboral_parcial_au_au: !esTotal,
    monto_garantia_laboral_parcial_au_au: adjudicadosParcial,
    retencion_garantia_laboral_au_au: fase.retencionFianzaLaboral === true,
    ...garantias(montoTotal, dictamenTotal?.montoManoObraOfertado),
  };
}
