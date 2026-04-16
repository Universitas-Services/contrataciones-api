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
