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
