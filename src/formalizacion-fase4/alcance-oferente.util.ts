import { unirPartidas } from './tokens-contrato.resolver';

interface DictamenPartidas {
  partidasAdjudicadasTotal: string | null;
  partidasAdjudicadasParcial: string | null;
}

/** Las partidas de un dictamen, sea cual sea su carácter. */
export function partidasDe(dictamen?: DictamenPartidas | null): string | null {
  return dictamen?.partidasAdjudicadasTotal ?? dictamen?.partidasAdjudicadasParcial ?? null;
}

/** Partidas de un oferente: las de su dictamen más las de cada infractor al que reemplazó. */
export function partidasDeOferente(
  evaluacionId: string,
  dictamen: DictamenPartidas | null | undefined,
  ciclosCerrados: {
    decision: string | null;
    subsiguienteEvaluacionId: string | null;
    infractorEvaluacionId: string;
    infractor: { dictamenAdjudicacion: DictamenPartidas | null };
  }[],
): string | null {
  const heredadas = ciclosCerrados
    .filter((c) => c.decision === 'SUBSIGUIENTE' && c.subsiguienteEvaluacionId === evaluacionId)
    .map((c) =>
      partidasDeOferente(c.infractorEvaluacionId, c.infractor.dictamenAdjudicacion, ciclosCerrados),
    );
  return unirPartidas(partidasDe(dictamen), ...heredadas);
}

/** Renglones de un oferente: los de su dictamen más los que asumió por readjudicación. */
export function alcanceDe(
  evaluacionId: string,
  dictamen: { alcanceAdjudicacionParcial: string | null } | null | undefined,
  ciclosCerrados: {
    decision: string | null;
    subsiguienteEvaluacionId: string | null;
    alcanceReadjudicacionParcial: string | null;
  }[],
): string | null {
  const partes = [dictamen?.alcanceAdjudicacionParcial];
  for (const ciclo of ciclosCerrados) {
    if (ciclo.decision === 'SUBSIGUIENTE' && ciclo.subsiguienteEvaluacionId === evaluacionId) {
      partes.push(ciclo.alcanceReadjudicacionParcial);
    }
  }
  const texto = partes.filter((p) => p && p.trim()).join('; ');
  return texto || null;
}
