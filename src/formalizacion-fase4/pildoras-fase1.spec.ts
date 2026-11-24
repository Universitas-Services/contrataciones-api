import { Prisma } from '@prisma/client';
import { corchetesAPildoras, pildorasAMarcas, renderizarPildoras } from './pildoras.util';
import { resolverTokensFase1 } from './tokens-contrato.resolver';

const EXPEDIENTE = {
  descripcionObjeto: 'Adquisición de mobiliario',
  codigoNomenclatura: 'CA-001-2026',
  ente: {
    nombre: 'Alcaldía de Prueba',
    rif: 'G-1',
    organoAdscripcion: null,
    ciudad: 'Barquisimeto',
  },
  unidadUsuaria: { nombreUnidadUsuaria: 'Dirección de Administración' },
  fasePreparatoria: {
    porcentajeFielCumplimiento: new Prisma.Decimal(20),
    porcentajeGarantiaLaboral: new Prisma.Decimal(10),
    porcentajeResponsabilidadSocial: new Prisma.Decimal(3),
    porcentajeResponsabilidadCivil: null,
    montoResponsabilidadCivilBs: new Prisma.Decimal(1500),
    modalidadCrs: 'Aporte en especie',
    unidadRespCumplimientoCrs: 'Dirección Social',
  },
};

/** Las 11 marcas con llaves que usan las cláusulas de Fase 1. */
const LLAVES =
  '{desc_objeto_contratacion_au_au} | {cod_nomenclatura_proceso_au_au} | {nom_ente_contratante} | ' +
  '{nom_unidad_usuaria} | {porcentaje_fiel_cumplimiento_au_au}% | {porcentaje_responsabilidad_social_au_au}% | ' +
  '{porcentaje_garantia_laboral_au_au}% | {porcentaje_responsabilidad_civil_au_au}% | ' +
  '{monto_responsabilidad_civil_bs_au_au} | {modalidad_crs_au_au} | {unidad_resp_cumplimiento_crs_au_au}';

describe('Marcas del Modelo de Contrato en Fase 1', () => {
  const valores = resolverTokensFase1(EXPEDIENTE);

  it('resuelve las marcas con llaves con los datos que ya existen', () => {
    const html = renderizarPildoras(`<p>${LLAVES}</p>`, valores, 'VALOR');
    expect(html).toBe(
      '<p>Adquisición de mobiliario | CA-001-2026 | Alcaldía de Prueba | Dirección de Administración | ' +
        '20% | 3% | 10% | ________ | 1.500,00 | Aporte en especie | Dirección Social</p>',
    );
  });

  it('lo que aún no existe en Fase 1 queda en null', () => {
    expect(valores.nombre_contratista_au_au).toBeNull();
    expect(valores.monto_contrato_letras_au_au).toBeNull();
    expect(valores.monto_garantia_fiel_cumplimiento_numeros_au_au).toBeNull();
  });

  it('en el editor, la píldora lleva el valor y conserva su id', () => {
    const html = renderizarPildoras('<p>{desc_objeto_contratacion_au_au}</p>', valores, 'RESOLVER');
    expect(html).toBe(
      '<p><span class="contract-pill" data-token-id="objeto_contratacion_au_au" data-resolved="true">Adquisición de mobiliario</span></p>',
    );
    // Resolver otra vez no anida spans ni duplica el atributo.
    expect(renderizarPildoras(html, valores, 'RESOLVER')).toBe(html);
  });

  it('una variable sin dato queda con su etiqueta, no con un valor viejo', () => {
    const html = renderizarPildoras('<p>[MONTO CONTRATO EN LETRAS]</p>', valores, 'RESOLVER');
    expect(html).toContain('data-token-id="monto_contrato_letras_au_au"');
    expect(html).toContain('[MONTO CONTRATO EN LETRAS]');
  });

  it('al guardar en la biblioteca, las píldoras vuelven a su marca', () => {
    const original =
      '<p>Objeto {desc_objeto_contratacion_au_au}, fianza {porcentaje_fiel_cumplimiento_au_au}% y [MONTO CONTRATO EN LETRAS].</p>';
    const editado = renderizarPildoras(original, valores, 'RESOLVER');
    const guardado = pildorasAMarcas(editado);
    expect(guardado).toBe(
      '<p>Objeto {desc_objeto_contratacion_au_au}, fianza {porcentaje_fiel_cumplimiento_au_au} y [MONTO CONTRATO EN LETRAS].</p>',
    );
    expect(guardado).not.toContain('Adquisición');
    // Y al volver a usarla, resuelve igual que la original.
    expect(renderizarPildoras(guardado, valores, 'VALOR')).toBe(
      renderizarPildoras(original, valores, 'VALOR'),
    );
  });

  it('un texto sin píldoras no cambia', () => {
    expect(pildorasAMarcas('<p>Texto [sic] normal.</p>')).toBe('<p>Texto [sic] normal.</p>');
    expect(corchetesAPildoras('<p>Texto [sic] normal.</p>')).toBe('<p>Texto [sic] normal.</p>');
  });
});
