import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RECAUDOS_CATALOGO } from '../../fase1/constants/recaudos-legales.constants';
import {
  CRITERIO_DESCAPITAL,
  CRITERIOS_INDICE,
  ITEM_OFERTA_TECNICO_ECONOMICA,
} from './constants/criterios-financieros.constants';
import type {
  PlantillasSnapshot,
  PlantillaLegal,
  PlantillaFinanciera,
  PlantillaTecnica,
  PlantillaEvaluacion,
  PlantillaPromocion,
  ItemLegalPlantilla,
  CriterioFinanciero,
  CriterioPuntuado,
  RangosIndice,
} from './types/hub.types';

type Datos = Record<string, any>;

/**
 * Construye el snapshot de plantillas del hub a partir de lo exigido en la
 * Fase 1 del expediente.
 *
 * El snapshot se arma una sola vez y se congela: si el pliego se edita después,
 * la evaluación en curso conserva la plantilla con la que empezó.
 */
@Injectable()
export class SnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  private num(valor: unknown, porDefecto = 0): number {
    const n = Number(valor);
    return Number.isFinite(n) ? n : porDefecto;
  }

  /**
   * Los rangos de Fase 1 no traen id propio; se genera uno estable a partir
   * del criterio y la posición, para que las respuestas puedan referenciarlos.
   */
  private idRango(criterioId: string, indice: number): string {
    return `${criterioId}__r${indice}`;
  }

  private construirLegal(fase: Datos): PlantillaLegal {
    const data: Datos = (fase.calificacionLegalData as Datos) ?? {};
    const exigidos: Datos = data.exigidos ?? {};
    const personalizados: Datos[] = Array.isArray(data.personalizados) ? data.personalizados : [];

    const items: ItemLegalPlantilla[] = [];

    // Sólo entran al cotejo los recaudos que el pliego marcó como exigidos.
    for (const recaudo of RECAUDOS_CATALOGO) {
      if (exigidos[recaudo.id] !== true) continue;

      items.push({
        id: recaudo.id,
        sobre: recaudo.sobre,
        pregunta: recaudo.pregunta,
        etiquetaCorta: recaudo.etiquetaCorta,
        // El recaudo del VAN se coteja pero no tumba el dictamen legal: la
        // promoción económica es un bono, no un requisito de calificación.
        eliminatorio: recaudo.id !== 'modDeclaracionAutocalculoVanAuAu',
        personalizado: false,
      });
    }

    // Recaudos propios del ente, marcados como exigidos en Fase 1.
    personalizados.forEach((p, i) => {
      if (p?.exigido !== true) return;
      const descripcion = String(p?.descripcion ?? `Recaudo personalizado ${i + 1}`);
      items.push({
        id: String(p?.id ?? `personalizado-${i + 1}`),
        sobre: p?.sobre === 2 ? 2 : 1,
        pregunta: `¿Consignó ${descripcion.toLowerCase()}?`,
        etiquetaCorta: descripcion,
        eliminatorio: true,
        personalizado: true,
      });
    });

    // Ítem fijo del Sobre 2: siempre se coteja.
    items.push({
      ...ITEM_OFERTA_TECNICO_ECONOMICA,
      eliminatorio: true,
      personalizado: false,
    });

    return { items };
  }

  private construirFinanciera(fase: Datos): PlantillaFinanciera {
    const data: Datos = (fase.calificacionFinancieraData as Datos) ?? {};
    const criterios: CriterioFinanciero[] = [];

    if (data.criterioCalifFinanDescapital === true) {
      criterios.push({
        id: CRITERIO_DESCAPITAL.id,
        kind: 'descapital',
        titulo: CRITERIO_DESCAPITAL.titulo,
        pregunta: CRITERIO_DESCAPITAL.pregunta,
        basamentoLegal: CRITERIO_DESCAPITAL.basamentoLegal,
        puntajeMaximo: this.num(data.puntajeMaximoDescapital),
      });
    }

    for (const meta of CRITERIOS_INDICE) {
      if (data[`criterioCalifFinan${meta.sufijoFase1}`] !== true) continue;

      const r: Datos = (data[`rangos${meta.sufijoFase1}`] as Datos) ?? {};
      const rangos: RangosIndice = {
        rangoMaximo: this.num(r.rangoMaximo),
        puntajeMaximo: this.num(r.puntajeMaximo),
        rangoMedioDesde: this.num(r.rangoMedioDesde),
        rangoMedioHasta: this.num(r.rangoMedioHasta),
        puntajeMedio: this.num(r.puntajeMedio),
        rangoMinimo: this.num(r.rangoMinimo),
        puntajeMinimo: this.num(r.puntajeMinimo),
      };

      criterios.push({
        id: meta.id,
        kind: 'indice',
        titulo: meta.titulo,
        pregunta: meta.pregunta,
        basamentoLegal: meta.basamentoLegal,
        aspectoHint: meta.aspectoHint,
        mode: meta.modo,
        rangos,
      });
    }

    return {
      puntuacionMinima: this.num(data.puntuacionMinimaCalifFinanciera),
      criterios,
    };
  }

  /** Normaliza los criterios con rangos, que tienen la misma forma en técnica y evaluación. */
  private mapearCriterios(lista: unknown, prefijo: string): CriterioPuntuado[] {
    const criterios: Datos[] = Array.isArray(lista) ? (lista as Datos[]) : [];

    return criterios.map((c, i) => {
      const id = String(c?.id ?? `${prefijo}-${i + 1}`);
      const rangosCrudos: Datos[] = Array.isArray(c?.rangos) ? c.rangos : [];

      return {
        id,
        nombre: String(c?.nombre ?? ''),
        descripcion: String(c?.descripcion ?? ''),
        ponderacion: this.num(c?.puntuacion),
        rangos: rangosCrudos.map((r, j) => ({
          id: String(r?.id ?? this.idRango(id, j)),
          descripcion: String(r?.descripcion ?? ''),
          puntaje: this.num(r?.puntaje),
        })),
      };
    });
  }

  private construirTecnica(fase: Datos): PlantillaTecnica {
    const data: Datos = (fase.calificacionTecnicaData as Datos) ?? {};
    return {
      puntuacionMinima: this.num(data.puntuacionMinimaCalifTecnica),
      criterios: this.mapearCriterios(data.criterios, 'ct'),
    };
  }

  private construirEvaluacion(fase: Datos): PlantillaEvaluacion {
    const data: Datos = (fase.evaluacionTecnicaEconomicaData as Datos) ?? {};
    const tecnica: Datos = (data.tecnica as Datos) ?? {};
    const economica: Datos = (data.economica as Datos) ?? {};

    const critTecnica = this.mapearCriterios(tecnica.criterios, 'et');
    const critEconomica = this.mapearCriterios(economica.criterios, 'ee');

    const sumar = (lista: CriterioPuntuado[]) => lista.reduce((acc, c) => acc + c.ponderacion, 0);

    return {
      tecnica: {
        puntuacionMinima: this.num(tecnica.puntuacionMinima),
        maxPuntos: sumar(critTecnica),
        criterios: critTecnica,
      },
      economica: {
        puntuacionMinima: this.num(economica.puntuacionMinima),
        maxPuntos: sumar(critEconomica),
        criterios: critEconomica,
      },
    };
  }

  private construirPromocion(fase: Datos): PlantillaPromocion | null {
    // Si Actividades Previas no activó la promoción, el módulo no existe.
    if (fase.activaPromocionEconomica !== true) return null;

    return {
      activa: true,
      requiereVan: fase.requiereVan === true,
      puntajeVanMax: this.num(fase.puntajeVan),
      indPrefLocal: fase.indPrefLocal === true,
      puntuacionBonoLocal: this.num(fase.puntuacionBonoLocal),
      indBonoSujeto: fase.indBonoSujeto === true,
      puntuacionBonoSujeto: this.num(fase.puntuacionBonoSujeto),
    };
  }

  /** Arma el snapshot completo leyendo la Fase 1 del expediente. */
  async construir(expedienteId: string): Promise<PlantillasSnapshot> {
    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
    });

    if (!fase) {
      throw new BadRequestException(
        'El expediente no tiene Fase Preparatoria: no se puede construir la plantilla de evaluación.',
      );
    }

    const registro = fase as unknown as Datos;

    return {
      legal: this.construirLegal(registro),
      financiera: this.construirFinanciera(registro),
      tecnica: this.construirTecnica(registro),
      evaluacion: this.construirEvaluacion(registro),
      promocion: this.construirPromocion(registro),
    };
  }
}
