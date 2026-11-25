interface MontosModalidad {
  montoEstimadoBs?: unknown;
  valorUcauBase?: unknown;
  valorUcau?: unknown;
}

/**
 * Lo que vale 1 UCAU en Bs. `valorUcauBase` es el monto ya convertido a UCAU: en los
 * expedientes que no guardaron el valor unitario se obtiene de los dos montos. 0 si no se sabe.
 */
export function valorUnitarioUcau(modalidad: MontosModalidad | null | undefined): number {
  const guardado = Number(modalidad?.valorUcau ?? 0);
  if (guardado > 0) return guardado;
  const montoUcau = Number(modalidad?.valorUcauBase ?? 0);
  const valor = montoUcau > 0 ? Number(modalidad?.montoEstimadoBs ?? 0) / montoUcau : 0;
  return Number.isFinite(valor) ? valor : 0;
}
