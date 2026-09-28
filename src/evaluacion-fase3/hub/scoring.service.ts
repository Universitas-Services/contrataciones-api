import { Injectable } from '@nestjs/common';
import type {
  PlantillaFinanciera,
  PlantillaTecnica,
  LadoEvaluacion,
  PlantillaPromocion,
  FormFinanciera,
  FormPuntuado,
  FormPromocion,
  CriterioIndice,
} from './types/hub.types';

/** Tope del campo de sustento, alineado con la columna de la base. */
const MAX_VALOR_OBTENIDO = 255;

export interface ResultadoModulo {
  /** Errores de negocio; si hay alguno, la confirmación se rechaza con 422. */
  errores: string[];
  total: number;
  cumple: boolean;
}

export interface ResultadoPromocion {
  errores: string[];
  totalPuntosPromocion: number;
  puntuacionFinalConBonos: number;
}

/**
 * Motor de puntaje del hub. Replica en servidor las mismas reglas que el front
 * usa para previsualizar; el valor que se persiste es siempre el de aquí.
 */
@Injectable()
export class ScoringService {
  private redondear(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Acepta coma o punto como separador decimal. */
  private aNumero(valor: unknown): number | null {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
    if (typeof valor !== 'string') return null;

    const limpio = valor.trim().replace(',', '.');
    if (!limpio) return null;

    const n = Number(limpio);
    return Number.isFinite(n) ? n : null;
  }

  /** Puntaje de un índice financiero según en qué banda cae el valor. */
  private puntajeIndice(criterio: CriterioIndice, valor: number): number {
    const { rangos, mode } = criterio;

    if (mode === 'inverso') {
      // En endeudamiento el mejor resultado es el valor más bajo.
      if (valor <= rangos.rangoMaximo) return rangos.puntajeMaximo;
      if (valor <= rangos.rangoMinimo) return rangos.puntajeMedio;
      return rangos.puntajeMinimo;
    }

    if (valor >= rangos.rangoMaximo) return rangos.puntajeMaximo;
    if (valor >= rangos.rangoMinimo) return rangos.puntajeMedio;
    return rangos.puntajeMinimo;
  }

  // ── Financiera ───────────────────────────────────────────────────────────

  calcularFinanciera(plantilla: PlantillaFinanciera, form: FormFinanciera): ResultadoModulo {
    const errores: string[] = [];
    const respuestas = form?.criterios ?? {};
    let total = 0;

    for (const criterio of plantilla.criterios) {
      const respuesta = respuestas[criterio.id];
      const valor = respuesta?.valor;

      if (valor === undefined || valor === null || String(valor).trim() === '') {
        errores.push(`Falta responder el criterio "${criterio.titulo}".`);
        continue;
      }

      if (criterio.kind === 'descapital') {
        const normalizado = String(valor).trim().toUpperCase();
        if (normalizado !== 'SI' && normalizado !== 'NO') {
          errores.push(`El criterio "${criterio.titulo}" sólo admite SI o NO.`);
          continue;
        }
        // Estar en descapitalización no suma puntos.
        total += normalizado === 'NO' ? criterio.puntajeMaximo : 0;
        continue;
      }

      const numero = this.aNumero(valor);
      if (numero === null) {
        errores.push(`El criterio "${criterio.titulo}" debe ser un número.`);
        continue;
      }
      total += this.puntajeIndice(criterio, numero);
    }

    total = this.redondear(total);

    return {
      errores,
      total,
      cumple: errores.length === 0 && total >= plantilla.puntuacionMinima,
    };
  }

  // ── Técnica y cada lado de la evaluación (misma función) ────────────────

  calcularPuntuado(
    plantilla: PlantillaTecnica | LadoEvaluacion,
    form: FormPuntuado,
    etiquetaModulo: string,
  ): ResultadoModulo {
    const errores: string[] = [];
    const respuestas = form?.criterios ?? {};
    let total = 0;

    for (const criterio of plantilla.criterios) {
      const respuesta = respuestas[criterio.id];
      const nombre = criterio.nombre || criterio.id;

      if (!respuesta) {
        errores.push(`Falta responder el criterio "${nombre}" de ${etiquetaModulo}.`);
        continue;
      }

      const sustento = String(respuesta.valorObtenido ?? '').trim();
      if (!sustento) {
        errores.push(`Debe indicar el sustento del criterio "${nombre}".`);
      } else if (sustento.length > MAX_VALOR_OBTENIDO) {
        errores.push(
          `El sustento del criterio "${nombre}" supera los ${MAX_VALOR_OBTENIDO} caracteres.`,
        );
      }

      const modoA = criterio.rangos.length > 1;

      if (modoA) {
        // Modo A: el evaluador elige un rango y el puntaje es el del rango.
        const rango = criterio.rangos.find((r) => r.id === respuesta.rangoIdSeleccionado);
        if (!rango) {
          errores.push(`Debe seleccionar un rango en el criterio "${nombre}".`);
          continue;
        }
        total += rango.puntaje;
        continue;
      }

      // Modo B: puntaje libre entre 0 y el puntaje del único rango.
      const maximo = criterio.rangos[0]?.puntaje ?? criterio.ponderacion;
      const puntos = this.aNumero(respuesta.puntuacionObtenida);

      if (puntos === null) {
        errores.push(`Debe indicar la puntuación del criterio "${nombre}".`);
        continue;
      }
      if (puntos < 0) {
        errores.push(`La puntuación del criterio "${nombre}" no puede ser negativa.`);
        continue;
      }
      if (puntos > maximo) {
        // No se fuerza el tope: se rechaza para que el evaluador corrija.
        errores.push(
          `La puntuación del criterio "${nombre}" (${puntos}) supera el máximo permitido (${maximo}).`,
        );
        continue;
      }
      total += puntos;
    }

    total = this.redondear(total);

    return {
      errores,
      total,
      cumple: errores.length === 0 && total >= plantilla.puntuacionMinima,
    };
  }

  // ── Promoción económica ─────────────────────────────────────────────────

  /**
   * Los bonos se suman sobre la nota de evaluación ya persistida. La promoción
   * nunca descalifica y el total final puede superar 100.
   */
  calcularPromocion(
    plantilla: PlantillaPromocion,
    form: FormPromocion,
    notaBase: number,
  ): ResultadoPromocion {
    const errores: string[] = [];
    let bonos = 0;

    if (plantilla.requiereVan) {
      if (form.consignoDeclaracionVan === undefined || form.consignoDeclaracionVan === null) {
        errores.push('Debe indicar si el oferente consignó la declaración del VAN.');
      } else if (form.consignoDeclaracionVan === true) {
        const van = this.aNumero(form.valVanOferente);
        const pts = this.aNumero(form.ptsBonoVan);

        if (van === null || van < 0 || van > 100) {
          errores.push('El Valor Agregado Nacional debe estar entre 0 y 100.');
        }
        if (pts === null || pts < 0 || pts > plantilla.puntajeVanMax) {
          errores.push(`El bono por VAN debe estar entre 0 y ${plantilla.puntajeVanMax} puntos.`);
        } else {
          bonos += pts;
        }
      }
      // Si no consignó la declaración, el bono del VAN es 0 y no es un error.
    }

    if (plantilla.indPrefLocal) {
      if (form.aplicaPrefLocal === undefined || form.aplicaPrefLocal === null) {
        errores.push('Debe indicar si aplica la preferencia local.');
      } else if (form.aplicaPrefLocal === true) {
        bonos += plantilla.puntuacionBonoLocal;
      }
    }

    if (plantilla.indBonoSujeto) {
      if (form.aplicaBonoSujeto === undefined || form.aplicaBonoSujeto === null) {
        errores.push('Debe indicar si aplica el bono por sujeto.');
      } else if (form.aplicaBonoSujeto === true) {
        bonos += plantilla.puntuacionBonoSujeto;
      }
    }

    const totalPuntosPromocion = this.redondear(bonos);

    return {
      errores,
      totalPuntosPromocion,
      // Puede superar 100 a propósito: los bonos premian por encima de la nota.
      puntuacionFinalConBonos: this.redondear(notaBase + totalPuntosPromocion),
    };
  }
}
