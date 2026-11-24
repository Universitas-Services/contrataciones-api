export function formatDateToLegalText(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const daysText = [
    'primer',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciséis',
    'diecisiete',
    'dieciocho',
    'diecinueve',
    'veinte',
    'veintiún',
    'veintidós',
    'veintitrés',
    'veinticuatro',
    'veinticinco',
    'veintiséis',
    'veintisiete',
    'veintiocho',
    'veintinueve',
    'treinta',
    'treinta y un',
  ];

  const monthsText = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  const dayText = day === 1 ? 'A los primer día' : `A los ${daysText[day - 1]} días`;

  return `${dayText} del mes de ${monthsText[month]} del año ${year}`;
}

export function formatDateToSpanishLong(date: Date | string | null | undefined): string {
  if (!date) return '___ días del mes de ___ del año ___';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '___ días del mes de ___ del año ___';

  const day = d.getUTCDate().toString().padStart(2, '0');
  const locales = 'es-ES';
  const month = d.toLocaleString(locales, { month: 'long', timeZone: 'UTC' });
  const year = d.getUTCFullYear();

  return `${day} días del mes de ${month} del año ${year}`;
}

export function formatToDDMMYYYY(date: Date | string | null | undefined): string {
  if (!date) return '__/__/____';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '__/__/____';

  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

export function formatCurrencyVE(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0,00';

  const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(parsedAmount)) return '0,00';

  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsedAmount);
}

/**
 * Suma minutos a una hora escrita por el usuario ("10:00 a.m.", "9:30 AM", "14:00")
 * y conserva su formato. Devuelve `null` si no se reconoce una hora.
 */
export function sumarMinutosAHora(hora: string | null | undefined, minutos: number): string | null {
  const m = /^\s*(\d{1,2}):(\d{2})(:\d{2})?(?:(\s*)([ap])(\.?\s*)m(\.?))?(.*)$/is.exec(hora ?? '');
  if (!m) return null;

  const [, hh, mm, ss = '', espacio = '', meridiano, medio = '', punto = '', resto = ''] = m;
  let horas = Number(hh);
  if (horas > 23 || Number(mm) > 59) return null;
  if (meridiano && horas <= 12) {
    horas = (horas % 12) + (meridiano.toLowerCase() === 'p' ? 12 : 0);
  }

  const total = (horas * 60 + Number(mm) + minutos) % (24 * 60);
  const horaNueva = Math.floor(total / 60);
  const visible = meridiano ? horaNueva % 12 || 12 : horaNueva;
  const texto = `${String(visible).padStart(hh.length, '0')}:${String(total % 60).padStart(2, '0')}${ss}`;
  if (!meridiano) return texto + resto;

  const mayuscula = meridiano === meridiano.toUpperCase();
  const letra = horaNueva >= 12 ? 'p' : 'a';
  const sufijo = mayuscula ? `${letra.toUpperCase()}${medio}M` : `${letra}${medio}m`;
  return `${texto}${espacio}${sufijo}${punto}${resto}`;
}
