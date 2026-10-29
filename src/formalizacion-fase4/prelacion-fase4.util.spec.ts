import { compararPrelacion, rangoPrelacion } from './prelacion-fase4.util';

describe('rangoPrelacion', () => {
  it('ordena los ordinales conocidos', () => {
    expect(rangoPrelacion('Primera Opción')).toBe(1);
    expect(rangoPrelacion('Segunda Opción')).toBe(2);
    expect(rangoPrelacion('Tercera Opción')).toBe(3);
  });

  it('no se cae por acentos ni mayúsculas', () => {
    expect(rangoPrelacion('SÉPTIMA OPCIÓN')).toBe(7);
    expect(rangoPrelacion('decima opcion')).toBe(10);
  });

  it('manda al final lo que no reconoce', () => {
    expect(rangoPrelacion(null)).toBe(Number.MAX_SAFE_INTEGER);
    expect(rangoPrelacion('Sin posición')).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('compararPrelacion', () => {
  const oferente = (posicionPrelacion: string | null, puntuacionFinal: number | null) => ({
    posicionPrelacion,
    puntuacionFinal,
  });

  it('ordena por prelación', () => {
    const lista = [
      oferente('Tercera Opción', 70),
      oferente('Primera Opción', 50),
      oferente('Segunda Opción', 90),
    ].sort(compararPrelacion);

    expect(lista.map((o) => o.posicionPrelacion)).toEqual([
      'Primera Opción',
      'Segunda Opción',
      'Tercera Opción',
    ]);
  });

  it('a igual prelación, gana la mayor puntuación', () => {
    const lista = [oferente(null, 40), oferente(null, 95)].sort(compararPrelacion);
    expect(lista.map((o) => o.puntuacionFinal)).toEqual([95, 40]);
  });
});
