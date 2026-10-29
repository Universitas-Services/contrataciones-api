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
  /** Datos de la Fase 1 que alimentan las cláusulas de garantías. */
  fase1?: {
    porcentajeFielCumplimiento: number | null;
    porcentajeGarantiaLaboral: number | null;
  };
  fechaAdjudicacion?: Date | null;
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

  return {
    // ── Ente contratante ──────────────────────────────────────────────
    nombre_ente_contratante_au_au: datos.ente.nombre,
    rif_ente_au_au: datos.ente.rif,
    organo_adscripcion_au_au: datos.ente.organoAdscripcion,

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

    // ── Porcentajes de la Fase 1 ──────────────────────────────────────
    porcentaje_fiel_cumplimiento_au_au:
      datos.fase1?.porcentajeFielCumplimiento != null
        ? `${datos.fase1.porcentajeFielCumplimiento}%`
        : null,

    fecha_adjudicacion_au_au: datos.fechaAdjudicacion ? fechaLarga(datos.fechaAdjudicacion) : null,
  };
}
