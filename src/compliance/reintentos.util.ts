/**
 * Política de reintentos del agente de compliance (sección 8 del contrato).
 *
 * El pseudocódigo del contrato duerme dentro de un bucle. Aquí la cola guarda
 * el estado en la base y programa el siguiente intento: un trabajo en espera no
 * ocupa un puesto del proceso. Las reglas son las mismas.
 */

export const TIEMPO_MAXIMO_MS = 30 * 60 * 1000;
export const ESPERAS_429_S = [15, 30, 60, 120];
export const MAX_FALLOS_TEMPORALES = 3;

/** Lo que sabemos de un intento: `status` es null si la conexión se cortó. */
export interface ResultadoLlamada {
  status: number | null;
  retryAfterS?: number | null;
  detalle?: string | null;
}

export interface EstadoReintentos {
  intentos429: number;
  fallosTemporales: number;
  /** Primer intento del trabajo; el presupuesto de 30 minutos corre desde ahí. */
  primerIntentoAt: Date;
}

export type Decision =
  | { tipo: 'OK' }
  | {
      tipo: 'REINTENTAR';
      esperaMs: number;
      intentos429: number;
      fallosTemporales: number;
    }
  /** 400, 413 y 415: el archivo no sirve. No se reintenta. */
  | { tipo: 'RECHAZADO'; detalle: string }
  /** 401, 422, otros códigos o reintentos agotados. El usuario puede reintentar. */
  | { tipo: 'ERROR'; detalle: string; definitivo: boolean };

const RECHAZOS = [400, 413, 415];
const TEMPORALES = [502, 503, 504];

export function decidir(
  resultado: ResultadoLlamada,
  estado: EstadoReintentos,
  ahora = new Date(),
): Decision {
  const { status } = resultado;
  if (status === 200) return { tipo: 'OK' };

  if (status != null && RECHAZOS.includes(status)) {
    return { tipo: 'RECHAZADO', detalle: resultado.detalle || `El agente respondió ${status}` };
  }

  const reintentable = status == null || status === 429 || TEMPORALES.includes(status);
  if (!reintentable) {
    return {
      tipo: 'ERROR',
      definitivo: true,
      detalle: resultado.detalle || `El agente respondió ${status}`,
    };
  }

  if (ahora.getTime() - estado.primerIntentoAt.getTime() >= TIEMPO_MAXIMO_MS) {
    return agotado(status);
  }

  if (status === 503 && resultado.retryAfterS != null && resultado.retryAfterS >= 0) {
    return {
      tipo: 'REINTENTAR',
      esperaMs: resultado.retryAfterS * 1000,
      intentos429: estado.intentos429,
      fallosTemporales: estado.fallosTemporales,
    };
  }

  if (status === 429) {
    const i = Math.min(estado.intentos429, ESPERAS_429_S.length - 1);
    return {
      tipo: 'REINTENTAR',
      esperaMs: ESPERAS_429_S[i] * 1000,
      intentos429: estado.intentos429 + 1,
      fallosTemporales: estado.fallosTemporales,
    };
  }

  // 502, 503 sin Retry-After, 504 o conexión cortada.
  const fallos = estado.fallosTemporales + 1;
  if (fallos > MAX_FALLOS_TEMPORALES) return agotado(status);
  return {
    tipo: 'REINTENTAR',
    esperaMs: 15000 * fallos,
    intentos429: estado.intentos429,
    fallosTemporales: fallos,
  };
}

function agotado(status: number | null): Decision {
  return {
    tipo: 'ERROR',
    definitivo: false,
    detalle:
      status == null
        ? 'El agente no respondió tras varios intentos.'
        : `El agente siguió respondiendo ${status} tras varios intentos.`,
  };
}
