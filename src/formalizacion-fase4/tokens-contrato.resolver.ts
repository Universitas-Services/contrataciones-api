import { numeroALetras } from '../common/utils/numero-a-letras.util';

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
  };
  fechaAdjudicacion?: Date | null;
}

/**
 * La fianza de fiel cumplimiento se calcula sobre el monto con IVA:
 *
 *   monto × 1,16 × (porcentaje / 100)
 */
export function montoFielCumplimiento(
  montoContratoBs: number | null,
  porcentaje: number | null,
): number | null {
  if (montoContratoBs == null || porcentaje == null) return null;
  return montoContratoBs * 1.16 * (porcentaje / 100);
}

/** `Bs. 367.500,00` — el formato que espera el documento. */
export function formatearBs(monto: number): string {
  return `Bs. ${monto.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fechaLarga(fecha: Date): string {
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
    monto_contrato_numeros_au_au: monto != null ? formatearBs(monto) : null,
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

    monto_garantia_fiel_cumplimiento_numeros_au_au: fianza != null ? formatearBs(fianza) : null,
    monto_garantia_fiel_cumplimiento_letras_au_au: fianza != null ? numeroALetras(fianza) : null,

    // El CRS no tiene monto propio en este flujo: sale del porcentaje de
    // responsabilidad social sobre el monto del contrato.
    monto_crs_numeros_au_au: montoCrs != null ? formatearBs(montoCrs) : null,
    monto_crs_letras_au_au: montoCrs != null ? numeroALetras(montoCrs) : null,

    fecha_adjudicacion_au_au: datos.fechaAdjudicacion ? fechaLarga(datos.fechaAdjudicacion) : null,
  };
}
