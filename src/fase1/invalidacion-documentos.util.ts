import { DOCUMENTOS_DE_ADJUDICACION } from '../common/utils/documentos-dependientes.util';
import { pildorasAMarcas, renderizarPildoras } from '../formalizacion-fase4/pildoras.util';
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
 * Documentos cuyo contenido sale de cada micromódulo, de la Fase 1 y posteriores.
 *
 * El pliego recoge todos los módulos, y el Informe, el Acta y las Notificaciones se
 * arman sobre los datos del pliego. La Lista de Cotejo solo lee los recaudos, y las
 * actas de sobres la hora del acto.
 */
export const DOCUMENTOS_POR_MICROMODULO: Record<MicromoduloKey, TipoDocumento[]> = {
  'actividades-previas': [
    'ACTIVIDADES_PREVIAS',
    'ACTA_INICIO',
    'PLIEGO_CONDICIONES',
    ...DOCUMENTOS_DE_ADJUDICACION,
  ],
  llamado: [
    'LLAMADO_PARTICIPAR',
    'PLIEGO_CONDICIONES',
    'ACTA_RECEPCION',
    'ACTA_APERTURA',
    ...DOCUMENTOS_DE_ADJUDICACION,
  ],
  'aspectos-generales': [
    'PLIEGO_CONDICIONES',
    ...DOCUMENTOS_DE_ADJUDICACION,
    'NOTIFICACION_ADJUDICACION_SUBSIGUIENTE',
    'CONTRATO',
  ],
  'modelo-contrato': ['PLIEGO_CONDICIONES', 'CONTRATO'],
  'calificacion-legal': ['PLIEGO_CONDICIONES', 'LISTA_COTEJO', ...DOCUMENTOS_DE_ADJUDICACION],
  'calificacion-financiera': ['PLIEGO_CONDICIONES', ...DOCUMENTOS_DE_ADJUDICACION],
  'calificacion-tecnica': ['PLIEGO_CONDICIONES', ...DOCUMENTOS_DE_ADJUDICACION],
  'evaluacion-tecnica-economica': ['PLIEGO_CONDICIONES', ...DOCUMENTOS_DE_ADJUDICACION],
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

/**
 * Deja las cláusulas del modelo de contrato comparables: el GET las entrega con píldoras
 * resueltas y el frontend las devuelve así, de modo que guardar sin editar cambiaba el
 * HTML aunque el texto fuera el mismo.
 */
export function modeloContratoComparable(datos: unknown): unknown {
  const modelo = datos as { clauses?: unknown } | null | undefined;
  if (!Array.isArray(modelo?.clauses)) return datos;
  return {
    ...modelo,
    clauses: (modelo.clauses as Record<string, unknown>[]).map((c) =>
      typeof c?.cuerpoHtml === 'string' ? { ...c, cuerpoHtml: aMarcas(c.cuerpoHtml) } : c,
    ),
  };
}

/** Píldoras de vuelta a su marca, y las marcas con llaves a su forma canónica. */
function aMarcas(html: string): string {
  return pildorasAMarcas(renderizarPildoras(html, {}, 'RESOLVER'));
}
