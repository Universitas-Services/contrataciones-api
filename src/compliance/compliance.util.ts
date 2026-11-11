/**
 * Reglas del módulo de compliance que no dependen de la base ni del agente:
 * progreso, riesgo, siguiente documento y textos que Nest agrega al chat.
 */

/**
 * Tipos que admiten varios archivos: una oferta o una notificación por oferente.
 * Los demás solo se reemplazan.
 */
export const TIPOS_MULTIPLES = new Set([
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

/** El tipo pedido por el agente, si sigue pendiente; si no, el primero sin cubrir. */
export function siguienteDocumento(
  checklist: ElementoChecklist[] | null,
  documentos: DocumentoResumen[],
  solicitado: string | null,
): string | null {
  if (!checklist) return null;
  const cubiertos = tiposCubiertos(documentos);
  const enChecklist = (tipo: string) => checklist.some((c) => c.tipo_documento === tipo);
  if (solicitado && enChecklist(solicitado) && !cubiertos.has(solicitado)) return solicitado;
  return checklist.find((c) => !cubiertos.has(c.tipo_documento))?.tipo_documento ?? null;
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

export function textoSaludo(nombreUsuario: string, ente: string): string {
  return (
    `Hola, ${nombreUsuario}. Soy el Coordinador de Compliance de Contrataciones de ${ente}. ` +
    'Te acompaño a auditar un expediente documento por documento. ' +
    'Para empezar, ¿cuál es el número del expediente y cómo se llama?'
  );
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
): string {
  const resumen = (jsonAnalista as { resumen?: { evaluados?: number; hallazgos?: number } } | null)
    ?.resumen;
  const cifras =
    resumen?.evaluados != null && resumen?.hallazgos != null
      ? ` ${resumen.hallazgos} hallazgo(s) en ${resumen.evaluados} puntos revisados.`
      : '';
  return `Terminé de analizar ${nombreArchivo} (${nombreTipo}). Semáforo: ${estatusGlobal ?? 'sin dato'}.${cifras}`;
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

/** Texto que propuso el equipo del agente para modalidades no disponibles. */
export function textoModalidadNoDisponible(nombreModalidad: string): string {
  return (
    'Por ahora la auditoría automática está disponible solo para Concurso Abierto de acto único ' +
    `con apertura única. La modalidad ${nombreModalidad} estará disponible cuando el equipo legal ` +
    'termine de validar sus cuestionarios.'
  );
}

function formatearPorcentaje(valor: number): string {
  return `${valor.toLocaleString('es-VE', { maximumFractionDigits: 2 })} %`;
}
