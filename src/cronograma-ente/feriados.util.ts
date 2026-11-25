import { BusinessDaysUtil } from '../common/utils/business-days.util';

export interface FeriadoNuevo {
  id: string;
  esRecurrente: boolean;
  fecha: Date | null;
  fechaRecurrente: string | null;
}

/** El día de hoy en Venezuela, a medianoche UTC como se guardan las fechas. */
export function hoyEnCaracas(ahora = new Date()): Date {
  const dia = new Date(ahora.getTime() - 4 * 60 * 60 * 1000).toISOString().split('T')[0];
  return new Date(`${dia}T00:00:00Z`);
}

/**
 * Días hábiles que el feriado le quita a un cronograma: sus ocurrencias entre la primera y la
 * última fecha, sin contar fines de semana ni días que ya eran feriado.
 * `festivos` son todos los del ente, incluido el nuevo.
 */
export function ocurrenciasDelFeriado(
  feriado: Omit<FeriadoNuevo, 'id'>,
  fechas: Date[],
  festivos: string[],
): Date[] {
  if (fechas.length === 0) return [];
  const tiempos = fechas.map((f) => f.getTime());
  const inicio = Math.min(...tiempos);
  const fin = Math.max(...tiempos);

  const candidatas: string[] = [];
  if (!feriado.esRecurrente) {
    if (feriado.fecha) candidatas.push(feriado.fecha.toISOString().split('T')[0]);
  } else if (feriado.fechaRecurrente) {
    const ultimo = new Date(fin).getUTCFullYear();
    for (let anio = new Date(inicio).getUTCFullYear(); anio <= ultimo; anio++) {
      candidatas.push(`${anio}-${feriado.fechaRecurrente}`);
    }
  }

  return candidatas
    .map((texto) => ({ texto, dia: new Date(`${texto}T00:00:00Z`) }))
    .filter(({ texto, dia }) => {
      // El 29 de febrero no existe todos los años.
      if (Number.isNaN(dia.getTime()) || dia.toISOString().split('T')[0] !== texto) return false;
      if (dia.getTime() < inicio || dia.getTime() > fin) return false;
      const propio = feriado.esRecurrente ? feriado.fechaRecurrente : texto;
      return BusinessDaysUtil.isBusinessDay(
        dia,
        festivos.filter((f) => f !== propio),
      );
    })
    .map(({ dia }) => dia);
}
