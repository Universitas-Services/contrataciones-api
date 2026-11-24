import type { TipoContratacion } from '@prisma/client';
import { BusinessDaysUtil } from '../common/utils/business-days.util';

interface LapsosActoUnico {
  finPliego: number;
  acto: number;
  evaluacion: number;
  adjudicacion: number;
  notificacion: number;
}

/**
 * Lapsos en días hábiles del Concurso Abierto, Acto Único (QA, ronda 3).
 *
 * La disponibilidad del pliego empieza el día hábil siguiente al llamado y ese día cuenta
 * como el primero: por eso el fin del pliego y el acto se suman desde el llamado.
 */
export const LAPSOS_ACTO_UNICO: Record<TipoContratacion, LapsosActoUnico> = {
  BIENES: { finPliego: 6, acto: 7, evaluacion: 5, adjudicacion: 7, notificacion: 9 },
  SERVICIOS: { finPliego: 8, acto: 9, evaluacion: 7, adjudicacion: 10, notificacion: 12 },
  OBRAS: { finPliego: 10, acto: 11, evaluacion: 10, adjudicacion: 14, notificacion: 16 },
  MIXTO: { finPliego: 10, acto: 11, evaluacion: 10, adjudicacion: 14, notificacion: 16 },
};

/** Días hábiles que se puede correr el acto hacia adelante. */
export const MAX_CORRER_ACTO = 15;

export function calcularActoUnico(tipo: TipoContratacion, llamado: Date, noLaborables: string[]) {
  const lapsos = LAPSOS_ACTO_UNICO[tipo];
  const sumar = (desde: Date, dias: number) =>
    BusinessDaysUtil.addBusinessDays(desde, dias, noLaborables);
  const restar = (desde: Date, dias: number) =>
    BusinessDaysUtil.subtractBusinessDays(desde, dias, noLaborables);

  const inicioPliego = sumar(llamado, 1);
  const acto = sumar(llamado, lapsos.acto);
  const notificacion = sumar(acto, lapsos.notificacion);

  return {
    fechaLlamadoParticipar: llamado,
    fechaInicioDisponibilidadPliego: inicioPliego,
    fechaFinDisponibilidadPliego: sumar(llamado, lapsos.finPliego),
    fechaSolicitudAclaratorias: sumar(inicioPliego, 2),
    fechaModificacionPliego: restar(acto, 2),
    fechaRespuestaAclaratorias: restar(acto, 1),
    fechaActoRecepcionAperturaSobres: acto,
    fechaLimiteEvaluacion: sumar(acto, lapsos.evaluacion),
    fechaLimiteAdjudicacion: sumar(acto, lapsos.adjudicacion),
    fechaLimiteNotificacion: notificacion,
    fechaLimiteGarantias: sumar(notificacion, 5),
    fechaLimiteFirmaContrato: sumar(notificacion, 8),
  };
}

export type FechasActoUnico = Pick<
  ReturnType<typeof calcularActoUnico>,
  | 'fechaLlamadoParticipar'
  | 'fechaInicioDisponibilidadPliego'
  | 'fechaFinDisponibilidadPliego'
  | 'fechaActoRecepcionAperturaSobres'
  | 'fechaLimiteEvaluacion'
  | 'fechaLimiteAdjudicacion'
  | 'fechaLimiteNotificacion'
>;

const dia = (fecha: Date) => fecha.toISOString().split('T')[0];
const legible = (fecha: Date) => dia(fecha).split('-').reverse().join('/');

/**
 * Reglas de las fechas que el usuario puede mover. Devuelve todos los errores juntos;
 * una lista vacía significa que el cronograma es válido.
 */
export function validarActoUnico(
  tipo: TipoContratacion,
  fechas: FechasActoUnico,
  noLaborables: string[],
): string[] {
  const errores: string[] = [];
  const lapsos = LAPSOS_ACTO_UNICO[tipo];
  const acto = fechas.fechaActoRecepcionAperturaSobres;
  const minimo = calcularActoUnico(
    tipo,
    fechas.fechaLlamadoParticipar,
    noLaborables,
  ).fechaActoRecepcionAperturaSobres;
  const maximo = BusinessDaysUtil.addBusinessDays(minimo, MAX_CORRER_ACTO, noLaborables);

  if (fechas.fechaInicioDisponibilidadPliego <= fechas.fechaLlamadoParticipar) {
    errores.push('La disponibilidad del pliego debe comenzar después del llamado a participar.');
  }
  if (acto < minimo) {
    errores.push(
      `El acto de recepción y apertura debe ser como mínimo el ${legible(minimo)}: ${lapsos.acto} días hábiles desde la disponibilidad del pliego.`,
    );
  }
  if (acto > maximo) {
    errores.push(
      `El acto de recepción y apertura se puede correr máximo ${MAX_CORRER_ACTO} días hábiles (hasta el ${legible(maximo)}).`,
    );
  }

  const finEsperado = BusinessDaysUtil.subtractBusinessDays(acto, 1, noLaborables);
  if (dia(fechas.fechaFinDisponibilidadPliego) !== dia(finEsperado)) {
    errores.push(
      `La disponibilidad del pliego debe terminar un día hábil antes del acto (${legible(finEsperado)}).`,
    );
  }

  if (fechas.fechaLimiteEvaluacion <= acto) {
    errores.push('La evaluación debe ser posterior al acto de recepción y apertura.');
  }
  if (fechas.fechaLimiteAdjudicacion <= fechas.fechaLimiteEvaluacion) {
    errores.push('La adjudicación debe ser posterior a la evaluación.');
  }

  const diasNotificacion =
    fechas.fechaLimiteNotificacion > fechas.fechaLimiteAdjudicacion
      ? BusinessDaysUtil.getBusinessDaysDifference(
          fechas.fechaLimiteAdjudicacion,
          fechas.fechaLimiteNotificacion,
          noLaborables,
        )
      : 0;
  if (diasNotificacion < 1 || diasNotificacion > 2) {
    errores.push('La notificación debe ser uno o dos días hábiles después de la adjudicación.');
  }

  const limite = BusinessDaysUtil.addBusinessDays(acto, lapsos.notificacion, noLaborables);
  if (fechas.fechaLimiteNotificacion > limite) {
    errores.push(
      `La evaluación, adjudicación y notificación no pueden pasar de ${lapsos.notificacion} días hábiles después del acto (hasta el ${legible(limite)}).`,
    );
  }

  return errores;
}
