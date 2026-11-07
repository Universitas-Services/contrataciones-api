import {
  TOKENS_POR_CLAVE,
  TOKENS_POR_ID,
  normalizarEtiqueta,
} from '../biblioteca/constants/tokens-contrato.constants';

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
 *
 * Pero las cláusulas de la biblioteca están escritas con el corchete a secas:
 *
 *   El monto total es la cantidad de [MONTO CONTRATO EN LETRAS].
 *
 * Por eso, antes de resolver nada, los corchetes que el catálogo reconoce se
 * convierten en píldoras. Lo que el catálogo no reconoce se deja intacto: si
 * alguien escribió [sic] o [1], no es una variable.
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

/**
 * Un corchete suelto, fuera de cualquier etiqueta HTML. El límite de 120
 * caracteres y la prohibición de saltos de línea evitan tragarse medio párrafo
 * cuando alguien deja un corchete sin cerrar.
 */
const RE_CORCHETE = /\[([^\]\n<>]{1,120})\]/g;

/**
 * Las cláusulas también traen marcas con llaves, herencia del modelo de Fase 1
 * (`{desc_objeto_contratacion_au_au}`). Cada una apunta a su dato del catálogo.
 */
const LLAVES_A_TOKEN: Record<string, string> = {
  desc_objeto_contratacion_au_au: 'objeto_contratacion_au_au',
  cod_nomenclatura_proceso_au_au: 'nomenclatura_proceso_au_au',
  nom_ente_contratante: 'nombre_ente_contratante_au_au',
  nom_unidad_usuaria: 'nom_unidad_usuaria_au_au',
  porcentaje_fiel_cumplimiento_au_au: 'porcentaje_fiel_cumplimiento_au_au',
  porcentaje_responsabilidad_social_au_au: 'porcentaje_responsabilidad_social_au_au',
  porcentaje_garantia_laboral_au_au: 'porcentaje_garantia_laboral_au_au',
  porcentaje_responsabilidad_civil_au_au: 'porcentaje_responsabilidad_civil_au_au',
  monto_responsabilidad_civil_bs_au_au: 'monto_responsabilidad_civil_bs_au_au',
  modalidad_crs_au_au: 'modalidad_crs_au_au',
  unidad_resp_cumplimiento_crs_au_au: 'unidad_resp_cumplimiento_crs_au_au',
};

/** Una marca con llaves y el `%` que algunas cláusulas escriben después. */
const RE_LLAVE = /\{([a-z_]+)\}(%?)/g;

/** Marcador temporal para apartar las píldoras ya existentes. */
const MARCA = '\uE000';
const RE_MARCA = /\uE000(\d+)\uE000/g;

/**
 * Convierte en píldora cada corchete que el catálogo reconozca, para que el
 * resto del render trabaje siempre con la misma forma.
 *
 * Es idempotente: los corchetes que ya están dentro de una píldora se saltan,
 * de modo que aplicarlo dos veces no anida spans.
 */
export function corchetesAPildoras(html: string): string {
  const pildoras: string[] = [];

  // Se apartan las píldoras existentes para no tocar su contenido. El marcador
  // usa el área de uso privado de Unicode, que no aparece en texto real.
  const sinPildoras = html.replace(RE_PILDORA, (completo) => {
    pildoras.push(completo);
    return `${MARCA}${pildoras.length - 1}${MARCA}`;
  });

  const convertido = sinPildoras.replace(RE_CORCHETE, (completo, etiqueta: string) => {
    const token = TOKENS_POR_CLAVE.get(normalizarEtiqueta(etiqueta));
    if (!token) return completo;
    return `<span class="contract-pill" data-token-id="${token.id}">[${etiqueta}]</span>`;
  });

  const conLlaves = convertido.replace(RE_LLAVE, (completo, clave: string, signo: string) => {
    const token = TOKENS_POR_ID.get(LLAVES_A_TOKEN[clave]);
    if (!token) return completo;
    // Los porcentajes ya traen su signo en el valor.
    const resto = token.id.startsWith('porcentaje_') ? '' : signo;
    return `<span class="contract-pill" data-token-id="${token.id}">[${token.etiqueta}]</span>${resto}`;
  });

  return conLlaves.replace(RE_MARCA, (_m, indice: string) => pildoras[Number(indice)]);
}

/** Quita etiquetas HTML de un fragmento, para obtener su texto. */
function soloTexto(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Los ids de todas las píldoras presentes en un HTML, sin repetir. */
export function extraerTokenIds(html: string): string[] {
  const ids = new Set<string>();
  for (const m of corchetesAPildoras(html).matchAll(RE_PILDORA)) ids.add(m[2]);
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
  return corchetesAPildoras(html).replace(
    RE_PILDORA,
    (_completo, atributos: string, tokenId: string, interior: string) => {
      // El pliego de Fase 1 va siempre con la línea para llenar a mano.
      if (modo === 'LINEA') return LINEA_VACIA;

      const valor = valores[tokenId];
      const texto = valor != null && `${valor}`.trim() !== '' ? `${valor}` : null;

      if (modo === 'VALOR') return texto ?? escritoAMano(interior) ?? LINEA_VACIA;

      // RESOLVER: conserva el nodo y sus atributos, cambia el texto interno.
      const attrs = limpiarResuelto(atributos);
      return texto
        ? `<span${attrs} data-resolved="true">${escapar(texto)}</span>`
        : `<span${attrs}>${escapar(soloTexto(interior) || LINEA_VACIA)}</span>`;
    },
  );
}

/**
 * Los datos sin fuente los escribe el usuario dentro de la píldora. Si lo que
 * hay sigue siendo la etiqueta entre corchetes o la línea, no escribió nada.
 */
function escritoAMano(interior: string): string | null {
  const contenido = soloTexto(interior);
  const sinEscribir = !contenido || contenido === LINEA_VACIA || /^\[[^\]]*\]$/.test(contenido);
  return sinEscribir ? null : contenido;
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
