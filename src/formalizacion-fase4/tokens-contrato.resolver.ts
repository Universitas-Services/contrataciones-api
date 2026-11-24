import { cifraEnLetras, numeroALetras } from '../common/utils/numero-a-letras.util';

/**
 * Resuelve el diccionario `data-token-id` → valor para el contrato de un
 * oferente adjudicado.
 *
 * Todas las variables salen de la base; ninguna se le pide al usuario
 * (Principio de Dato Único). Lo que no exista queda en `null` y la píldora se
 * pinta como línea para llenar a mano.
 */

export interface DatosToken {
  ente: {
    nombre: string | null;
    rif: string | null;
    organoAdscripcion: string | null;
    ciudad: string | null;
  };
  expediente: {
    descripcionObjeto: string | null;
    codigoNomenclatura: string | null;
  };
  oferta: {
    nombreProveedorOferente: string | null;
    rifProveedorOferente: string | null;
    nombreRepLegalOferente: string | null;
    cedulaRepLegalOferente: string | null;
    datosRegistroMercantilProveedorOferente: string | null;
  };
  /** Monto definitivo del contrato (ver `montoContrato` del servicio). */
  montoContratoBs: number | null;
  partidasPresupuestarias: string | null;
  plazoEjecucionDias: number | null;
  /** Datos de la Fase 1 que alimentan las cláusulas de garantías y del CRS. */
  fase1?: {
    porcentajeFielCumplimiento: number | null;
    porcentajeGarantiaLaboral: number | null;
    porcentajeAnticipo: number | null;
    porcentajeResponsabilidadSocial: number | null;
    lugarLogisticaEjecucion: string | null;
    porcentajeResponsabilidadCivil?: number | null;
    montoResponsabilidadCivilBs?: number | null;
    modalidadCrs?: string | null;
    unidadRespCumplimientoCrs?: string | null;
  };
  /** Base de la fianza laboral (dictamen del adjudicado). */
  montoManoObraOfertado?: number | null;
  nombreUnidadUsuaria?: string | null;
  fechaAdjudicacion?: Date | null;
}

/** Lo que el Modelo de Contrato de Fase 1 conoce del expediente. */
export interface ExpedienteTokensFase1 {
  descripcionObjeto?: string | null;
  codigoNomenclatura?: string | null;
  ente?: {
    nombre?: string | null;
    rif?: string | null;
    organoAdscripcion?: string | null;
    ciudad?: string | null;
  } | null;
  unidadUsuaria?: { nombreUnidadUsuaria?: string | null } | null;
  fasePreparatoria?: Record<string, unknown> | null;
}

/**
 * Las variables que ya existen en la Fase 1. El contratista, el monto y lo que
 * se calcula con él llegan en la Fase 4: aquí quedan en `null`.
 */
export function resolverTokensFase1(exp: ExpedienteTokensFase1): Record<string, string | null> {
  const f = exp.fasePreparatoria ?? {};
  const num = (v: unknown) => (v == null || v === '' ? null : Number(v));
  const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
  return resolverTokens({
    ente: {
      nombre: exp.ente?.nombre ?? null,
      rif: exp.ente?.rif ?? null,
      organoAdscripcion: exp.ente?.organoAdscripcion ?? null,
      ciudad: exp.ente?.ciudad ?? null,
    },
    expediente: {
      descripcionObjeto: exp.descripcionObjeto ?? null,
      codigoNomenclatura: exp.codigoNomenclatura ?? null,
    },
    oferta: {
      nombreProveedorOferente: null,
      rifProveedorOferente: null,
      nombreRepLegalOferente: null,
      cedulaRepLegalOferente: null,
      datosRegistroMercantilProveedorOferente: null,
    },
    montoContratoBs: null,
    partidasPresupuestarias: null,
    plazoEjecucionDias: num(f.plazoEjecucionProcedimiento),
    fase1: {
      porcentajeFielCumplimiento: num(f.porcentajeFielCumplimiento),
      porcentajeGarantiaLaboral: num(f.porcentajeGarantiaLaboral),
      porcentajeAnticipo: num(f.porcentajeAnticipo),
      porcentajeResponsabilidadSocial: num(f.porcentajeResponsabilidadSocial),
      lugarLogisticaEjecucion: texto(f.lugarLogisticaEjecucion),
      porcentajeResponsabilidadCivil: num(f.porcentajeResponsabilidadCivil),
      montoResponsabilidadCivilBs: num(f.montoResponsabilidadCivilBs),
      modalidadCrs: texto(f.modalidadCrs),
      unidadRespCumplimientoCrs: texto(f.unidadRespCumplimientoCrs),
    },
    nombreUnidadUsuaria: exp.unidadUsuaria?.nombreUnidadUsuaria ?? null,
  });
}

/**
 * Fianza de fiel cumplimiento. Es la única fórmula: la usan el Informe, el Acta y las
 * notificaciones de Fase 3, y los documentos de Fase 4.
 *
 *   (monto × 0,16 + monto) × (porcentaje / 100)
 */
export function montoFielCumplimiento(
  montoContratoBs: number | null,
  porcentaje: number | null,
): number | null {
  if (montoContratoBs == null || porcentaje == null) return null;
  return (montoContratoBs * 0.16 + montoContratoBs) * (porcentaje / 100);
}

/**
 * Une las partidas de varios dictámenes sin repetir, conservando el orden. Cada
 * entrada puede traer varias partidas separadas por coma o punto y coma. Lo que se
 * escribió detrás del código ("401-07-83-00 UNIDAD") no forma parte de la partida.
 */
export function unirPartidas(...listas: (string | null | undefined)[]): string | null {
  const partidas = listas
    .flatMap((lista) => (lista ?? '').split(/[,;]/))
    .map((p) => p.trim().replace(/^(\d[\d.-]*\d)\s+\D+$/, '$1'));
  const unicas = [...new Set(partidas.filter(Boolean))];
  return unicas.length ? unicas.join(', ') : null;
}

/** `367.500,00` — las cláusulas ya escriben "Bs." antes de la variable. */
export function formatearMonto(monto: number): string {
  return monto.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `Bs. 367.500,00` — el formato de los documentos del ciclo de decaimiento. */
export function formatearBs(monto: number): string {
  return `Bs. ${formatearMonto(monto)}`;
}

export function fechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function resolverTokens(datos: DatosToken): Record<string, string | null> {
  const monto = datos.montoContratoBs;
  const fianza = montoFielCumplimiento(monto, datos.fase1?.porcentajeFielCumplimiento ?? null);
  const montoCrs =
    monto != null && datos.fase1?.porcentajeResponsabilidadSocial != null
      ? monto * (datos.fase1.porcentajeResponsabilidadSocial / 100)
      : null;
  const fianzaLaboral =
    datos.montoManoObraOfertado != null && datos.fase1?.porcentajeGarantiaLaboral != null
      ? datos.montoManoObraOfertado * (datos.fase1.porcentajeGarantiaLaboral / 100)
      : null;
  const montoPoliza = datos.fase1?.montoResponsabilidadCivilBs ?? null;
  const porcentaje = (valor: number | null | undefined) => (valor != null ? `${valor}%` : null);

  return {
    // ── Ente contratante ──────────────────────────────────────────────
    nombre_ente_contratante_au_au: datos.ente.nombre,
    rif_ente_au_au: datos.ente.rif,
    organo_adscripcion_au_au: datos.ente.organoAdscripcion,
    ciudad_domicilio_especial_au_au: datos.ente.ciudad,

    // ── Expediente ────────────────────────────────────────────────────
    objeto_contratacion_au_au: datos.expediente.descripcionObjeto,
    nomenclatura_proceso_au_au: datos.expediente.codigoNomenclatura,

    // ── Contratista ───────────────────────────────────────────────────
    nombre_contratista_au_au: datos.oferta.nombreProveedorOferente,
    rif_contratista_au_au: datos.oferta.rifProveedorOferente,
    representante_contratista_au_au: datos.oferta.nombreRepLegalOferente,
    cedula_representante_au_au: datos.oferta.cedulaRepLegalOferente,
    registro_mercantil_au_au: datos.oferta.datosRegistroMercantilProveedorOferente,

    // ── Contrato ──────────────────────────────────────────────────────
    monto_contrato_numeros_au_au: monto != null ? formatearMonto(monto) : null,
    monto_contrato_letras_au_au: monto != null ? numeroALetras(monto) : null,
    partidas_presupuestarias_au_au: datos.partidasPresupuestarias,
    plazo_ejecucion_dias_au_au:
      datos.plazoEjecucionDias != null ? `${datos.plazoEjecucionDias}` : null,

    // ── Fase 1: porcentajes, lugar y lo que se calcula con ellos ──────
    porcentaje_fiel_cumplimiento_au_au:
      datos.fase1?.porcentajeFielCumplimiento != null
        ? `${datos.fase1.porcentajeFielCumplimiento}%`
        : null,
    porcentaje_anticipo_au_au:
      datos.fase1?.porcentajeAnticipo != null ? `${datos.fase1.porcentajeAnticipo}%` : null,
    porcentaje_responsabilidad_social_au_au:
      datos.fase1?.porcentajeResponsabilidadSocial != null
        ? `${datos.fase1.porcentajeResponsabilidadSocial}%`
        : null,
    lugar_ejecucion_au_au: datos.fase1?.lugarLogisticaEjecucion ?? null,

    // Las cláusulas escriben "… Bolívares (Bs. …)": letras sin moneda y cifra sin "Bs.".
    monto_garantia_fiel_cumplimiento_numeros_au_au: fianza != null ? formatearMonto(fianza) : null,
    monto_garantia_fiel_cumplimiento_letras_au_au: fianza != null ? cifraEnLetras(fianza) : null,
    monto_fianza_laboral_numeros_au_au:
      fianzaLaboral != null ? formatearMonto(fianzaLaboral) : null,
    monto_fianza_laboral_letras_au_au: fianzaLaboral != null ? cifraEnLetras(fianzaLaboral) : null,
    monto_responsabilidad_civil_bs_au_au: montoPoliza != null ? formatearMonto(montoPoliza) : null,
    monto_responsabilidad_civil_letras_au_au:
      montoPoliza != null ? cifraEnLetras(montoPoliza) : null,
    porcentaje_garantia_laboral_au_au: porcentaje(datos.fase1?.porcentajeGarantiaLaboral),
    porcentaje_responsabilidad_civil_au_au: porcentaje(datos.fase1?.porcentajeResponsabilidadCivil),
    modalidad_crs_au_au: datos.fase1?.modalidadCrs ?? null,
    unidad_resp_cumplimiento_crs_au_au: datos.fase1?.unidadRespCumplimientoCrs ?? null,
    nom_unidad_usuaria_au_au: datos.nombreUnidadUsuaria ?? null,

    // El CRS no tiene monto propio en este flujo: sale del porcentaje de
    // responsabilidad social sobre el monto del contrato.
    monto_crs_numeros_au_au: montoCrs != null ? formatearMonto(montoCrs) : null,
    monto_crs_letras_au_au: montoCrs != null ? numeroALetras(montoCrs) : null,

    fecha_adjudicacion_au_au: datos.fechaAdjudicacion ? fechaLarga(datos.fechaAdjudicacion) : null,
  };
}
