import PDFDocument from 'pdfkit';

/**
 * Convierte a PDF el Markdown del dictamen. El agente no usa tablas, así que
 * basta con títulos, párrafos, listas, citas, separadores, negritas y cursivas.
 * Se genera al descargar: el Markdown guardado es la fuente.
 */

const MARGEN = 64;
const TAMANO_TITULO = [0, 18, 15, 13, 12, 11, 11];

// Las fuentes estándar de PDF solo cubren WinAnsi (Latin-1 y algunos signos).
const REEMPLAZOS: Record<string, string> = {
  '≥': '>=',
  '≤': '<=',
  '≠': '!=',
  '→': '->',
  '←': '<-',
  '✓': 'Sí',
  '✔': 'Sí',
  '✗': 'No',
  '✘': 'No',
  '…': '...',
};
const WINANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

export function textoCompatible(texto: string): string {
  let salida = '';
  for (const caracter of texto) {
    if (REEMPLAZOS[caracter] != null) {
      salida += REEMPLAZOS[caracter];
      continue;
    }
    const codigo = caracter.codePointAt(0) ?? 0;
    const latino =
      codigo === 9 || codigo === 10 || (codigo >= 32 && codigo <= 255 && codigo !== 127);
    if (latino || WINANSI_EXTRA.has(caracter)) salida += caracter;
  }
  return salida;
}

type Bloque =
  | { tipo: 'titulo'; nivel: number; texto: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'item'; texto: string; marca: string; nivel: number }
  | { tipo: 'cita'; texto: string }
  | { tipo: 'separador' };

export function leerMarkdown(markdown: string): Bloque[] {
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push({ tipo: 'parrafo', texto: parrafo.join(' ') });
    parrafo = [];
  };

  for (const crudo of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const linea = crudo.trimEnd();
    if (!linea.trim()) {
      cerrarParrafo();
      continue;
    }

    const titulo = linea.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (titulo) {
      cerrarParrafo();
      bloques.push({
        tipo: 'titulo',
        nivel: titulo[1].length,
        texto: titulo[2].replace(/#+$/, '').trim(),
      });
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(linea)) {
      cerrarParrafo();
      bloques.push({ tipo: 'separador' });
      continue;
    }
    const item = linea.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      cerrarParrafo();
      const nivel = Math.min(Math.floor(item[1].replace(/\t/g, '  ').length / 2), 4);
      const marca = /\d/.test(item[2]) ? item[2].replace(')', '.') : '•';
      bloques.push({ tipo: 'item', texto: item[3], marca, nivel });
      continue;
    }
    const cita = linea.match(/^\s*>\s?(.*)$/);
    if (cita) {
      cerrarParrafo();
      bloques.push({ tipo: 'cita', texto: cita[1] });
      continue;
    }
    parrafo.push(linea.trim());
  }
  cerrarParrafo();
  return bloques;
}

interface Tramo {
  texto: string;
  negrita: boolean;
  cursiva: boolean;
}

/** Negritas (`**`), cursivas (`*` o `_`) y código (`` ` ``, como texto normal). */
export function leerEnLinea(texto: string): Tramo[] {
  const tramos: Tramo[] = [];
  // El guion bajo solo marca énfasis tras un espacio o un signo de apertura:
  // en nombres de archivo como «1._ACTA» o «VERSI_N» es texto.
  const abre = String.raw`(?<=^|[\s(\[«"'])`;
  const cierra = String.raw`(?=$|[\s).,;:!?\]»"'])`;
  const patron = new RegExp(
    [
      String.raw`\*\*(.+?)\*\*`,
      String.raw`${abre}__(?!\s)(.+?)(?<!\s)__${cierra}`,
      String.raw`\*(?!\s)(.+?)(?<!\s)\*`,
      String.raw`${abre}_(?!\s)(.+?)(?<!\s)_${cierra}`,
      '`([^`]+)`',
    ].join('|'),
    'gu',
  );
  let ultimo = 0;
  for (const m of texto.matchAll(patron)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo)
      tramos.push({ texto: texto.slice(ultimo, inicio), negrita: false, cursiva: false });
    const negrita = m[1] ?? m[2];
    const cursiva = m[3] ?? m[4];
    if (negrita != null) tramos.push({ texto: negrita, negrita: true, cursiva: false });
    else if (cursiva != null) tramos.push({ texto: cursiva, negrita: false, cursiva: true });
    else tramos.push({ texto: m[5], negrita: false, cursiva: false });
    ultimo = inicio + m[0].length;
  }
  if (ultimo < texto.length)
    tramos.push({ texto: texto.slice(ultimo), negrita: false, cursiva: false });
  // Enlaces [texto](url): queda el texto.
  return tramos
    .map((t) => ({ ...t, texto: textoCompatible(t.texto.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')) }))
    .filter((t) => t.texto);
}

function fuente(tramo: { negrita: boolean; cursiva: boolean }): string {
  if (tramo.negrita && tramo.cursiva) return 'Helvetica-BoldOblique';
  if (tramo.negrita) return 'Helvetica-Bold';
  if (tramo.cursiva) return 'Helvetica-Oblique';
  return 'Helvetica';
}

function escribir(
  doc: PDFKit.PDFDocument,
  texto: string,
  opciones: PDFKit.Mixins.TextOptions & { negritaBase?: boolean },
) {
  const tramos = leerEnLinea(texto);
  if (!tramos.length) return;
  // pdfkit descarta el espacio inicial de un tramo encadenado: pasa al final del anterior.
  for (let i = 1; i < tramos.length; i++) {
    const inicial = tramos[i].texto.match(/^\s+/)?.[0];
    if (inicial) {
      tramos[i - 1].texto += inicial;
      tramos[i].texto = tramos[i].texto.slice(inicial.length);
    }
  }
  const { negritaBase, ...resto } = opciones;
  // Y al justificar tramos de distinta fuente abre huecos: se alinean a la izquierda.
  if (tramos.length > 1 && resto.align === 'justify') resto.align = 'left';
  tramos.forEach((tramo, i) => {
    doc
      .font(fuente({ negrita: tramo.negrita || !!negritaBase, cursiva: tramo.cursiva }))
      .text(tramo.texto, { ...resto, continued: i < tramos.length - 1 });
  });
}

export function markdownAPdf(markdown: string, titulo: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
      bufferPages: true,
      info: { Title: textoCompatible(titulo), Author: 'Contrataciones Pro' },
    });
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    const ancho = doc.page.width - MARGEN * 2;
    doc.fillColor('#1b1b1e');

    for (const bloque of leerMarkdown(markdown)) {
      switch (bloque.tipo) {
        case 'titulo':
          doc.moveDown(bloque.nivel <= 2 ? 0.8 : 0.5);
          doc.fontSize(TAMANO_TITULO[bloque.nivel]);
          escribir(doc, bloque.texto, { width: ancho, negritaBase: true });
          doc.moveDown(0.3);
          break;
        case 'parrafo':
          doc.fontSize(11);
          escribir(doc, bloque.texto, { width: ancho, align: 'justify', lineGap: 2 });
          doc.moveDown(0.6);
          break;
        case 'item': {
          const sangria = 14 + bloque.nivel * 16;
          doc.fontSize(11);
          const y = doc.y;
          doc
            .font('Helvetica')
            .text(bloque.marca, MARGEN + sangria - 12, y, { width: 12, lineBreak: false });
          doc.x = MARGEN + sangria;
          doc.y = y;
          escribir(doc, bloque.texto, { width: ancho - sangria, lineGap: 2 });
          doc.x = MARGEN;
          doc.moveDown(0.3);
          break;
        }
        case 'cita':
          doc.fontSize(11).fillColor('#444444');
          doc.x = MARGEN + 16;
          escribir(doc, bloque.texto, { width: ancho - 16, lineGap: 2 });
          doc.x = MARGEN;
          doc.fillColor('#1b1b1e').moveDown(0.5);
          break;
        case 'separador': {
          doc.moveDown(0.4);
          const y = doc.y;
          doc
            .moveTo(MARGEN, y)
            .lineTo(MARGEN + ancho, y)
            .lineWidth(0.5)
            .strokeColor('#999999')
            .stroke();
          doc.moveDown(0.6);
          break;
        }
      }
    }

    // Numeración de páginas.
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
      doc.switchToPage(rango.start + i);
      const margenInferior = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#777777')
        .text(`Página ${i + 1} de ${rango.count}`, MARGEN, doc.page.height - MARGEN / 2 - 6, {
          width: ancho,
          align: 'center',
          lineBreak: false,
        });
      doc.page.margins.bottom = margenInferior;
    }
    doc.end();
  });
}
