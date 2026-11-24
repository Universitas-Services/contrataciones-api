/**
 * Reglas del módulo de compliance que no dependen de la base ni del agente:
 * progreso, riesgo, siguiente documento y textos que Nest agrega al chat.
 */

/**
 * Tipos que admiten varios archivos: una oferta, notificación o invitación por empresa.
 * Los demás solo se reemplazan.
 */
export const TIPOS_MULTIPLES = new Set([
  'INVITACIONES',
  'OFERTAS',
  'NOTIFICACION_ADJUDICADOS',
  'NOTIFICACION_NO_ADJUDICADOS',
]);

/** Sección 7.4 del contrato. `.txt` no: el agente lo rechaza con 400. */
export const EXTENSIONES_PERMITIDAS = [
  '.pdf',
  '.docx',
  '.xlsx',
  '.xls',
  '.png',
  '.jpg',
  '.jpeg',
  '.tif',
  '.tiff',
  '.webp',
  '.bmp',
];

/** Máximo que acepta el agente. El del almacenamiento puede ser menor. */
export const MAXIMO_AGENTE_MB = 30;

export interface ElementoChecklist {
  tipo_documento: string;
  nombre: string;
}

export interface DocumentoResumen {
  tipoDocumento: string;
  estado: string;
  vigente: boolean;
  tipoCoincide: boolean | null;
  estatusGlobal: string | null;
}

/** Un tipo cuenta como entregado con un documento vigente, analizado y del tipo correcto. */
export function tiposCubiertos(documentos: DocumentoResumen[]): Set<string> {
  return new Set(
    documentos
      .filter((d) => d.vigente && d.estado === 'ANALIZADO' && d.tipoCoincide === true)
      .map((d) => d.tipoDocumento),
  );
}

export function progreso(checklist: ElementoChecklist[] | null, documentos: DocumentoResumen[]) {
  if (!checklist) return null;
  const cubiertos = tiposCubiertos(documentos);
  return {
    cubiertos: checklist.filter((c) => cubiertos.has(c.tipo_documento)).length,
    total: checklist.length,
  };
}

/** El primero del checklist sin cubrir: los documentos se piden en ese orden. */
export function siguienteDocumento(
  checklist: ElementoChecklist[] | null,
  documentos: DocumentoResumen[],
): string | null {
  if (!checklist) return null;
  const cubiertos = tiposCubiertos(documentos);
  return checklist.find((c) => !cubiertos.has(c.tipo_documento))?.tipo_documento ?? null;
}

/**
 * Los resúmenes anteriores al 12/11 traen los códigos internos del cuestionario, que no
 * deben llegar al usuario. Los actuales empiezan por este título.
 */
export function tieneResumen(informeMarkdown: string | null): informeMarkdown is string {
  return /^\s*#\s*Resumen de revisi[oó]n/i.test(informeMarkdown ?? '');
}

/**
 * El mensaje de un análisis sin el resumen que lleva debajo. Así se envía en el historial:
 * el agente ya recibe el `json_analista`, y repetir los resúmenes alargaría cada respuesta.
 */
export function sinResumen(texto: string): string {
  return texto.replace(/\n\s*#\s*Resumen de revisi[oó]n[\s\S]*$/i, '').trimEnd();
}

const GRAVEDAD_SEMAFORO: Record<string, number> = { Verde: 0, Amarillo: 1, Rojo: 2 };

/**
 * Del último dictamen listo; antes del primero, el peor semáforo de los
 * documentos analizados (sección 10).
 */
export function riesgo(
  puntajeUltimoDictamen: unknown,
  documentos: DocumentoResumen[],
): {
  fuente: 'DICTAMEN' | 'DOCUMENTOS';
  rango: string | null;
  nulidadAbsoluta: boolean | null;
  semaforo: string | null;
} | null {
  const puntaje = puntajeUltimoDictamen as {
    global?: { rango?: string };
    flag_nulidad_absoluta?: boolean;
  } | null;
  if (puntaje && typeof puntaje === 'object') {
    return {
      fuente: 'DICTAMEN',
      rango: puntaje.global?.rango ?? null,
      nulidadAbsoluta: puntaje.flag_nulidad_absoluta ?? null,
      semaforo: null,
    };
  }

  const semaforos = documentos
    .filter((d) => d.vigente && d.estado === 'ANALIZADO' && d.tipoCoincide === true)
    .map((d) => d.estatusGlobal)
    .filter((s): s is string => !!s && s in GRAVEDAD_SEMAFORO);
  if (!semaforos.length) return null;
  const peor = semaforos.reduce((a, b) => (GRAVEDAD_SEMAFORO[b] > GRAVEDAD_SEMAFORO[a] ? b : a));
  return { fuente: 'DOCUMENTOS', rango: null, nulidadAbsoluta: null, semaforo: peor };
}

/**
 * multer entrega el nombre del archivo decodificado como latin1, así que una
 * «Ó» llega como «Ã». Se reinterpreta como UTF-8 solo si el resultado sale
 * limpio: un nombre que ya venía bien no se toca.
 */
export function nombreArchivoUtf8(original: string): string {
  if ([...original].some((c) => c.charCodeAt(0) > 0xff)) return original;
  const convertido = Buffer.from(original, 'latin1').toString('utf8');
  return convertido.includes('\uFFFD') ? original : convertido;
}

export function extension(nombreArchivo: string): string {
  const i = nombreArchivo.lastIndexOf('.');
  return i < 0 ? '' : nombreArchivo.slice(i).toLowerCase();
}

// ── Textos que Nest agrega al chat ──────────────────────────────────

export function textoSaludo(nombreUsuario: string): string {
  return (
    `Hola, ${nombreUsuario}. Soy el Coordinador de Compliance de Contrataciones. ` +
    'Te acompaño a auditar un expediente documento por documento. ' +
    'Para empezar, ¿cuál es el número del expediente?'
  );
}

/** Guía el orden de carga. Sin pendientes, invita a pedir el dictamen final. */
export function textoSiguiente(
  checklist: ElementoChecklist[] | null,
  documentos: DocumentoResumen[],
): string | null {
  if (!checklist?.length) return null;
  const tipo = siguienteDocumento(checklist, documentos);
  if (!tipo) return 'Ya están todos los documentos. Puedes solicitar el dictamen final.';
  const nombre = checklist.find((c) => c.tipo_documento === tipo)!.nombre;
  return `Ahora sube: ${nombre}.`;
}

export function textoSubido(nombreArchivo: string, nombreTipo: string, reemplaza?: string): string {
  const base = `Subí ${nombreArchivo} como ${nombreTipo}`;
  return reemplaza ? `${base}, en reemplazo de ${reemplaza}.` : `${base}.`;
}

export function textoAnalizando(nombreArchivo: string): string {
  return `Analizando ${nombreArchivo}…`;
}

export function textoAnalizado(
  nombreArchivo: string,
  nombreTipo: string,
  jsonAnalista: unknown,
  estatusGlobal: string | null,
  informeMarkdown: string | null = null,
): string {
  const resumen = (jsonAnalista as { resumen?: { evaluados?: number; hallazgos?: number } } | null)
    ?.resumen;
  const cifras =
    resumen?.evaluados != null && resumen?.hallazgos != null
      ? ` ${resumen.hallazgos} hallazgo(s) en ${resumen.evaluados} puntos revisados.`
      : '';
  const linea = `Terminé de analizar ${nombreArchivo} (${nombreTipo}). Semáforo: ${estatusGlobal ?? 'sin dato'}.${cifras}`;
  return tieneResumen(informeMarkdown) ? `${linea}\n\n${informeMarkdown.trim()}` : linea;
}

export function textoTipoNoCoincide(
  nombreArchivo: string,
  nombreTipo: string,
  nombreDetectado: string | null,
): string {
  const parece = nombreDetectado ? ` Parece ser ${nombreDetectado}.` : '';
  return (
    `El archivo ${nombreArchivo} no corresponde a ${nombreTipo}.${parece} ` +
    'No cuenta como entregado: reemplázalo por el documento correcto.'
  );
}

export function textoRechazado(nombreArchivo: string, detalle: string): string {
  return (
    `No pude analizar ${nombreArchivo}: ${detalle} ` +
    'Sube una copia más nítida o en otro formato.'
  );
}

export function textoErrorAnalisis(nombreArchivo: string): string {
  return `No pude terminar el análisis de ${nombreArchivo}. Puedes reintentarlo.`;
}

export function textoDictamenSolicitado(forzarFinal: boolean): string {
  return forzarFinal
    ? 'Estoy preparando el dictamen final. Puede tardar unos minutos.'
    : 'Estoy preparando el dictamen. Puede tardar unos minutos.';
}

export function textoDictamenListo(dictamen: {
  alcance: string | null;
  puntaje: unknown;
  coherencia: unknown;
}): string {
  const puntaje = dictamen.puntaje as {
    global?: { porcentaje?: number; rango?: string };
    flag_nulidad_absoluta?: boolean;
  } | null;
  const partes = [`El dictamen ${dictamen.alcance === 'FINAL' ? 'final' : 'parcial'} está listo.`];
  if (puntaje?.global?.porcentaje != null) {
    const rango = puntaje.global.rango ? ` (${puntaje.global.rango})` : '';
    partes.push(`Puntaje global: ${formatearPorcentaje(puntaje.global.porcentaje)}${rango}.`);
  }
  if (puntaje?.flag_nulidad_absoluta) {
    partes.push('Hay al menos un hallazgo que puede causar la nulidad absoluta del procedimiento.');
  }
  const contradicciones = Array.isArray(dictamen.coherencia) ? dictamen.coherencia.length : 0;
  partes.push(
    contradicciones
      ? `Encontré ${contradicciones} contradicción(es) entre documentos.`
      : 'No encontré contradicciones entre documentos.',
  );
  return partes.join(' ');
}

export function textoErrorDictamen(): string {
  return 'No pude terminar el dictamen. Puedes pedirlo de nuevo.';
}

/** Aviso para las modalidades no disponibles. */
export function textoModalidadNoDisponible(nombreModalidad: string, disponibles: string[]): string {
  const lista = disponibles.join(', ').replace(/, ([^,]*)$/, ' y $1');
  return (
    (lista ? `Por ahora la auditoría automática está disponible solo para ${lista}. ` : '') +
    `La modalidad ${nombreModalidad} estará disponible próximamente.`
  );
}

function formatearPorcentaje(valor: number): string {
  return `${valor.toLocaleString('es-VE', { maximumFractionDigits: 2 })} %`;
}
