/**
 * Prueba end-to-end del módulo de compliance contra la base local, con el
 * agente y el almacenamiento simulados: no gasta tokens ni sube archivos.
 *
 * Recorre el flujo del contrato (chat, documentos, cola con reintentos,
 * dictamen parcial y final, PDF y cierre), las reglas de permisos y borra lo
 * que creó.
 *
 *   npx ts-node -T scripts/pruebas/prueba-compliance.ts
 *
 * Sólo corre contra una base local: aborta si DATABASE_URL apunta a otro host.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import type { UsuarioActual } from '../../src/common/types/usuario-actual.type';
import type { PrismaService } from '../../src/database/prisma.service';
import type {
  AgenteComplianceClient,
  CatalogoAgente,
  RespuestaConversar,
} from '../../src/compliance/agente-compliance.client';
import { ComplianceColaService } from '../../src/compliance/compliance-cola.service';
import { ComplianceService } from '../../src/compliance/compliance.service';

const NOMENCLATURA = 'PRUEBA-COMPLIANCE-001';

function assertBaseLocal() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres|db)[:/]/.test(url)) {
    console.error('✖ Esta prueba escribe y borra datos: sólo corre contra una base local.');
    process.exit(1);
  }
}

let pasadas = 0;
const fallas: string[] = [];

function ok(descripcion: string, condicion: boolean, detalle?: unknown) {
  if (condicion) {
    pasadas += 1;
    console.log(`  ✔ ${descripcion}`);
  } else {
    fallas.push(descripcion);
    console.log(`  ✘ ${descripcion}`, detalle ?? '');
  }
}

async function rechaza(descripcion: string, accion: () => Promise<unknown>, esperado: string) {
  try {
    await accion();
    ok(descripcion, false, '(no lanzó error)');
  } catch (error) {
    const mensaje = (error as { message?: string }).message ?? `${error}`;
    ok(descripcion, mensaje.includes(esperado), mensaje);
  }
}

// ── Agente simulado ──────────────────────────────────────────────────
const CATALOGO: CatalogoAgente = {
  modalidades: [
    {
      valor: 'CA_ACTO_UNICO_APERTURA_UNICA',
      nombre: 'Concurso Abierto - Acto Único Apertura Única',
      estado: 'disponible',
      checklist: [
        { tipo_documento: 'ACTA_INICIO', nombre: 'Acta de Inicio' },
        { tipo_documento: 'OFERTAS', nombre: 'Ofertas' },
        { tipo_documento: 'CONTRATO', nombre: 'Contrato' },
      ],
    },
    {
      valor: 'CONTRATACION_DIRECTA',
      nombre: 'Contratación Directa',
      estado: 'sin_validar',
      checklist: [],
    },
  ],
  tipos_contratacion: [
    { valor: 'BIENES', nombre: 'Bienes' },
    { valor: 'OBRAS', nombre: 'Obras' },
  ],
};

const respuestasChat: (RespuestaConversar | Error)[] = [];
const peticionesChat: { mensaje: string; documentos: unknown[]; historial: unknown[] }[] = [];
/** Respuestas del análisis por nombre de archivo, en orden de llamada. */
const guionAnalisis = new Map<
  string,
  { status: number | null; retryAfterS?: number; datos?: unknown; detalle?: string }[]
>();
const documentosEnDictamen: unknown[][] = [];

function analisisOk(
  tipo: string,
  coincide = true,
  estatus = 'Amarillo',
  detectado: string | null = null,
) {
  const json = {
    documento_evaluado: 'x',
    tipo_documento: tipo,
    tipo_coincide: coincide,
    estatus_global: estatus,
    hallazgos: [],
    resumen: { evaluados: 20, conformes: 15, hallazgos: 5, no_aplica: 0 },
  };
  return {
    status: 200,
    datos: {
      json_analista: json,
      informe_markdown: '# Informe (CAAUAI.14)',
      estatus_global: estatus,
      tipo_coincide: coincide,
      tipo_detectado: detectado,
      metricas: { latencia_ms: 1000 },
    },
  };
}

const agente = {
  configurado: true,
  obtenerCatalogo: () => Promise.resolve(CATALOGO),
  conversar: (p: {
    mensaje: string;
    expediente: { documentos: unknown[] };
    historial: unknown[];
  }) => {
    peticionesChat.push({
      mensaje: p.mensaje,
      documentos: p.expediente.documentos,
      historial: p.historial,
    });
    const siguiente = respuestasChat.shift();
    if (!siguiente || siguiente instanceof Error) {
      return Promise.reject(
        Object.assign(new Error('No pude responder, intenta de nuevo.'), { status: 503 }),
      );
    }
    return Promise.resolve(siguiente);
  },
  analizar: (d: { nombreArchivo: string; archivo: Buffer }) => {
    const guion = guionAnalisis.get(d.nombreArchivo) ?? [];
    return Promise.resolve(guion.shift() ?? { status: 500, detalle: 'sin guion' });
  },
  dictamen: (c: { documentos: unknown[]; forzar_final: boolean }) => {
    documentosEnDictamen.push(c.documentos);
    const alcance = c.forzar_final ? 'FINAL' : 'PARCIAL';
    return Promise.resolve({
      status: 200,
      datos: {
        alcance,
        markdown: `# Informe ${alcance}\n\n## 1. Alcance\n\nRevisión del expediente **${NOMENCLATURA}**.\n\n- Punto uno\n- Punto dos`,
        puntaje: {
          global: { maximo: 100, obtenidos: 56, porcentaje: 56.79, rango: 'Hallazgos Críticos' },
          flag_nulidad_absoluta: true,
        },
        pendientes: ['CONTRATO'],
        coherencia: [{ dato: 'Monto', gravedad: 'alta' }],
      },
    });
  },
};

// ── Almacenamiento simulado ──────────────────────────────────────────
const archivos = new Map<string, Buffer>();
const almacenamiento = {
  uploadFile: (buffer: Buffer, carpeta: string, nombre: string) => {
    const url = `memoria://${carpeta}/${nombre}`;
    archivos.set(url, buffer);
    return Promise.resolve(url);
  },
};

const config = {
  get: (clave: string) => ({ COMPLIANCE_MAX_MB: '1', COMPLIANCE_CONCURRENCIA: '2' })[clave],
};

const prisma = new PrismaClient();

function archivo(nombre: string, bytes = 100): Express.Multer.File {
  return {
    originalname: nombre,
    buffer: Buffer.alloc(bytes, 1),
    size: bytes,
    mimetype: 'application/pdf',
  } as Express.Multer.File;
}

async function limpiar() {
  await prisma.expedienteCompliance.deleteMany({
    where: { nomenclatura: { startsWith: 'PRUEBA-COMPLIANCE' } },
  });
  await prisma.expedienteCompliance.deleteMany({
    where: { nomenclatura: null, createdBy: 'prueba-compliance' },
  });
}

async function main() {
  assertBaseLocal();
  await limpiar();

  const usuario = await prisma.usuario.findFirst({
    where: { enteId: { not: null }, deletedAt: null },
    include: { ente: true },
  });
  const ente = usuario?.ente;
  if (!ente || !usuario) throw new Error('La base no tiene ente con usuarios: corre el seed.');

  const ejecutor: UsuarioActual = { id: usuario.id, enteId: ente.id, rol: 'EJECUTOR' };
  const visualizador: UsuarioActual = { ...ejecutor, rol: 'VISUALIZADOR' };
  const otroEnte: UsuarioActual = {
    ...ejecutor,
    enteId: '00000000-0000-4000-8000-000000000000',
    rol: 'ADMIN_ENTE',
  };
  const universitas: UsuarioActual = { id: usuario.id, enteId: null as never, rol: 'UNIVERSITAS' };

  const servicio = new ComplianceService(
    prisma as unknown as PrismaService,
    agente as unknown as AgenteComplianceClient,
    almacenamiento as never,
    config as never,
  );
  const cola = new ComplianceColaService(
    prisma as unknown as PrismaService,
    agente as unknown as AgenteComplianceClient,
    config as never,
  );
  cola.leerArchivo = (url: string) => Promise.resolve(archivos.get(url) ?? Buffer.alloc(0));

  /** Corre la cola hasta que no quede nada listo, adelantando los reintentos programados. */
  async function vaciarCola() {
    for (let vuelta = 0; vuelta < 20; vuelta++) {
      await prisma.documentoCompliance.updateMany({
        where: { estado: 'PENDIENTE' },
        data: { proximoIntentoAt: new Date(0) },
      });
      await prisma.dictamenCompliance.updateMany({
        where: { estado: 'PENDIENTE' },
        data: { proximoIntentoAt: new Date(0) },
      });
      const docs = await prisma.documentoCompliance.findMany({
        where: { estado: 'PENDIENTE', vigente: true },
        select: { id: true },
      });
      const dictamenes = await prisma.dictamenCompliance.findMany({
        where: { estado: 'PENDIENTE' },
        select: { id: true },
      });
      if (!docs.length && !dictamenes.length) return;
      for (const { id } of docs)
        if (await cola.tomar('documento', id, new Date())) await cola.procesarDocumento(id);
      for (const { id } of dictamenes)
        if (await cola.tomar('dictamen', id, new Date())) await cola.procesarDictamen(id);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Crear expediente y permisos');
  // ══════════════════════════════════════════════════════════════════
  await rechaza(
    'VISUALIZADOR no crea expedientes',
    () => servicio.crear({}, visualizador),
    'solo permite consultar',
  );
  await rechaza(
    'UNIVERSITAS debe indicar el ente',
    () => servicio.crear({}, universitas),
    'enteId',
  );

  let detalle = await servicio.crear({}, ejecutor);
  const id = detalle.id;
  ok('nace en CONFIGURANDO', detalle.estado === 'CONFIGURANDO');
  let mensajes = await servicio.mensajes(id, ejecutor);
  ok(
    'guarda el saludo fijo',
    mensajes.length === 1 &&
      mensajes[0].texto.startsWith('Hola, ') &&
      mensajes[0].texto.includes(ente.nombre),
  );
  await rechaza('otro ente no lo ve', () => servicio.detalle(id, otroEnte), 'No tiene acceso');
  ok(
    'VISUALIZADOR del ente sí lo lee',
    (await servicio.detalle(id, visualizador)).puedeEditar === false,
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Chat y acciones');
  // ══════════════════════════════════════════════════════════════════
  respuestasChat.push(new Error('caído'));
  await rechaza(
    'si el agente no responde, 503',
    () => servicio.enviarMensaje(id, 'Hola', ejecutor),
    'No pude responder',
  );
  ok('y no guarda el mensaje', (await servicio.mensajes(id, ejecutor)).length === 1);
  await rechaza(
    'VISUALIZADOR no escribe en el chat',
    () => servicio.enviarMensaje(id, 'Hola', visualizador),
    'solo permite consultar',
  );

  respuestasChat.push({
    respuesta: 'Registré el expediente. ¿Cuál es la modalidad?',
    acciones: [
      { accion: 'fijar_expediente', nomenclatura: NOMENCLATURA, nombre: 'Compra de mobiliario' },
      { accion: 'inventada', x: 1 },
    ],
  });
  let respuesta = await servicio.enviarMensaje(id, `Es el ${NOMENCLATURA}`, ejecutor);
  ok(
    'aplica fijar_expediente y descarta lo desconocido',
    respuesta.acciones.length === 1 && respuesta.expediente.nomenclatura === NOMENCLATURA,
  );
  ok(
    'guarda mensaje del usuario y respuesta',
    respuesta.mensajes.map((m) => m.rol).join() === 'USUARIO,AGENTE',
  );
  ok(
    'el agente recibió el historial con el saludo',
    (peticionesChat.at(-1)?.historial.length ?? 0) === 1,
  );

  respuestasChat.push({
    respuesta: 'Anotado.',
    acciones: [
      {
        accion: 'fijar_expediente',
        modalidad: 'CONTRATACION_DIRECTA',
        tipo_contratacion: 'BIENES',
      },
    ],
  });
  respuesta = await servicio.enviarMensaje(id, 'Es contratación directa', ejecutor);
  ok('no guarda una modalidad sin validar', respuesta.expediente.modalidad === null);
  ok('pero sí el tipo válido', respuesta.expediente.tipoContratacion === 'BIENES');
  ok(
    'y avisa con el texto acordado',
    respuesta.mensajes.some((m) =>
      m.texto.includes('La modalidad Contratación Directa estará disponible'),
    ),
  );
  ok('sigue en CONFIGURANDO', respuesta.expediente.estado === 'CONFIGURANDO');

  await rechaza(
    'el botón tampoco acepta modalidades sin validar',
    () => servicio.actualizar(id, { modalidad: 'CONTRATACION_DIRECTA' }, ejecutor),
    'estará disponible',
  );
  detalle = await servicio.actualizar(id, { modalidad: 'CA_ACTO_UNICO_APERTURA_UNICA' }, ejecutor);
  ok('con nomenclatura, modalidad y tipo pasa a ACTIVA', detalle.estado === 'ACTIVA');
  ok('pide el primer documento del checklist', detalle.siguienteDocumento === 'ACTA_INICIO');

  respuestasChat.push({
    respuesta: 'Sube las ofertas.',
    acciones: [{ accion: 'pedir_documento', tipo_documento: 'OFERTAS' }],
  });
  respuesta = await servicio.enviarMensaje(id, '¿Qué sigue?', ejecutor);
  ok(
    'pedir_documento cambia el siguiente documento',
    respuesta.expediente.siguienteDocumento === 'OFERTAS',
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Subida de documentos');
  // ══════════════════════════════════════════════════════════════════
  await rechaza(
    '.txt no se acepta',
    () => servicio.subirDocumento(id, { tipoDocumento: 'ACTA_INICIO' }, archivo('a.txt'), ejecutor),
    'Formato no permitido',
  );
  await rechaza(
    'respeta el máximo configurado',
    () =>
      servicio.subirDocumento(
        id,
        { tipoDocumento: 'ACTA_INICIO' },
        archivo('grande.pdf', 2 * 1024 * 1024),
        ejecutor,
      ),
    'supera el máximo de 1 MB',
  );
  await rechaza(
    'el tipo debe estar en el checklist',
    () => servicio.subirDocumento(id, { tipoDocumento: 'LLAMADO' }, archivo('l.pdf'), ejecutor),
    'no está en el checklist',
  );
  await rechaza(
    'VISUALIZADOR no sube',
    () =>
      servicio.subirDocumento(id, { tipoDocumento: 'ACTA_INICIO' }, archivo('a.pdf'), visualizador),
    'solo permite consultar',
  );

  guionAnalisis.set('acta.pdf', [
    { status: 503, retryAfterS: 1 },
    { status: 429 },
    analisisOk('ACTA_INICIO', true, 'Rojo'),
  ]);
  const acta = await servicio.subirDocumento(
    id,
    { tipoDocumento: 'ACTA_INICIO' },
    archivo('acta.pdf'),
    ejecutor,
  );
  ok('responde de inmediato en PENDIENTE', acta.estado === 'PENDIENTE');
  mensajes = await servicio.mensajes(id, ejecutor);
  ok(
    'agrega «Subí…» y «Analizando…»',
    mensajes
      .slice(-2)
      .map((m) => m.texto)
      .join(' | ') === 'Subí acta.pdf como Acta de Inicio. | Analizando acta.pdf…',
  );
  await rechaza(
    'un tipo de un solo archivo no admite otro sin reemplazar',
    () =>
      servicio.subirDocumento(id, { tipoDocumento: 'ACTA_INICIO' }, archivo('acta2.pdf'), ejecutor),
    'reemplácelo',
  );

  guionAnalisis.set('oferta-1.pdf', [analisisOk('OFERTAS', true, 'Verde')]);
  guionAnalisis.set('oferta-2.pdf', [
    { status: 400, detalle: 'PDF escaneado sin texto reconocible.' },
  ]);
  guionAnalisis.set('contrato.pdf', [analisisOk('CONTRATO', false, 'Rojo', 'OFERTAS')]);
  await servicio.subirDocumento(
    id,
    { tipoDocumento: 'OFERTAS' },
    archivo('oferta-1.pdf'),
    ejecutor,
  );
  await servicio.subirDocumento(
    id,
    { tipoDocumento: 'OFERTAS' },
    archivo('oferta-2.pdf'),
    ejecutor,
  );
  await servicio.subirDocumento(
    id,
    { tipoDocumento: 'CONTRATO' },
    archivo('contrato.pdf'),
    ejecutor,
  );
  ok(
    'OFERTAS admite varios archivos',
    (await prisma.documentoCompliance.count({
      where: { expedienteId: id, tipoDocumento: 'OFERTAS' },
    })) === 2,
  );

  await rechaza(
    'no hay dictamen con documentos en análisis',
    () => servicio.solicitarDictamen(id, false, ejecutor),
    'en análisis',
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Cola');
  // ══════════════════════════════════════════════════════════════════
  const primeraToma = await cola.tomar('documento', acta.id, new Date());
  const segundaToma = await cola.tomar('documento', acta.id, new Date());
  ok('un trabajo no se toma dos veces', primeraToma && !segundaToma);
  await cola.procesarDocumento(acta.id);
  let filaActa = await prisma.documentoCompliance.findUniqueOrThrow({ where: { id: acta.id } });
  ok(
    '503 con Retry-After lo reprograma sin gastar fallos',
    filaActa.estado === 'PENDIENTE' &&
      filaActa.fallosTemporales === 0 &&
      filaActa.proximoIntentoAt > new Date(),
  );

  await vaciarCola();
  filaActa = await prisma.documentoCompliance.findUniqueOrThrow({ where: { id: acta.id } });
  ok(
    'tras 503 y 429 queda ANALIZADO',
    filaActa.estado === 'ANALIZADO' && filaActa.intentos429 === 1,
    filaActa,
  );
  ok(
    'guarda json_analista tal cual',
    (filaActa.jsonAnalista as { resumen?: { evaluados?: number } })?.resumen?.evaluados === 20,
  );

  const porNombre = async (nombre: string) =>
    prisma.documentoCompliance.findFirstOrThrow({
      where: { expedienteId: id, nombreArchivo: nombre },
    });
  ok(
    '400 lo deja RECHAZADO con el motivo',
    (await porNombre('oferta-2.pdf')).estado === 'RECHAZADO' &&
      (await porNombre('oferta-2.pdf')).error === 'PDF escaneado sin texto reconocible.',
  );
  const contrato = await porNombre('contrato.pdf');
  ok(
    'tipo_coincide false queda ANALIZADO pero no cuenta',
    contrato.estado === 'ANALIZADO' && contrato.tipoCoincide === false,
  );

  mensajes = await servicio.mensajes(id, ejecutor);
  const textos = mensajes.map((m) => m.texto).join('\n');
  ok(
    'avisa el semáforo del acta',
    textos.includes(
      'Terminé de analizar acta.pdf (Acta de Inicio). Semáforo: Rojo. 5 hallazgo(s) en 20 puntos revisados.',
    ),
  );
  ok(
    'avisa el archivo equivocado',
    textos.includes('El archivo contrato.pdf no corresponde a Contrato. Parece ser Ofertas.'),
  );
  ok(
    'avisa el rechazo',
    textos.includes('No pude analizar oferta-2.pdf: PDF escaneado sin texto reconocible.'),
  );

  detalle = await servicio.detalle(id, ejecutor);
  ok(
    'progreso 2 de 3: el contrato equivocado no cuenta',
    detalle.progreso?.cubiertos === 2 && detalle.progreso?.total === 3,
  );
  ok('riesgo antes del dictamen: peor semáforo', detalle.riesgo?.semaforo === 'Rojo');
  ok('ya no pide OFERTAS: pide el contrato', detalle.siguienteDocumento === 'CONTRATO');
  const vista = JSON.stringify(detalle);
  ok(
    'el detalle no expone json_analista ni el informe',
    !vista.includes('json_analista') && !vista.includes('CAAUAI'),
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Reemplazo');
  // ══════════════════════════════════════════════════════════════════
  guionAnalisis.set('contrato-bueno.pdf', [analisisOk('CONTRATO', true, 'Verde')]);
  await servicio.subirDocumento(
    id,
    { tipoDocumento: 'CONTRATO', reemplazaDocumentoId: contrato.id },
    archivo('contrato-bueno.pdf'),
    ejecutor,
  );
  ok('el reemplazado deja de estar vigente', (await porNombre('contrato.pdf')).vigente === false);
  ok(
    'el chat lo dice',
    (await servicio.mensajes(id, ejecutor)).some(
      (m) => m.texto === 'Subí contrato-bueno.pdf como Contrato, en reemplazo de contrato.pdf.',
    ),
  );
  await vaciarCola();

  // El rechazado se reemplaza para que no bloquee nada.
  await prisma.documentoCompliance.update({
    where: { id: (await porNombre('oferta-2.pdf')).id },
    data: { estado: 'ERROR' },
  });
  guionAnalisis.set('oferta-2.pdf', [analisisOk('OFERTAS', true, 'Verde')]);
  await servicio.reintentarDocumento((await porNombre('oferta-2.pdf')).id, ejecutor);
  await vaciarCola();
  ok(
    'reintentar un documento en ERROR lo analiza de nuevo',
    (await porNombre('oferta-2.pdf')).estado === 'ANALIZADO',
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Dictamen');
  // ══════════════════════════════════════════════════════════════════
  const parcial = await servicio.solicitarDictamen(id, false, ejecutor);
  await rechaza(
    'no se piden dos dictámenes a la vez',
    () => servicio.solicitarDictamen(id, false, ejecutor),
    'en preparación',
  );
  await vaciarCola();
  const listo = await servicio.dictamen(parcial.id, ejecutor);
  ok('el dictamen parcial queda LISTO', listo.estado === 'LISTO' && listo.alcance === 'PARCIAL');
  const enviados = documentosEnDictamen.at(-1) ?? [];
  ok('envía los 4 analizados vigentes y no el reemplazado', enviados.length === 4, enviados.length);
  ok(
    'el parcial no cierra el expediente',
    (await servicio.detalle(id, ejecutor)).estado === 'ACTIVA',
  );
  const pdf = await servicio.dictamenPdf(parcial.id, visualizador);
  ok(
    'el PDF se genera y se puede leer con solo lectura',
    pdf.buffer.subarray(0, 5).toString() === '%PDF-' &&
      pdf.fileName === `dictamen-${NOMENCLATURA}-parcial.pdf`,
  );
  detalle = await servicio.detalle(id, ejecutor);
  ok(
    'el riesgo pasa a salir del dictamen',
    detalle.riesgo?.fuente === 'DICTAMEN' && detalle.riesgo.nulidadAbsoluta === true,
  );
  ok(
    'el chat resume el dictamen',
    (await servicio.mensajes(id, ejecutor)).some((m) =>
      m.texto.startsWith(
        'El dictamen parcial está listo. Puntaje global: 56,79 % (Hallazgos Críticos).',
      ),
    ),
  );

  respuestasChat.push({
    respuesta: 'Preparo el dictamen final.',
    acciones: [{ accion: 'solicitar_dictamen', forzar_final: true }],
  });
  respuesta = await servicio.enviarMensaje(id, 'Dame el final aunque falte algo', ejecutor);
  ok(
    'solicitar_dictamen desde el chat lo encola',
    respuesta.acciones.some((a) => a.accion === 'solicitar_dictamen' && a.forzarFinal === true),
  );
  ok(
    'y su aviso va después de la respuesta',
    respuesta.mensajes.map((m) => m.texto).join(' | ') ===
      'Dame el final aunque falte algo | Preparo el dictamen final. | Estoy preparando el dictamen final. Puede tardar unos minutos.',
  );
  ok(
    'el chat le pasó al agente los json analizados',
    peticionesChat.at(-1)?.documentos.length === 4,
  );
  await vaciarCola();

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Cierre');
  // ══════════════════════════════════════════════════════════════════
  detalle = await servicio.detalle(id, ejecutor);
  ok(
    'el dictamen FINAL cierra el expediente',
    detalle.estado === 'CERRADA' && !!detalle.cerradoAt && detalle.puedeEditar === false,
  );
  await rechaza(
    'cerrado no admite documentos',
    () => servicio.subirDocumento(id, { tipoDocumento: 'CONTRATO' }, archivo('otro.pdf'), ejecutor),
    'cerrado',
  );
  await rechaza(
    'cerrado no admite cambios',
    () => servicio.actualizar(id, { nombre: 'Otro' }, ejecutor),
    'cerrado',
  );
  await rechaza(
    'cerrado no admite otro dictamen',
    () => servicio.solicitarDictamen(id, true, ejecutor),
    'cerrado',
  );
  respuestasChat.push({
    respuesta: 'Te explico.',
    acciones: [{ accion: 'fijar_expediente', nombre: 'Cambiado' }],
  });
  respuesta = await servicio.enviarMensaje(id, '¿Por qué salió rojo el acta?', ejecutor);
  ok(
    'cerrado sigue respondiendo dudas pero ignora acciones',
    respuesta.acciones.length === 0 && respuesta.expediente.nombre === 'Compra de mobiliario',
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Lista de expedientes');
  // ══════════════════════════════════════════════════════════════════
  const lista = await servicio.listar(ejecutor, { limit: 100 });
  const fila = lista.data.find((e) => e.id === id);
  ok(
    'aparece con progreso y riesgo',
    fila?.progreso?.cubiertos === 3 && fila?.riesgo?.rango === 'Hallazgos Críticos',
    fila,
  );
  ok(
    'otro ente no lo ve en su lista',
    !(await servicio.listar(otroEnte, { limit: 100 })).data.some((e) => e.id === id),
  );
  ok(
    'UNIVERSITAS lo ve filtrando por ente',
    (await servicio.listar(universitas, { enteId: ente.id, limit: 100 })).data.some(
      (e) => e.id === id,
    ),
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Paginación, búsqueda y filtro por estado');
  // ══════════════════════════════════════════════════════════════════
  const extras: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const creado = await servicio.crear(
      { nomenclatura: `PRUEBA-COMPLIANCE-PAG-${i}`, nombre: `Lote ${i}` },
      ejecutor,
    );
    extras.push(creado.id);
  }
  const conMarca = { search: 'prueba-compliance', limit: 2 };
  const pagina1 = await servicio.listar(ejecutor, { ...conMarca, page: 1 });
  const pagina3 = await servicio.listar(ejecutor, { ...conMarca, page: 3 });
  ok(
    'metadata cuenta los 5 y calcula las páginas',
    pagina1.metadata.total === 5 &&
      pagina1.metadata.totalPages === 3 &&
      pagina1.metadata.limit === 2,
    pagina1.metadata,
  );
  ok(
    'cada página trae como máximo el límite',
    pagina1.data.length === 2 && pagina3.data.length === 1,
  );
  const recorridos = new Set<string>();
  for (let page = 1; page <= 3; page++) {
    (await servicio.listar(ejecutor, { ...conMarca, page })).data.forEach((e) =>
      recorridos.add(e.id),
    );
  }
  ok('las páginas no repiten ni pierden expedientes', recorridos.size === 5);
  ok(
    'la búsqueda no distingue mayúsculas y mira el nombre',
    (await servicio.listar(ejecutor, { search: 'LOTE 3' })).data.map((e) => e.id).join() ===
      extras[2],
  );
  const cerrados = await servicio.listar(ejecutor, {
    search: 'prueba-compliance',
    estado: 'CERRADA',
  });
  ok('filtra por estado', cerrados.metadata.total === 1 && cerrados.data[0]?.id === id);
  ok(
    'una página fuera de rango llega vacía',
    (await servicio.listar(ejecutor, { ...conMarca, page: 9 })).data.length === 0,
  );

  await limpiar();
  console.log(`\n${'─'.repeat(60)}`);
  if (fallas.length) {
    console.log(`✘ ${fallas.length} fallas de ${pasadas + fallas.length}:`);
    fallas.forEach((f) => console.log(`  - ${f}`));
    process.exitCode = 1;
  } else {
    console.log(`✔ ${pasadas} comprobaciones, todas correctas.`);
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    await limpiar().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
