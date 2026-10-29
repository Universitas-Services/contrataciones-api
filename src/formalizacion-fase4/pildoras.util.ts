/**
 * Píldoras de variables en el HTML de las cláusulas.
 *
 * El editor del frontend guarda cada variable como un nodo no editable:
 *
 *   <span class="contract-pill" data-token-id="monto_contrato_letras_au_au">
 *     [MONTO CONTRATO EN LETRAS]
 *   </span>
 *
 * La llave es SIEMPRE `data-token-id`, nunca el texto entre corchetes: la
 * etiqueta es lo que lee el usuario y puede cambiar de redacción sin que las
 * cláusulas ya guardadas dejen de resolver.
 */

/** Cómo se pinta una píldora al renderizar. */
export type ModoPildora =
  /** Precarga del editor: se mete el valor y se marca `data-resolved`. */
  | 'RESOLVER'
  /** Documento final: texto plano con el valor, o una línea si no hay. */
  | 'VALOR'
  /** Pliego de Fase 1: siempre una línea para llenar a mano. */
  | 'LINEA';

export const LINEA_VACIA = '________';

/**
 * Captura cada `<span …data-token-id="…">…</span>`.
 *
 * Tolera que los atributos vengan en cualquier orden y con comillas simples o
 * dobles, que es como los emiten los distintos editores.
 */
const RE_PILDORA = /<span\b([^>]*\bdata-token-id\s*=\s*["']([^"']+)["'][^>]*)>([\s\S]*?)<\/span>/gi;

/** Quita etiquetas HTML de un fragmento, para obtener su texto. */
function soloTexto(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Los ids de todas las píldoras presentes en un HTML, sin repetir. */
export function extraerTokenIds(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(RE_PILDORA)) ids.add(m[2]);
  return [...ids];
}

/**
 * Reescribe las píldoras de un HTML según el modo.
 *
 * `valores` mapea id → valor ya formateado. Un id sin valor cae en la línea
 * vacía, nunca deja el corchete crudo a la vista.
 */
export function renderizarPildoras(
  html: string,
  valores: Record<string, string | null | undefined>,
  modo: ModoPildora,
): string {
  return html.replace(
    RE_PILDORA,
    (_completo, atributos: string, tokenId: string, interior: string) => {
      // El pliego de Fase 1 va siempre con la línea para llenar a mano.
      if (modo === 'LINEA') return LINEA_VACIA;

      const valor = valores[tokenId];
      const texto = valor != null && `${valor}`.trim() !== '' ? `${valor}` : null;

      if (modo === 'VALOR') return texto ?? LINEA_VACIA;

      // RESOLVER: conserva el nodo y sus atributos, cambia el texto interno.
      const attrs = limpiarResuelto(atributos);
      return texto
        ? `<span${attrs} data-resolved="true">${escapar(texto)}</span>`
        : `<span${attrs}>${escapar(soloTexto(interior) || LINEA_VACIA)}</span>`;
    },
  );
}

/** Evita que `data-resolved` se duplique al precargar dos veces seguidas. */
function limpiarResuelto(atributos: string): string {
  return atributos.replace(/\s*data-resolved\s*=\s*["'][^"']*["']/gi, '');
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** El documento final no lleva HTML: se aplana a texto plano. */
export function aTextoPlano(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
