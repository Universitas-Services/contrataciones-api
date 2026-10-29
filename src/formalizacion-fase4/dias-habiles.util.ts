/**
 * Cálculo de días hábiles para los lapsos del decaimiento (Art. 110 LCP).
 *
 * El servidor es la fuente de verdad: nunca se confía en la fecha que mande el
 * frontend, se recalcula siempre a partir de la fecha de notificación.
 *
 * Son hábiles los días que no son sábado, domingo ni día no laborable del ente.
 * Los días no laborables pueden ser una fecha puntual (2026-08-15) o una fecha
 * recurrente anual en formato "MM-DD".
 */

/** Un día no laborable del ente, en la forma mínima que hace falta aquí. */
export interface DiaNoLaborable {
  fecha: Date | null;
  fechaRecurrente: string | null;
  esRecurrente: boolean;
}

/** `2026-10-23` en UTC, sin la hora, para comparar fechas sin sorpresas. */
function soloFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** `10-23` — la parte MM-DD, para los feriados recurrentes. */
function mmdd(d: Date): string {
  return d.toISOString().slice(5, 10);
}

/**
 * Convierte la lista del ente en dos conjuntos de búsqueda directa, para no
 * recorrerla una vez por cada día del lapso.
 */
export function indexarNoLaborables(dias: DiaNoLaborable[]) {
  const puntuales = new Set<string>();
  const recurrentes = new Set<string>();

  for (const dia of dias) {
    if (dia.esRecurrente && dia.fechaRecurrente) {
      recurrentes.add(dia.fechaRecurrente);
    } else if (dia.fecha) {
      puntuales.add(soloFecha(dia.fecha));
    }
  }

  return { puntuales, recurrentes };
}

export function esHabil(
  fecha: Date,
  indice: { puntuales: Set<string>; recurrentes: Set<string> },
): boolean {
  const diaSemana = fecha.getUTCDay();
  if (diaSemana === 0 || diaSemana === 6) return false; // domingo y sábado
  if (indice.puntuales.has(soloFecha(fecha))) return false;
  if (indice.recurrentes.has(mmdd(fecha))) return false;
  return true;
}

/**
 * Suma `cantidad` días hábiles a partir del día siguiente a `desde`.
 *
 * El día de la notificación no cuenta: el lapso empieza a correr al día
 * siguiente, que es como se cuentan los lapsos administrativos.
 */
export function sumarDiasHabiles(desde: Date, cantidad: number, dias: DiaNoLaborable[]): Date {
  const indice = indexarNoLaborables(dias);
  const cursor = new Date(
    Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate()),
  );

  let restantes = cantidad;
  // Tope defensivo: aun con un calendario patológico, 400 iteraciones cubren
  // cualquier lapso real sin dejar el proceso girando.
  let vueltas = 0;
  while (restantes > 0 && vueltas < 400) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    vueltas += 1;
    if (esHabil(cursor, indice)) restantes -= 1;
  }

  return cursor;
}

/** Los dos vencimientos del certificado, en un solo paso. */
export function calcularVencimientos(fechaNotificacion: Date, dias: DiaNoLaborable[]) {
  return {
    fechaVencimientoGarantias: sumarDiasHabiles(fechaNotificacion, 5, dias),
    fechaVencimientoFirmaContrato: sumarDiasHabiles(fechaNotificacion, 8, dias),
  };
}
