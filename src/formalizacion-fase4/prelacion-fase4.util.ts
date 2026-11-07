/**
 * Orden de prelación a partir de la etiqueta que guarda la Fase 3
 * ("Primera Opción", "Segunda Opción"…).
 *
 * Se usa para elegir al subsiguiente en carácter TOTAL, donde el brief exige
 * "el primer calificado en RESERVA según posicionPrelacion". Si la etiqueta no
 * se reconoce, el oferente va al final y desempata por puntuación.
 */

const ORDINALES: Record<string, number> = {
  primera: 1,
  segunda: 2,
  tercera: 3,
  cuarta: 4,
  quinta: 5,
  sexta: 6,
  septima: 7,
  octava: 8,
  novena: 9,
  decima: 10,
};

/** Número de orden, o `Number.MAX_SAFE_INTEGER` si la etiqueta no se reconoce. */
export function rangoPrelacion(posicion: string | null | undefined): number {
  const normalizada = (posicion ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  for (const [palabra, orden] of Object.entries(ORDINALES)) {
    if (normalizada.startsWith(palabra)) return orden;
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Comparador: primero por prelación, y a igualdad por mayor puntuación. */
export function compararPrelacion(
  a: { posicionPrelacion: string | null; puntuacionFinal: number | null },
  b: { posicionPrelacion: string | null; puntuacionFinal: number | null },
): number {
  const diferencia = rangoPrelacion(a.posicionPrelacion) - rangoPrelacion(b.posicionPrelacion);
  if (diferencia !== 0) return diferencia;
  return (b.puntuacionFinal ?? 0) - (a.puntuacionFinal ?? 0);
}
