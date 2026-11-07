import { unirPartidas } from './tokens-contrato.resolver';

describe('unirPartidas', () => {
  it('une las partidas conservando el orden', () => {
    expect(unirPartidas('4.02.01.02.00', '4.02.01.01.00')).toBe('4.02.01.02.00, 4.02.01.01.00');
  });

  it('no repite una partida, aunque venga dentro de una lista', () => {
    expect(unirPartidas('4.02.01.01.00, 4.02.01.02.00', '4.02.01.02.00; 4.03.00.00.00')).toBe(
      '4.02.01.01.00, 4.02.01.02.00, 4.03.00.00.00',
    );
  });

  it('ignora las entradas vacías', () => {
    expect(unirPartidas(null, undefined, '', '4.02.01.01.00')).toBe('4.02.01.01.00');
  });

  it('sin ninguna partida devuelve null, para que actúe el respaldo', () => {
    expect(unirPartidas(null, '  ')).toBeNull();
  });
});
