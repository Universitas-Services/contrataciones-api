import { ordenarClausulas } from './documentos-fase4.mapper';
import { mapDatosPliegoCondiciones } from '../generador-documentos/mappers/pliego-condiciones.mapper';

/**
 * QA 27/11 (Misael): una cláusula agregada entre dos llega con `order` "21A" y el
 * Pliego la imprimía como «CLÁUSULA 21A». Ahora se ordena y se numera por posición.
 */
describe('Orden y número de las cláusulas (QA 27/11)', () => {
  const titulos = (lista: { titulo: string }[]) => lista.map((c) => c.titulo);

  it('«21A» va después de la 21 y antes de la 22', () => {
    const clausulas = [
      { order: 22, titulo: 'C' },
      { order: '21A', titulo: 'B' },
      { order: 21, titulo: 'A' },
      { order: '21B', titulo: 'B2' },
    ];
    expect(titulos(ordenarClausulas(clausulas))).toEqual(['A', 'B', 'B2', 'C']);
  });

  it('acepta el orden como texto; sin número usa su posición en la lista', () => {
    const clausulas = [
      { order: '2', titulo: 'dos' },
      { order: 1, titulo: 'uno' },
      { titulo: 'sin orden' },
    ];
    expect(titulos(ordenarClausulas(clausulas))).toEqual(['uno', 'dos', 'sin orden']);
  });

  it('no cambia la lista original', () => {
    const clausulas = [
      { order: 2, titulo: 'b' },
      { order: 1, titulo: 'a' },
    ];
    ordenarClausulas(clausulas);
    expect(titulos(clausulas)).toEqual(['b', 'a']);
  });

  it('el Pliego numera la cláusula «21A» como VIGÉSIMA SEGUNDA si es la 22.ª', () => {
    const clauses = Array.from({ length: 21 }, (_, i) => ({
      order: i + 1,
      titulo: `Cláusula ${i + 1}`,
      cuerpoHtml: '<p>Texto</p>',
    }));
    clauses.push({ order: '21A' as never, titulo: 'Montos del contrato', cuerpoHtml: '<p>X</p>' });
    const datos = mapDatosPliegoCondiciones({
      descripcionObjeto: 'X',
      codigoNomenclatura: 'CA-1',
      ente: { nombre: 'E' },
      modalidad: { tipoContratacion: 'BIENES' },
      cronograma: {},
      fasePreparatoria: { modeloContratoData: { clauses } },
    }) as {
      clausulas_custom_au_au: {
        num_clausula_custom_au_au: string;
        titulo_clausula_custom_au_au: string;
      }[];
    };
    const ultima = datos.clausulas_custom_au_au.at(-1);
    expect(ultima).toMatchObject({
      num_clausula_custom_au_au: 'VIGÉSIMA SEGUNDA',
      titulo_clausula_custom_au_au: 'MONTOS DEL CONTRATO',
    });
    expect(datos.clausulas_custom_au_au[20].num_clausula_custom_au_au).toBe('VIGÉSIMA PRIMERA');
  });
});
