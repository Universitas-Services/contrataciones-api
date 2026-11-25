/** «V-12345678», «E-12345678» o solo los números, como se guardaba antes. */
export const FORMATO_CEDULA = /^(?:[VEP]-)?\d{1,15}$/;

export function normalizarCedula(valor: unknown): string | undefined {
  if (typeof valor !== 'string' && typeof valor !== 'number') return undefined;
  const texto = String(valor).toUpperCase().replace(/[\s.]/g, '');
  return texto ? texto.replace(/^([A-Z])-?(?=\d)/, '$1-') : undefined;
}

/** Si llega la misma cédula sin letra, se conserva la que ya estaba registrada. */
export function conservarLetra(nueva: string | undefined, guardada: string | null) {
  return nueva && guardada?.endsWith(`-${nueva}`) ? guardada : nueva;
}
