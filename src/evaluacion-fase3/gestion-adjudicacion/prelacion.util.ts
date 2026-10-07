/** Match case-insensitive del valor canónico "Primera Opción". */
export function esPrimeraOpcion(valor: string | null | undefined): boolean {
  return (valor ?? '').trim().toLowerCase() === 'primera opción';
}

/** Prelación efectiva: adjudicación (parcial) gana sobre ranking de evaluación. */
export function prelacionEfectiva(
  posicionPrelacion: string | null | undefined,
  posicionPrelacionAdjudicacion: string | null | undefined,
): string | null {
  return posicionPrelacionAdjudicacion ?? posicionPrelacion ?? null;
}
