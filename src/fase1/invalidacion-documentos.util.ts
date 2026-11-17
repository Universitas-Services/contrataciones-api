import type { TipoDocumento } from '@prisma/client';
import type { MicromoduloKey } from './constants/micromodulos.constants';

/** Documentos que genera la Fase 1. El pliego vive además en `tb_pliego_generado`. */
export const TIPOS_DOCUMENTO_FASE1: TipoDocumento[] = [
  'ACTIVIDADES_PREVIAS',
  'ACTA_INICIO',
  'LLAMADO_PARTICIPAR',
  'PLIEGO_CONDICIONES',
];

/**
 * Documentos de la Fase 1 cuyo contenido sale de cada micromódulo.
 *
 * El pliego recoge todos los módulos. El Requerimiento de Actividades Previas y
 * el Acta de Inicio leen datos de Actividades Previas; el Llamado lee los suyos.
 * Los documentos de fases posteriores no aparecen aquí: se invalidan siempre
 * que haya un cambio real, porque pueden depender de cualquier dato de la fase.
 */
export const DOCUMENTOS_POR_MICROMODULO: Record<MicromoduloKey, TipoDocumento[]> = {
  'actividades-previas': ['ACTIVIDADES_PREVIAS', 'ACTA_INICIO', 'PLIEGO_CONDICIONES'],
  llamado: ['LLAMADO_PARTICIPAR', 'PLIEGO_CONDICIONES'],
  'aspectos-generales': ['PLIEGO_CONDICIONES'],
  'modelo-contrato': ['PLIEGO_CONDICIONES'],
  'calificacion-legal': ['PLIEGO_CONDICIONES'],
  'calificacion-financiera': ['PLIEGO_CONDICIONES'],
  'calificacion-tecnica': ['PLIEGO_CONDICIONES'],
  'evaluacion-tecnica-economica': ['PLIEGO_CONDICIONES'],
};

/** Serializa con las llaves ordenadas, para que el orden de un JSON no cuente como cambio. */
function estable(valor: unknown): unknown {
  if (valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (valor && typeof valor === 'object' && 'toJSON' in valor && !Array.isArray(valor)) {
    return estable((valor as { toJSON: () => unknown }).toJSON());
  }
  if (Array.isArray(valor)) return valor.map(estable);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map((k) => [k, estable((valor as Record<string, unknown>)[k])]),
    );
  }
  return valor;
}

/** Si dos versiones de los datos de un módulo son distintas. */
export function huboCambios(antes: unknown, despues: unknown): boolean {
  return JSON.stringify(estable(antes)) !== JSON.stringify(estable(despues));
}
