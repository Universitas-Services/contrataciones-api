import {
  type CondicionesBloques,
  condicionesDe,
  expandirBloques,
  titulosBloques,
} from './bloques-contrato';
import { pildorasAMarcas, renderizarPildoras } from './pildoras.util';
import { mapDatosPliegoCondiciones } from '../generador-documentos/mappers/pliego-condiciones.mapper';
import { TOKENS_POR_ID } from '../biblioteca/constants/tokens-contrato.constants';

/**
 * QA 26/11 (Misael): en el Modelo de Contrato de la Fase 1 las marcas de los
 * bloques de garantías salían en crudo. Ahora el editor las ve como píldoras
 * con un título corto y el Pliego y el contrato las convierten en su párrafo.
 */
const TODOS: CondicionesBloques = {
  retencionFielCumplimiento: true,
  anticipoContrato: true,
  requiereGarantiaLaboral: true,
  retencionFianzaLaboral: true,
  polizaResponsabilidadCivil: true,
};
const NINGUNO = condicionesDe(null);

const GARANTIAS =
  '<p>Artículo 123 de la LCP, {retencion_fiel_cumplimiento_au_au}.</p>' +
  '<p>{modelo_anticipo_contrato_au_au}</p>' +
  '<p>{modelo_garantia_laboral_au_au}</p>' +
  '<p>{modelo_poliza_responsabilidad_civil_au_au}</p>';

const pildora = (id: string, texto: string) =>
  `<span data-resolved="true" class="contract-pill" data-token-id="${id}">${texto}</span>`;

describe('Bloques de garantías en la Fase 1', () => {
  it('están en el menú de variables, marcados como bloque', () => {
    expect(TOKENS_POR_ID.get('modelo_poliza_responsabilidad_civil_au_au')).toMatchObject({
      etiqueta: 'PÓLIZA DE RESPONSABILIDAD CIVIL',
      bloque: true,
    });
    expect(TOKENS_POR_ID.get('retencion_fiel_cumplimiento_au_au')?.bloque).toBe(true);
    expect(TOKENS_POR_ID.get('modelo_anticipo_contrato_au_au')?.bloque).toBe(true);
    expect(TOKENS_POR_ID.get('modelo_garantia_laboral_au_au')?.bloque).toBe(true);
  });

  it('el editor ve cada bloque como píldora con su título', () => {
    const html = renderizarPildoras(GARANTIAS, titulosBloques(TODOS), 'RESOLVER');
    expect(html).not.toMatch(/\{[a-z_]+\}/);
    expect(html).toContain(
      'data-token-id="modelo_poliza_responsabilidad_civil_au_au" data-resolved="true">[PÓLIZA DE RESPONSABILIDAD CIVIL]</span>',
    );
    expect(html).toContain('>[GARANTÍA LABORAL]</span>');
    expect(html).not.toContain('<br>');
  });

  it('si no aplica, la píldora lo dice', () => {
    const html = renderizarPildoras(GARANTIAS, titulosBloques(NINGUNO), 'RESOLVER');
    expect(html).toContain('>No aplica: Póliza de responsabilidad civil</span>');
    expect(html).toContain('>No aplica: Garantía de anticipo</span>');
  });

  it('si cambia la tarjeta 8, el título se actualiza al volver a abrir', () => {
    const guardado = renderizarPildoras(GARANTIAS, titulosBloques(NINGUNO), 'RESOLVER');
    const reabierto = renderizarPildoras(guardado, titulosBloques(TODOS), 'RESOLVER');
    expect(reabierto).toContain('>[PÓLIZA DE RESPONSABILIDAD CIVIL]</span>');
    expect(reabierto).not.toContain('No aplica');
  });

  it('abrir dos veces no duplica nada', () => {
    const una = renderizarPildoras(GARANTIAS, titulosBloques(TODOS), 'RESOLVER');
    expect(renderizarPildoras(una, titulosBloques(TODOS), 'RESOLVER')).toBe(una);
  });

  it('a la biblioteca va la marca, no el título ni el párrafo', () => {
    const html = renderizarPildoras(GARANTIAS, titulosBloques(NINGUNO), 'RESOLVER');
    expect(pildorasAMarcas(html)).toBe(GARANTIAS);
  });

  it('la píldora se convierte en el párrafo, aunque el editor reordene o pierda atributos', () => {
    const html =
      '<p>LCP, ' +
      pildora('retencion_fiel_cumplimiento_au_au', '[RETENCIÓN DE FIEL CUMPLIMIENTO]') +
      '.</p><p>' +
      "<span data-token-id='modelo_poliza_responsabilidad_civil_au_au' class='contract-pill'>No aplica: Póliza de responsabilidad civil</span>" +
      '</p>';
    const salida = expandirBloques(html, TODOS);
    expect(salida).toContain('LCP, o someterse a la retención equivalente del 10%');
    expect(salida).toContain('- Póliza de Responsabilidad Civil:');
    expect(salida).not.toContain('No aplica');
    expect(salida).not.toContain('contract-pill" data-token-id="modelo_poliza');
  });

  it('si no aplica, la píldora desaparece del documento', () => {
    const html = renderizarPildoras(GARANTIAS, titulosBloques(TODOS), 'RESOLVER');
    const salida = expandirBloques(html, NINGUNO);
    expect(salida).toBe('<p>Artículo 123 de la LCP.</p><p></p><p></p><p></p>');
  });

  it('las marcas viejas con llaves siguen funcionando', () => {
    expect(expandirBloques(GARANTIAS, TODOS)).toBe(
      expandirBloques(renderizarPildoras(GARANTIAS, titulosBloques(TODOS), 'RESOLVER'), TODOS),
    );
  });
});

describe('Pliego con el modelo de contrato', () => {
  const pliego = (fase: Record<string, unknown>) =>
    mapDatosPliegoCondiciones({
      descripcionObjeto: 'COMPRA DE INSUMOS',
      codigoNomenclatura: 'CA-001',
      ente: { nombre: 'GOBERNACIÓN' },
      modalidad: { tipoContratacion: 'BIENES' },
      cronograma: {},
      fasePreparatoria: {
        porcentajeFielCumplimiento: 10,
        porcentajeGarantiaLaboral: 5,
        modeloContratoData: {
          clauses: [
            {
              order: 1,
              titulo: 'Garantías',
              cuerpoHtml: renderizarPildoras(GARANTIAS, titulosBloques(NINGUNO), 'RESOLVER'),
            },
          ],
        },
        ...fase,
      },
    } as never) as { clausulas_custom_au_au?: { cuerpo_clausula_custom_au_au: string }[] };

  const cuerpo = (fase: Record<string, unknown>) =>
    pliego(fase).clausulas_custom_au_au?.[0]?.cuerpo_clausula_custom_au_au ?? '';

  it('no deja llaves ni títulos de bloque', () => {
    const texto = cuerpo({ ...TODOS });
    expect(texto).not.toMatch(/\{[a-z_]+\}/);
    expect(texto).not.toContain('No aplica');
    expect(texto).not.toContain('[PÓLIZA DE RESPONSABILIDAD CIVIL]');
    expect(texto).toContain('Garantía Laboral:');
    expect(texto).toContain('Póliza de Responsabilidad Civil:');
    expect(texto).toContain('con ocasión de COMPRA DE INSUMOS');
  });

  it('sin lo marcado en la tarjeta 8 no lleva los párrafos', () => {
    const texto = cuerpo({});
    expect(texto).toBe('Artículo 123 de la LCP.');
  });
});
