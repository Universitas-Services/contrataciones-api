import { LINEA_VACIA, aTextoPlano, extraerTokenIds, renderizarPildoras } from './pildoras.util';

const pildora = (id: string, texto: string) =>
  `<span class="contract-pill" data-token-id="${id}">${texto}</span>`;

const CUERPO =
  `<p>El monto del contrato es ${pildora('monto_contrato_letras_au_au', '[MONTO CONTRATO EN LETRAS]')} ` +
  `(${pildora('monto_contrato_numeros_au_au', '[MONTO CONTRATO EN NUMEROS]')}).</p>`;

const VALORES = {
  monto_contrato_letras_au_au: 'TRESCIENTOS SESENTA Y SIETE MIL QUINIENTOS BOLÍVARES',
  monto_contrato_numeros_au_au: 'Bs. 367.500,00',
};

describe('extraerTokenIds', () => {
  it('encuentra los ids presentes, sin repetir', () => {
    const ids = extraerTokenIds(`${CUERPO}${pildora('monto_contrato_letras_au_au', 'x')}`);
    expect(ids.sort()).toEqual(
      ['monto_contrato_numeros_au_au', 'monto_contrato_letras_au_au'].sort(),
    );
  });

  it('tolera comillas simples y atributos en otro orden', () => {
    const html = `<span data-token-id='rif_ente_au_au' class="contract-pill">[RIF DEL ENTE]</span>`;
    expect(extraerTokenIds(html)).toEqual(['rif_ente_au_au']);
  });
});

describe('renderizarPildoras — modo RESOLVER', () => {
  it('mete el valor y marca data-resolved, conservando el id', () => {
    const salida = renderizarPildoras(CUERPO, VALORES, 'RESOLVER');
    expect(salida).toContain('data-token-id="monto_contrato_numeros_au_au"');
    expect(salida).toContain('data-resolved="true"');
    expect(salida).toContain('Bs. 367.500,00');
    expect(salida).not.toContain('[MONTO CONTRATO EN NUMEROS]');
  });

  it('no duplica data-resolved al precargar dos veces', () => {
    const una = renderizarPildoras(CUERPO, VALORES, 'RESOLVER');
    const dos = renderizarPildoras(una, VALORES, 'RESOLVER');
    expect(dos.match(/data-resolved/g)?.length).toBe(2);
  });

  it('sin valor deja la etiqueta visible y no marca resuelto', () => {
    const salida = renderizarPildoras(CUERPO, {}, 'RESOLVER');
    expect(salida).toContain('[MONTO CONTRATO EN LETRAS]');
    expect(salida).not.toContain('data-resolved');
  });
});

describe('renderizarPildoras — modo VALOR', () => {
  it('aplana a texto plano con el valor', () => {
    const salida = renderizarPildoras(CUERPO, VALORES, 'VALOR');
    expect(salida).not.toContain('<span');
    expect(salida).toContain('Bs. 367.500,00');
  });

  it('sin valor pone la línea, nunca el corchete crudo', () => {
    const salida = renderizarPildoras(CUERPO, {}, 'VALOR');
    expect(salida).toContain(LINEA_VACIA);
    expect(salida).not.toContain('[MONTO');
  });
});

describe('renderizarPildoras — modo LINEA', () => {
  it('el pliego lleva siempre la línea, aunque haya valor', () => {
    const salida = renderizarPildoras(CUERPO, VALORES, 'LINEA');
    expect(salida).not.toContain('367.500');
    expect(salida.match(/________/g)?.length).toBe(2);
  });
});

describe('aTextoPlano', () => {
  it('quita las etiquetas y respeta los saltos de párrafo', () => {
    expect(aTextoPlano('<p>Uno</p><p>Dos</p>')).toBe('Uno\nDos');
  });

  it('devuelve las entidades a su carácter', () => {
    expect(aTextoPlano('<p>Robles &amp; Asociados</p>')).toBe('Robles & Asociados');
  });
});
