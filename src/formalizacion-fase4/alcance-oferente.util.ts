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
