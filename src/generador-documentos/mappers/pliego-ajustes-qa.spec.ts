import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { mapDatosPliegoCondiciones, normativasAdicionales } from './pliego-condiciones.mapper';

const PLANTILLA = path.join(__dirname, '../templates/pliego-condiciones-template.docx');

/** Expediente mínimo: lo que el mapper necesita para no fallar, más el caso a probar. */
function expediente(fase: Record<string, unknown>, paginaWeb: string | null = null) {
  return {
    codigoNomenclatura: 'CA-001-2026',
    descripcionObjeto: 'Adquisición de mobiliario',
    ente: { nombre: 'Alcaldía de Prueba', ciudad: 'Barquisimeto', paginaWeb },
    fasePreparatoria: { especificaciones: [], ...fase },
    cronograma: {},
    modalidad: { montoEstimadoBs: 1000, valorUcauBase: 1 },
    comision: null,
    autoridad: null,
    presupuestoItems: [],
  };
}

function render(datos: Record<string, unknown>): string[] {
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(PLANTILLA, 'binary')), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });
  doc.render(datos);
  const xml = doc.getZip().file('word/document.xml')!.asText();
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).map((p) =>
    (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(''),
  );
}

const desde = (lineas: string[], inicio: RegExp, n: number) => {
  const i = lineas.findIndex((l) => inicio.test(l));
  return lineas.slice(i, i + n);
};

describe('normativasAdicionales', () => {
  it('lee el JSON guardado, un texto suelto antiguo o nada', () => {
    expect(normativasAdicionales('["Ley A.", " ", "Ley B."]')).toEqual(['Ley A.', 'Ley B.']);
    expect(normativasAdicionales('Ordenanza vieja')).toEqual(['Ordenanza vieja']);
    expect(normativasAdicionales(null)).toEqual([]);
    expect(normativasAdicionales('[]')).toEqual([]);
  });
});

describe('Pliego — ajustes de QA', () => {
  const generales = ['Constitución.', 'Ley de Contrataciones Públicas.'];

  const casoA = render(
    mapDatosPliegoCondiciones(
      expediente({
        normativaLegal: JSON.stringify(['Ordenanza municipal.', 'Reglamento interno.']),
        monedaDiferente: true,
        nomMonedaExtranjera: 'Dólar',
        idiomaDiferente: false,
        calificacionLegalData: {
          exigidos: { modCopiaRifVigenteAuAu: true, modCertificadoRncAuAu: true },
          sustitutos: { sustitutoDjCertificadoRncAuAu: true },
          personalizados: [
            { sobre: 1, descripcion: 'Constancia municipal', exigido: true, tieneModelo: true },
            { sobre: 1, descripcion: 'Referencia bancaria', exigido: true, tieneModelo: false },
          ],
        },
      }),
      generales,
    ),
  );

  const casoB = render(
    mapDatosPliegoCondiciones(
      expediente(
        {
          monedaDiferente: false,
          idiomaDiferente: true,
          nomIdiomaDiferente: 'Inglés',
          calificacionLegalData: {
            exigidos: { modEvaluacionDesempenoAuAu: true },
            sustitutos: {},
            personalizados: [],
          },
        },
        'www.ente.gob.ve',
      ),
      generales,
    ),
  );

  it('nunca imprime true, false ni marcadores literales de recaudos', () => {
    for (const caso of [casoA, casoB]) {
      const texto = caso.join('\n');
      expect(texto).not.toMatch(/\btrue\b|\bfalse\b/);
      expect(texto).not.toMatch(/desc_otro_recaudo|url_otro_recaudo/);
      expect(texto).not.toMatch(/puntuación mínima de/);
    }
  });

  it('lista las normativas generales y las adicionales, una por párrafo', () => {
    expect(desde(casoA, /^I\. RÉGIMEN JURÍDICO/, 4).slice(2)).toEqual(generales);
    expect(desde(casoA, /^Asimismo, en atención/, 3).slice(1)).toEqual([
      'Ordenanza municipal.',
      'Reglamento interno.',
    ]);
  });

  it('sin normativas adicionales omite también su párrafo de introducción', () => {
    expect(casoB.some((l) => l.startsWith('Asimismo, en atención'))).toBe(false);
  });

  it('RIF y RNC salen con su texto, y el RNC con su declaración jurada', () => {
    const sobre1 = desde(casoA, /^El participante deberá entregar la documentación/, 12).join('\n');
    expect(sobre1).toContain('- Copia del Registro de Información Fiscal (R.I.F.).');
    expect(sobre1).toContain('Declaración Jurada de Registro en Trámite (R.N.C.)');
  });

  it('los recaudos no exigidos no dejan huecos y los adicionales van uno por línea', () => {
    const sobre1 = desde(casoA, /^El participante deberá entregar la documentación/, 10);
    expect(sobre1.filter((l) => l.trim())).toEqual([
      expect.stringMatching(/^El participante/),
      '- Copia del Registro de Información Fiscal (R.I.F.).',
      expect.stringMatching(/^- Certificado de Inscripción en el Registro Nacional/),
      '-Constancia municipal',
      '-Referencia bancaria',
    ]);
    // Entre un recaudo y el siguiente queda como mucho una línea en blanco.
    expect(sobre1.join('\n')).not.toMatch(/\n\s*\n\s*\n/);
  });

  it('moneda e idioma usan los textos de la documentación', () => {
    expect(desde(casoA, /^C\) De la Moneda/, 2)[1]).toContain('como referencia el/la Dólar');
    expect(casoA.some((l) => l === 'D) Del Idioma de las Ofertas:')).toBe(true);
    expect(desde(casoA, /^D\) Del Idioma/, 2)[1]).toMatch(/^La oferta en su totalidad/);

    expect(desde(casoB, /^C\) De la Moneda/, 1)[0]).toBe('C) De la Moneda de las Ofertas:');
    expect(desde(casoB, /^D\) Del Idioma/, 2)[1]).toContain('idioma extranjero (Inglés)');
  });

  it('la página web del ente aparece solo si existe', () => {
    const publicacion = (caso: string[]) =>
      caso.find((l) => l.startsWith('Iniciado el procedimiento'))!;
    expect(publicacion(casoA)).toContain('(www.snc.gob.ve) hasta un día antes');
    expect(publicacion(casoB)).toContain('y en el del Ente www.ente.gob.ve hasta un día antes');
  });

  it('el anexo nombra el modelo de cada recaudo adicional', () => {
    expect(casoA.some((l) => l.trim() === 'MODELO: Constancia municipal')).toBe(true);
  });
});
