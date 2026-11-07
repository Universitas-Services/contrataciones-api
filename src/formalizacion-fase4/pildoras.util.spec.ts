import {
  corchetesAPildoras,
  LINEA_VACIA,
  aTextoPlano,
  extraerTokenIds,
  renderizarPildoras,
} from './pildoras.util';

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

  it('conserva lo que el usuario escribió en una píldora sin fuente', () => {
    const cuerpo = pildora('ciudad_domicilio_especial_au_au', 'Barquisimeto');
    expect(renderizarPildoras(cuerpo, {}, 'VALOR')).toBe('Barquisimeto');
  });

  it('el valor resuelto manda sobre lo escrito en la píldora', () => {
    const cuerpo = pildora('monto_contrato_numeros_au_au', 'otro texto');
    expect(renderizarPildoras(cuerpo, VALORES, 'VALOR')).toBe('Bs. 367.500,00');
  });

  it('una píldora que quedó con la línea sigue siendo línea', () => {
    const cuerpo = pildora('ciudad_domicilio_especial_au_au', LINEA_VACIA);
    expect(renderizarPildoras(cuerpo, {}, 'VALOR')).toBe(LINEA_VACIA);
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

// ── Cláusulas reales de la biblioteca ────────────────────────────────────
//
// Las cláusulas de la semilla no traen píldoras: traen el corchete escrito a
// mano. Estas pruebas usan el texto tal cual está en
// `prisma/data/clausulas-genericas.data.ts`.

const CLAUSULA_REAL =
  'El monto total del presente contrato es la cantidad de [MONTO CONTRATO EN LETRAS] ' +
  '(Bs. [MONTO CONTRATO EN NUMEROS]), los cuales serán imputados a la(s) siguientes ' +
  'Partida(s) Presupuestaria(s) N° [PARTIDAS PRESUPUESTARIAS].';

const CLAUSULA_PLAZO =
  '“LA CONTRATISTA” se compromete a iniciar la ejecución en un plazo de: ' +
  '[PLAZO EJECUCION DIAS] días. Este plazo se contará a partir de [EVENTO INICIO PLAZO].';

describe('corchetes escritos a mano', () => {
  it('los reconoce igual que a las píldoras', () => {
    expect(extraerTokenIds(CLAUSULA_REAL).sort()).toEqual(
      [
        'monto_contrato_letras_au_au',
        'monto_contrato_numeros_au_au',
        'partidas_presupuestarias_au_au',
      ].sort(),
    );
  });

  it('resuelve una cláusula real sin dejar corchetes crudos', () => {
    const salida = renderizarPildoras(
      CLAUSULA_REAL,
      {
        ...VALORES,
        partidas_presupuestarias_au_au: '4.02.01.01.00',
      },
      'VALOR',
    );
    expect(salida).toContain('Bs. 367.500,00');
    expect(salida).toContain('4.02.01.01.00');
    expect(salida).not.toContain('[');
  });

  it('resuelve las etiquetas que la cláusula escribe de otra forma', () => {
    // La cláusula dice PARTIDAS PRESUPUESTARIAS y PLAZO EJECUCION DIAS; el
    // catálogo los tiene como PARTIDA PRESUPUESTARIA y PLAZO DE EJECUCION EN
    // DIAS. Los alias hacen que resuelvan igual.
    expect(extraerTokenIds(CLAUSULA_PLAZO)).toContain('plazo_ejecucion_dias_au_au');
    expect(extraerTokenIds(CLAUSULA_REAL)).toContain('partidas_presupuestarias_au_au');
  });

  it('en la precarga los convierte en pildora con su id', () => {
    const salida = renderizarPildoras(CLAUSULA_REAL, VALORES, 'RESOLVER');
    expect(salida).toContain('data-token-id="monto_contrato_letras_au_au"');
    expect(salida).toContain('data-resolved="true"');
  });

  it('un dato sin valor queda como pildora para que el usuario lo escriba', () => {
    // [EVENTO INICIO PLAZO] existe en el catálogo pero no tiene fuente.
    const salida = renderizarPildoras(CLAUSULA_PLAZO, {}, 'RESOLVER');
    expect(salida).toContain('data-token-id="evento_inicio_plazo_au_au"');
    expect(salida).not.toContain('data-resolved');
  });

  it('en el pliego van como linea', () => {
    const salida = renderizarPildoras(CLAUSULA_REAL, VALORES, 'LINEA');
    expect(salida).not.toContain('367.500');
    expect(salida.match(/________/g)?.length).toBe(3);
  });

  it('no toca los corchetes que no son variables', () => {
    const texto = 'Lo previsto en el artículo 74 [sic] y el anexo [1].';
    expect(renderizarPildoras(texto, {}, 'VALOR')).toBe(texto);
  });

  it('aplicarlo dos veces no anida pildoras', () => {
    const una = corchetesAPildoras(CLAUSULA_REAL);
    expect(corchetesAPildoras(una)).toBe(una);
  });
});
