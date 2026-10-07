import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/** Etiquetas canónicas (Title Case) — ranking denso 1-based. */
export const ETIQUETAS_PRELACION = [
  'Primera Opción',
  'Segunda Opción',
  'Tercera Opción',
  'Cuarta Opción',
  'Quinta Opción',
  'Sexta Opción',
  'Séptima Opción',
  'Octava Opción',
  'Novena Opción',
  'Décima Opción',
] as const;

/**
 * Ranking denso por puntaje final (`totalEvaluacion`).
 * Empate → misma etiqueta; el siguiente rank no salta (1,2,2,3).
 */
@Injectable()
export class PrelacionService {
  constructor(private readonly prisma: PrismaService) {}

  etiquetaDesdeRank(rank1Based: number): string {
    if (rank1Based < 1) return ETIQUETAS_PRELACION[0];
    if (rank1Based <= ETIQUETAS_PRELACION.length) {
      return ETIQUETAS_PRELACION[rank1Based - 1];
    }
    return `${rank1Based}.ª Opción`;
  }

  /**
   * Recalcula `posicionPrelacion` de todos los oferentes del expediente.
   * Elegibles: hubResultadoFinal = calificado (oferenteCalificado true).
   * Resto → null.
   */
  async recalcularPorExpediente(expedienteId: string): Promise<void> {
    const evaluaciones = await this.prisma.evaluacionResultados.findMany({
      where: {
        deletedAt: null,
        oferta: { expedienteId, deletedAt: null },
      },
      select: {
        id: true,
        hubResultadoFinal: true,
        oferenteCalificado: true,
        totalEvaluacion: true,
      },
    });

    const elegibles = evaluaciones
      .filter((e) => e.hubResultadoFinal === 'calificado' && e.totalEvaluacion != null)
      .map((e) => ({
        id: e.id,
        puntaje: Number(e.totalEvaluacion ?? 0),
      }))
      .sort((a, b) => {
        if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
        return a.id.localeCompare(b.id);
      });

    // Ranking denso: mismo puntaje → mismo rank; siguiente = rank actual + 1
    const asignaciones = new Map<string, string | null>();
    let rank = 0;
    let ultimoPuntaje: number | null = null;

    for (const item of elegibles) {
      if (ultimoPuntaje === null || item.puntaje !== ultimoPuntaje) {
        rank += 1;
        ultimoPuntaje = item.puntaje;
      }
      asignaciones.set(item.id, this.etiquetaDesdeRank(rank));
    }

    for (const e of evaluaciones) {
      if (!asignaciones.has(e.id)) {
        asignaciones.set(e.id, null);
      }
    }

    await this.prisma.$transaction(
      [...asignaciones.entries()].map(([id, posicionPrelacion]) =>
        this.prisma.evaluacionResultados.update({
          where: { id },
          data: { posicionPrelacion },
        }),
      ),
    );
  }
}
