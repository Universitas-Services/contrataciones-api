/**
 * Convierte una cantidad a su expresión en palabras, en español.
 *
 * Existe porque la base guarda el monto adjudicado sólo como cifra
 * (`tb_adjudicacion.montoAdjudicadoBs`) y los contratos deben expresarlo
 * también en letras.
 */

const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISEIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
];

const DECENAS = [
  '',
  '',
  'VEINTI',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

/** Convierte un entero de 0 a 999 a palabras. */
function centenasALetras(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const resto = n % 100;

  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);

  if (resto > 0) {
    if (resto <= 20) {
      partes.push(UNIDADES[resto]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d === 2) {
        // 21-29 se escriben juntos: VEINTIUNO, VEINTIDOS...
        partes.push(u > 0 ? `VEINTI${UNIDADES[u]}` : 'VEINTE');
      } else {
        partes.push(u > 0 ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d]);
      }
    }
  }

  return partes.join(' ');
}

/** Convierte un entero no negativo a palabras. */
function enteroALetras(n: number): string {
  if (n === 0) return 'CERO';

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];

  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLON' : `${enteroALetras(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${centenasALetras(miles)} MIL`);
  }
  if (resto > 0) {
    partes.push(centenasALetras(resto));
  }

  return partes.join(' ');
}

/**
 * Expresa un monto en palabras con el formato usado en contratos.
 *
 * @example numeroALetras(1250.50) // "MIL DOSCIENTOS CINCUENTA BOLÍVARES CON CINCUENTA CÉNTIMOS"
 */
export function numeroALetras(monto: number, moneda = 'BOLÍVARES', fraccion = 'CÉNTIMOS'): string {
  if (!Number.isFinite(monto)) return '';

  const negativo = monto < 0;
  const absoluto = Math.abs(monto);

  const entero = Math.floor(absoluto);
  // Se redondea para evitar arrastres binarios como 0.29999999
  const centimos = Math.round((absoluto - entero) * 100);

  let texto = `${enteroALetras(entero)} ${moneda}`;
  if (centimos > 0) {
    texto += ` CON ${enteroALetras(centimos)} ${fraccion}`;
  }

  return negativo ? `MENOS ${texto}` : texto;
}
