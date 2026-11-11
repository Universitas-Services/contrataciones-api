import {
  nombreArchivoUtf8,
  progreso,
  riesgo,
  siguienteDocumento,
  textoAnalizado,
  textoDictamenListo,
  textoTipoNoCoincide,
} from './compliance.util';
import { leerEnLinea, leerMarkdown, markdownAPdf, textoCompatible } from './markdown-pdf.util';

const CHECKLIST = [
  { tipo_documento: 'ACTIVIDADES_PREVIAS', nombre: 'Actividades Previas' },
  { tipo_documento: 'ACTA_INICIO', nombre: 'Acta de Inicio' },
  { tipo_documento: 'OFERTAS', nombre: 'Ofertas' },
];

const doc = (
  tipoDocumento: string,
  cambios: Partial<{
    estado: string;
    vigente: boolean;
    tipoCoincide: boolean | null;
    estatusGlobal: string | null;
  }> = {},
) => ({
  tipoDocumento,
  estado: 'ANALIZADO',
  vigente: true,
  tipoCoincide: true,
  estatusGlobal: 'Verde',
  ...cambios,
});

describe('progreso y siguiente documento', () => {
  it('solo cuentan los vigentes, analizados y del tipo correcto', () => {
    const documentos = [
      doc('ACTIVIDADES_PREVIAS'),
      doc('ACTA_INICIO', { tipoCoincide: false }),
      doc('OFERTAS', { estado: 'PROCESANDO' }),
      doc('OFERTAS', { vigente: false }),
    ];
    expect(progreso(CHECKLIST, documentos)).toEqual({ cubiertos: 1, total: 3 });
    expect(siguienteDocumento(CHECKLIST, documentos, null)).toBe('ACTA_INICIO');
  });

  it('respeta el tipo pedido por el agente mientras siga pendiente', () => {
    expect(siguienteDocumento(CHECKLIST, [], 'OFERTAS')).toBe('OFERTAS');
    expect(siguienteDocumento(CHECKLIST, [doc('OFERTAS')], 'OFERTAS')).toBe('ACTIVIDADES_PREVIAS');
    expect(siguienteDocumento(CHECKLIST, [], 'NO_EXISTE')).toBe('ACTIVIDADES_PREVIAS');
  });

  it('sin checklist no hay progreso', () => {
    expect(progreso(null, [])).toBeNull();
    expect(siguienteDocumento(null, [], null)).toBeNull();
  });
});

describe('riesgo', () => {
  it('sale del último dictamen cuando existe', () => {
    const puntaje = { global: { rango: 'Hallazgos Críticos' }, flag_nulidad_absoluta: true };
    expect(riesgo(puntaje, [doc('ACTA_INICIO')])).toEqual({
      fuente: 'DICTAMEN',
      rango: 'Hallazgos Críticos',
      nulidadAbsoluta: true,
      semaforo: null,
    });
  });

  it('antes del dictamen es el peor semáforo de los documentos válidos', () => {
    const documentos = [
      doc('ACTIVIDADES_PREVIAS', { estatusGlobal: 'Amarillo' }),
      doc('ACTA_INICIO', { estatusGlobal: 'Verde' }),
      doc('OFERTAS', { estatusGlobal: 'Rojo', tipoCoincide: false }),
    ];
    expect(riesgo(null, documentos)).toMatchObject({ fuente: 'DOCUMENTOS', semaforo: 'Amarillo' });
    expect(riesgo(null, [])).toBeNull();
  });
});

describe('nombre del archivo subido', () => {
  it('repara el nombre que multer entrega como latin1', () => {
    const comoLlega = Buffer.from('VERSIÓN NOTIFICACIÓN N°.docx', 'utf8').toString('latin1');
    expect(nombreArchivoUtf8(comoLlega)).toBe('VERSIÓN NOTIFICACIÓN N°.docx');
  });

  it('no toca un nombre que ya viene en UTF-8', () => {
    expect(nombreArchivoUtf8('ACTA DE INICIO 2DA VERSIÓN.docx')).toBe(
      'ACTA DE INICIO 2DA VERSIÓN.docx',
    );
    expect(nombreArchivoUtf8('acta.pdf')).toBe('acta.pdf');
    expect(nombreArchivoUtf8('informe 📄.pdf')).toBe('informe 📄.pdf');
  });
});

describe('textos del chat', () => {
  it('el resultado lleva semáforo y cifras', () => {
    const texto = textoAnalizado(
      'acta.pdf',
      'Acta de Inicio',
      { resumen: { evaluados: 26, hallazgos: 10 } },
      'Rojo',
    );
    expect(texto).toBe(
      'Terminé de analizar acta.pdf (Acta de Inicio). Semáforo: Rojo. 10 hallazgo(s) en 26 puntos revisados.',
    );
  });

  it('avisa cuando el archivo es de otro tipo', () => {
    expect(textoTipoNoCoincide('x.pdf', 'Acta de Inicio', 'Llamado')).toContain(
      'Parece ser Llamado.',
    );
  });

  it('el dictamen resume puntaje, nulidad y contradicciones', () => {
    const texto = textoDictamenListo({
      alcance: 'FINAL',
      puntaje: {
        global: { porcentaje: 56.79, rango: 'Hallazgos Críticos' },
        flag_nulidad_absoluta: true,
      },
      coherencia: [{}, {}],
    });
    expect(texto).toContain('El dictamen final está listo.');
    expect(texto).toContain('56,79 % (Hallazgos Críticos)');
    expect(texto).toContain('nulidad absoluta');
    expect(texto).toContain('2 contradicción(es)');
  });
});

describe('Markdown del dictamen a PDF', () => {
  it('reconoce títulos, listas, citas, separadores y párrafos', () => {
    const bloques = leerMarkdown(
      '# Informe\n\nPrimer párrafo\ncontinúa.\n\n- uno\n  - dos\n1. tres\n> cita\n\n---\nfinal',
    );
    expect(bloques).toEqual([
      { tipo: 'titulo', nivel: 1, texto: 'Informe' },
      { tipo: 'parrafo', texto: 'Primer párrafo continúa.' },
      { tipo: 'item', texto: 'uno', marca: '•', nivel: 0 },
      { tipo: 'item', texto: 'dos', marca: '•', nivel: 1 },
      { tipo: 'item', texto: 'tres', marca: '1.', nivel: 0 },
      { tipo: 'cita', texto: 'cita' },
      { tipo: 'separador' },
      { tipo: 'parrafo', texto: 'final' },
    ]);
  });

  it('separa negritas y cursivas', () => {
    expect(leerEnLinea('Monto **adjudicado** en *bolívares* y `código`')).toEqual([
      { texto: 'Monto ', negrita: false, cursiva: false },
      { texto: 'adjudicado', negrita: true, cursiva: false },
      { texto: ' en ', negrita: false, cursiva: false },
      { texto: 'bolívares', negrita: false, cursiva: true },
      { texto: ' y ', negrita: false, cursiva: false },
      { texto: 'código', negrita: false, cursiva: false },
    ]);
  });

  it('el guion bajo dentro de una palabra no es cursiva', () => {
    expect(leerEnLinea('Copia de 1._ACTA DE INICIO 2DA VERSI_N.docx y _énfasis_')).toEqual([
      { texto: 'Copia de 1._ACTA DE INICIO 2DA VERSI_N.docx y ', negrita: false, cursiva: false },
      { texto: 'énfasis', negrita: false, cursiva: true },
    ]);
    expect(leerEnLinea('__fuerte__ y snake__case__x')).toEqual([
      { texto: 'fuerte', negrita: true, cursiva: false },
      { texto: ' y snake__case__x', negrita: false, cursiva: false },
    ]);
  });

  it('conserva los acentos y reemplaza lo que la fuente no puede dibujar', () => {
    expect(textoCompatible('Artículo ≥ 5 → ñ «ok» ✓ 🚀')).toBe('Artículo >= 5 -> ñ «ok» Sí ');
  });

  it('genera un PDF válido', async () => {
    const pdf = await markdownAPdf(
      '# Dictamen\n\nTexto con **negrita**.\n\n- punto',
      'Dictamen CA-1',
    );
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
