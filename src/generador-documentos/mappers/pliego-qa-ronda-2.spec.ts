import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { Prisma } from '@prisma/client';
import { mapDatosPliegoCondiciones, numeroClausula } from './pliego-condiciones.mapper';

const PLANTILLA = path.join(__dirname, '../templates/pliego-condiciones-template.docx');

function expediente(fase: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    codigoNomenclatura: 'CA-001-2026',
    descripcionObjeto: 'Adquisición de mobiliario',
    ente: { nombre: 'Alcaldía de Prueba', ciudad: 'Barquisimeto', estado: 'Lara' },
    unidadUsuaria: { nombreUnidadUsuaria: 'Dirección de Administración' },
    fasePreparatoria: { especificaciones: [], ...fase },
    cronograma: {},
    modalidad: { montoEstimadoBs: 1000, valorUcauBase: 1, tipoContratacion: 'BIENES' },
    comision: null,
    autoridad: null,
    presupuestoItems: [
      {
        descripcionItem: 'Silla',
        codigoPartida: '4.02',
        unidadMedida: 'Unidad',
        cantidadRequerida: 2,
        precioUnitarioEstimado: 10,
        totalItem: 20,
      },
      {
        descripcionItem: 'Mesa',
        codigoPartida: '4.02',
        unidadMedida: 'Unidad',
        cantidadRequerida: 1,
        precioUnitarioEstimado: 30,
        totalItem: 30,
      },
      {
        descripcionItem: 'Estante',
        codigoPartida: '4.02',
        unidadMedida: 'Unidad',
        cantidadRequerida: 1,
        precioUnitarioEstimado: 5,
        totalItem: 5,
      },
    ],
    ...extra,
  };
}

/** Renderiza como el generador: parchea el bucle anónimo del presupuesto. */
function renderXml(datos: Record<string, unknown>): string {
  const zip = new PizZip(fs.readFileSync(PLANTILLA, 'binary'));
  const xml = zip
    .file('word/document.xml')!
    .asText()
    .replace(/\{#\}/g, '{#items_presupuesto}')
    .replace(/\{\/\}/g, '{/items_presupuesto}');
  zip.file('word/document.xml', xml);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });
  doc.render(datos);
  return doc.getZip().file('word/document.xml')!.asText();
}

const parrafos = (xml: string) => xml.split('</w:p>').map((p) => p.replace(/<[^>]+>/g, '').trim());

/** Páginas sin texto entre dos saltos, desde un título hasta el final. */
function paginasVacias(xml: string, desde: string): number {
  const ps = xml.split('</w:p>');
  const inicio = ps.findIndex((p) => p.replace(/<[^>]+>/g, '').trim() === desde);
  let vacias = 0;
  let conTexto = true;
  for (let i = inicio; i < ps.length; i++) {
    if (/w:type="page"|pageBreakBefore/.test(ps[i])) {
      if (!conTexto) vacias++;
      conTexto = false;
    }
    if (ps[i].replace(/<[^>]+>/g, '').trim()) conTexto = true;
  }
  return vacias;
}

describe('numeroClausula', () => {
  it('convierte el número en ordinal y respeta la palabra si ya viene escrita', () => {
    expect(numeroClausula(1, 0)).toBe('PRIMERA');
    expect(numeroClausula('12', 0)).toBe('DÉCIMA SEGUNDA');
    expect(numeroClausula('segunda', 0)).toBe('SEGUNDA');
    expect(numeroClausula(undefined, 2)).toBe('TERCERA');
  });
});

describe('Pliego — segunda ronda de QA', () => {
  const datos = mapDatosPliegoCondiciones(
    expediente({
      indPrefLocal: true,
      puntuacionBonoLocal: new Prisma.Decimal(5),
      indBonoSujeto: true,
      puntuacionBonoSujeto: new Prisma.Decimal('2.5'),
      porcentajeFielCumplimiento: new Prisma.Decimal(20),
      modeloContratoData: {
        clauses: [
          {
            order: 1,
            titulo: 'Objeto del contrato',
            cuerpoHtml:
              '<p>El objeto es {desc_objeto_contratacion_au_au} del procedimiento {cod_nomenclatura_proceso_au_au}, con fianza del {porcentaje_fiel_cumplimiento_au_au}%.</p>',
          },
          {
            order: 'segunda',
            titulo: 'régimen normativo',
            cuerpoHtml:
              '<p>Monto: [MONTO CONTRATO EN LETRAS]. Unidad: <span class="contract-pill" data-token-id="nom_unidad_usuaria_au_au" data-resolved="true">Vieja</span>.</p>',
          },
        ],
      },
      calificacionLegalData: { exigidos: {}, sustitutos: {}, personalizados: [] },
    }),
    ['Ley A.'],
  );

  it('los bonos guardados como Decimal salen con su valor', () => {
    expect(datos.puntuacion_bono_local_au_au).toBe('5');
    expect(datos.puntuacion_bono_sujeto_au_au).toBe('2.5');
  });

  it('cada ítem del presupuesto lleva su número', () => {
    expect(
      datos.items_presupuesto.map((i: { numero_item_au_au: number }) => i.numero_item_au_au),
    ).toEqual([1, 2, 3]);
  });

  it('las cláusulas van en mayúscula y con el dato de Fase 1', () => {
    const [primera, segunda] = datos.clausulas_custom_au_au;
    expect(primera.num_clausula_custom_au_au).toBe('PRIMERA');
    expect(primera.titulo_clausula_custom_au_au).toBe('OBJETO DEL CONTRATO');
    expect(primera.cuerpo_clausula_custom_au_au).toBe(
      'El objeto es Adquisición de mobiliario del procedimiento CA-001-2026, con fianza del 20%.',
    );
    expect(segunda.num_clausula_custom_au_au).toBe('SEGUNDA');
    expect(segunda.titulo_clausula_custom_au_au).toBe('RÉGIMEN NORMATIVO');
    // El monto aún no existe en Fase 1: línea para llenar. La píldora toma el dato actual.
    expect(segunda.cuerpo_clausula_custom_au_au).toBe(
      'Monto: ________. Unidad: Dirección de Administración.',
    );
  });

  const xml = renderXml(datos);
  const texto = parrafos(xml);

  it('el Word numera los ítems 1, 2 y 3', () => {
    const i = texto.findIndex((t) => t === 'Silla');
    expect(texto.slice(i - 1, i)).toEqual(['1']);
    expect(texto).toContain('2');
    expect(texto[texto.findIndex((t) => t === 'Estante') - 1]).toBe('3');
  });

  it('el Word imprime los bonos y las cláusulas sin marcas', () => {
    const todo = texto.join('\n');
    expect(todo).toContain('CLÁUSULA PRIMERA: OBJETO DEL CONTRATO');
    expect(todo).not.toMatch(/\{[a-z_#/^]+\}/);
    expect(todo).toMatch(/fija de\s*5\s*puntos/);
  });

  it('incluye los textos corregidos por documentación', () => {
    const conModelos = renderXml(
      mapDatosPliegoCondiciones(
        expediente({
          calificacionLegalData: {
            exigidos: {
              modDeclaracionAutocalculoVanAuAu: true,
              modGarantiaFielCumplAuAu: true,
              modFianzaLaboralAuAu: true,
            },
            sustitutos: {},
            personalizados: [],
          },
        }),
        ['Ley A.'],
      ),
    );
    const todo = parrafos(conModelos).join('\n');
    expect(todo).toContain('en el procedimiento N° CA-001-2026');
    expect(todo).toContain('esta fianza la ciudad Barquisimeto');
    expect(todo).toContain('En ciudad ________________, a los 00');
  });

  it('sin modelos exigidos, el Anexo III no deja páginas vacías', () => {
    expect(paginasVacias(xml, 'ANEXO III')).toBe(0);
  });

  it('con algunos modelos, tampoco', () => {
    const conModelos = renderXml(
      mapDatosPliegoCondiciones(
        expediente({
          calificacionLegalData: {
            exigidos: { modCartaManifestacionVoluntadAuAu: true, modSolvenciaLaboralAuAu: true },
            sustitutos: {},
            personalizados: [
              { sobre: 2, descripcion: 'Constancia', exigido: true, tieneModelo: true },
            ],
          },
        }),
        ['Ley A.'],
      ),
    );
    expect(paginasVacias(conModelos, 'ANEXO III')).toBe(0);
    const indice = parrafos(conModelos);
    const i = indice.indexOf('MODELOS Y FORMATOS');
    expect(indice.slice(i + 1, i + 4)).toEqual([
      'MODELO: Carta de manifestación de voluntad.',
      'MODELO: Declaración Jurada de Solvencia Laboral.',
      'MODELO: Constancia',
    ]);
  });
});
