import { BadRequestException } from '@nestjs/common';

/** Solo los dígitos: "V-15.123.456", "v15123456" y "15123456" son la misma cédula. */
export function digitosCedula(cedula: string | null | undefined): string {
  return (cedula ?? '').replace(/\D/g, '');
}

/** Las cédulas de `despues` que no estaban en `antes`: editar otro dato no las revisa. */
export function cedulasNuevas(
  antes: (string | null | undefined)[],
  despues: (string | null | undefined)[],
): string[] {
  const previas = new Set(antes.map(digitosCedula));
  return despues
    .filter((c): c is string => !!digitosCedula(c))
    .filter((c) => !previas.has(digitosCedula(c)));
}

/**
 * 400 si una cédula se repite dentro del mismo formulario. Entre formularios sí puede
 * repetirse: una persona puede tener varios cargos en el ente.
 */
export function assertCedulasSinRepetir(cedulas: (string | null | undefined)[]): void {
  const vistas = new Set<string>();
  for (const cedula of cedulas) {
    const digitos = digitosCedula(cedula);
    if (!digitos) continue;
    if (vistas.has(digitos)) {
      throw new BadRequestException(`La cédula ${cedula} está repetida en el formulario.`);
    }
    vistas.add(digitos);
  }
}
