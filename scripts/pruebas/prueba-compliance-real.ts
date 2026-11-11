/**
 * Prueba del módulo de compliance contra el AGENTE REAL (consume tokens).
 *
 * Usa la base local y guarda los archivos en memoria: no sube nada a
 * Cloudinary. Recorre el flujo del contrato con un expediente de prueba
 * (chat de registro, análisis de cada documento, preguntas, dictamen PARCIAL
 * y FINAL) y las pruebas mínimas de la sección 13 que se pueden hacer contra
 * el agente real. Deja el expediente en la base para revisarlo.
 *
 *   COMPLIANCE_PRUEBA_DIR="ruta/a/los/documentos" npx ts-node -T scripts/pruebas/prueba-compliance-real.ts
 *
 * Necesita COMPLIANCE_AGENT_URL y COMPLIANCE_AGENT_KEY (de desarrollo) en .env.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import type { UsuarioActual } from '../../src/common/types/usuario-actual.type';
import type { PrismaService } from '../../src/database/prisma.service';
import { AgenteComplianceClient } from '../../src/compliance/agente-compliance.client';
import { ComplianceColaService } from '../../src/compliance/compliance-cola.service';
import { ComplianceService } from '../../src/compliance/compliance.service';

const MARCA = '(prueba real)';
const NOMENCLATURA = 'CA-SDEDTEOEL-CA-002-2026';
const LIMITE_MS = 50 * 60 * 1000;

/** Qué tipo es cada archivo de la carpeta de prueba. */
const TIPOS: [RegExp, string][] = [
  [/actividades previas/i, 'ACTIVIDADES_PREVIAS'],
  [/ACTA DE INICIO/i, 'ACTA_INICIO'],
  [/PLIEGO DE CONDICIONES/i, 'PLIEGO_CONDICIONES'],
  [/LLAMADO/i, 'LLAMADO'],
  [/ACTA RECEPCI/i, 'ACTA_RECEPCION_SOBRES'],
  [/ACTA APERTURA/i, 'ACTA_APERTURA_SOBRES'],
  [/Oferta/i, 'OFERTAS'],
  [/INFORME DE RECOMENDACI/i, 'INFORME_EVALUACION_RECOMENDACION'],
  [/ACTA DE ADJUDICACION/i, 'ADJUDICACION_O_EQUIVALENTE'],
  [/NOTIFICACI.N DE ADJUDICACI/i, 'NOTIFICACION_ADJUDICADOS'],
];

function assertBaseLocal() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres|db)[:/]/.test(url)) {
    console.error('✖ Esta prueba escribe datos: sólo corre contra una base local.');
    process.exit(1);
  }
}

const inicio = Date.now();
const reloj = () => `[${String(Math.round((Date.now() - inicio) / 1000)).padStart(4)} s]`;
const log = (...partes: unknown[]) => console.log(reloj(), ...partes);

let pasadas = 0;
const fallas: string[] = [];
const observaciones: string[] = [];
function ok(descripcion: string, condicion: boolean, detalle?: unknown) {
  if (condicion) pasadas += 1;
  else fallas.push(descripcion);
  console.log(
    `${reloj()}   ${condicion ? '✔' : '✘'} ${descripcion}`,
    condicion ? '' : (detalle ?? ''),
  );
}

function pdfEnBlanco(): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const partes: Buffer[] = [];
    doc.on('data', (p: Buffer) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.end();
  });
}

function comoArchivo(nombre: string, buffer: Buffer, mimetype: string): Express.Multer.File {
  return { originalname: nombre, buffer, size: buffer.length, mimetype } as Express.Multer.File;
}

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const prisma = new PrismaClient();

async function main() {
  assertBaseLocal();
  const carpeta = process.env.COMPLIANCE_PRUEBA_DIR ?? '';
  if (!carpeta || !fs.existsSync(carpeta)) throw new Error('Indique COMPLIANCE_PRUEBA_DIR.');

  const config = { get: (clave: string) => process.env[clave] };
  const agente = new AgenteComplianceClient(config as never);
  if (!agente.configurado) throw new Error('Faltan COMPLIANCE_AGENT_URL o COMPLIANCE_AGENT_KEY.');

  const archivos = new Map<string, Buffer>();
  const almacenamiento = {
    uploadFile: (buffer: Buffer, carpetaDestino: string, nombre: string) => {
      const url = `memoria://${carpetaDestino}/${nombre}`;
      archivos.set(url, buffer);
      return Promise.resolve(url);
    },
  };
  const servicio = new ComplianceService(
    prisma as unknown as PrismaService,
    agente,
    almacenamiento as never,
    config as never,
  );
  const cola = new ComplianceColaService(
    prisma as unknown as PrismaService,
    agente,
    config as never,
  );
  cola.leerArchivo = (url: string) => Promise.resolve(archivos.get(url) ?? Buffer.alloc(0));

  const usuario = await prisma.usuario.findFirst({
    where: { enteId: { not: null }, deletedAt: null },
    include: { ente: true },
  });
  if (!usuario?.ente) throw new Error('La base no tiene un ente con usuarios: corre el seed.');
  const user: UsuarioActual = { id: usuario.id, enteId: usuario.ente.id, rol: 'EJECUTOR' };

  // Corridas anteriores de esta misma prueba.
  const { count } = await prisma.expedienteCompliance.deleteMany({
    where: { nombre: { endsWith: MARCA } },
  });
  if (count) log(`Borré ${count} expediente(s) de corridas anteriores.`);

  /** Corre la cola hasta que no quede nada pendiente ni en proceso. */
  async function esperarCola(id: string) {
    const limite = Date.now() + LIMITE_MS;
    let ultimo = '';
    while (Date.now() < limite) {
      await cola.revisar();
      const [docs, dictamenes] = await Promise.all([
        prisma.documentoCompliance.groupBy({
          by: ['estado'],
          where: { expedienteId: id, vigente: true },
          _count: true,
        }),
        prisma.dictamenCompliance.count({
          where: { expedienteId: id, estado: { in: ['PENDIENTE', 'PROCESANDO'] } },
        }),
      ]);
      const resumen = docs.map((d) => `${d.estado}:${d._count}`).join(' ');
      if (resumen !== ultimo) {
        log(`  cola → ${resumen}${dictamenes ? ` | dictamen en curso` : ''}`);
        ultimo = resumen;
      }
      const enCurso =
        docs.some((d) => d.estado === 'PENDIENTE' || d.estado === 'PROCESANDO') || dictamenes > 0;
      if (!enCurso) return;
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('La cola no terminó en el tiempo límite.');
  }

  async function chat(id: string, mensaje: string) {
    log(`» Usuario: ${mensaje}`);
    const t = Date.now();
    const r = await servicio.enviarMensaje(id, mensaje, user);
    for (const m of r.mensajes.filter((m) => m.rol === 'AGENTE')) log(`« Agente: ${m.texto}`);
    log(`  acciones: ${JSON.stringify(r.acciones)} (${Math.round((Date.now() - t) / 1000)} s)`);
    return r;
  }

  // ══════════════════════════════════════════════════════════════════
  log('▸ Catálogo y creación');
  const catalogo = await servicio.catalogo();
  const modalidad = catalogo.modalidades.find((m) => m.estado === 'disponible');
  ok('el catálogo real trae una modalidad disponible', !!modalidad, catalogo.modalidades);
  const checklist = modalidad?.checklist.map((c) => c.tipo_documento) ?? [];

  let detalle = await servicio.crear({}, user);
  const id = detalle.id;
  log(`Expediente ${id}`);

  // ══════════════════════════════════════════════════════════════════
  log('▸ Registro por el chat');
  await chat(
    id,
    `El expediente es el ${NOMENCLATURA} y se llama Adquisición de insumos tecnológicos ${MARCA}.`,
  );
  let respuesta = await chat(
    id,
    'Es un Concurso Abierto de acto único con apertura única, para adquirir bienes.',
  );
  detalle = respuesta.expediente;
  if (detalle.estado !== 'ACTIVA') {
    respuesta = await chat(
      id,
      'Confirmo: modalidad Concurso Abierto Acto Único Apertura Única y tipo de contratación bienes.',
    );
    detalle = respuesta.expediente;
  }
  ok('el agente registró el expediente por el chat', detalle.estado === 'ACTIVA', {
    nomenclatura: detalle.nomenclatura,
    nombre: detalle.nombre,
    modalidad: detalle.modalidad,
    tipo: detalle.tipoContratacion,
  });
  if (detalle.estado !== 'ACTIVA') {
    observaciones.push('El chat no registró todo el expediente: se completó con el PATCH.');
    detalle = await servicio.actualizar(
      id,
      {
        nomenclatura: NOMENCLATURA,
        nombre: `Adquisición de insumos tecnológicos ${MARCA}`,
        modalidad: modalidad?.valor,
        tipoContratacion: 'BIENES',
      },
      user,
    );
  }
  if (!detalle.nombre?.endsWith(MARCA)) {
    // Para poder limpiar la próxima corrida aunque el agente resuma el nombre.
    await prisma.expedienteCompliance.update({
      where: { id },
      data: { nombre: `${detalle.nombre ?? 'Adquisición de insumos tecnológicos'} ${MARCA}` },
    });
  }

  // ══════════════════════════════════════════════════════════════════
  log('▸ Subida de documentos');
  const nombres = fs.readdirSync(carpeta).filter((n) => /\.(pdf|docx)$/i.test(n));
  const asignados = nombres
    .map((nombre) => ({ nombre, tipo: TIPOS.find(([patron]) => patron.test(nombre))?.[1] }))
    .filter((a): a is { nombre: string; tipo: string } => !!a.tipo)
    .sort((a, b) => checklist.indexOf(a.tipo) - checklist.indexOf(b.tipo));
  ok('cada archivo de la carpeta tiene tipo', asignados.length === nombres.length, nombres);

  for (const { nombre, tipo } of asignados) {
    const buffer = fs.readFileSync(path.join(carpeta, nombre));
    const ext = path.extname(nombre).toLowerCase();
    await servicio.subirDocumento(
      id,
      { tipoDocumento: tipo },
      comoArchivo(nombre, buffer, MIME[ext]),
      user,
    );
    log(`  subido ${tipo.padEnd(34)} ${(buffer.length / 1024 / 1024).toFixed(1)} MB  ${nombre}`);
  }

  // Pruebas mínimas 3 y 5: PDF en blanco y documento en la casilla equivocada.
  await servicio.subirDocumento(
    id,
    { tipoDocumento: 'CONTRATO' },
    comoArchivo('contrato-en-blanco.pdf', await pdfEnBlanco(), 'application/pdf'),
    user,
  );
  const llamado = asignados.find((a) => a.tipo === 'LLAMADO');
  if (llamado) {
    await servicio.subirDocumento(
      id,
      { tipoDocumento: 'NOTIFICACION_NO_ADJUDICADOS' },
      comoArchivo(
        `casilla-equivocada-${llamado.nombre}`,
        fs.readFileSync(path.join(carpeta, llamado.nombre)),
        MIME['.docx'],
      ),
      user,
    );
  }

  log('▸ Análisis (cola real, 4 a la vez)');
  await esperarCola(id);

  const documentos = await prisma.documentoCompliance.findMany({
    where: { expedienteId: id },
    orderBy: { createdAt: 'asc' },
  });
  console.log('');
  for (const d of documentos) {
    const m = d.metricas as { latencia_ms?: number; tokens_total?: number } | null;
    log(
      `  ${d.estado.padEnd(9)} ${(d.estatusGlobal ?? '-').padEnd(8)} coincide=${String(d.tipoCoincide).padEnd(5)} ` +
        `${d.tipoDocumento.padEnd(34)} ${m?.latencia_ms ? `${Math.round(m.latencia_ms / 1000)} s` : ''} ` +
        `${m?.tokens_total ?? ''} tok  intentos=${d.intentos}${d.error ? `  error=${d.error.slice(0, 120)}` : ''}`,
    );
  }
  const reales = documentos.filter((d) => !/en-blanco|casilla-equivocada/.test(d.nombreArchivo));
  ok(
    'los documentos reales quedan ANALIZADO (prueba mínima 1 y 2)',
    reales.every((d) => d.estado === 'ANALIZADO'),
  );
  ok(
    'todos coinciden con su tipo',
    reales.every((d) => d.tipoCoincide === true),
    reales.filter((d) => d.tipoCoincide !== true).map((d) => [d.nombreArchivo, d.tipoDetectado]),
  );
  ok(
    'json_analista guardado con hechos_clave',
    reales.every((d) => !!(d.jsonAnalista as { hechos_clave?: unknown } | null)?.hechos_clave),
  );
  const blanco = documentos.find((d) => d.nombreArchivo === 'contrato-en-blanco.pdf');
  ok('el PDF en blanco queda RECHAZADO (prueba mínima 3)', blanco?.estado === 'RECHAZADO', blanco);
  const equivocado = documentos.find((d) => d.nombreArchivo.startsWith('casilla-equivocada'));
  ok(
    'la casilla equivocada da tipo_coincide false (prueba mínima 5)',
    equivocado?.estado === 'ANALIZADO' && equivocado.tipoCoincide === false,
    equivocado && [equivocado.estado, equivocado.tipoCoincide, equivocado.error],
  );
  const mensajesDoc = await prisma.mensajeCompliance.count({
    where: { expedienteId: id, rol: 'AGENTE', documentoId: { not: null } },
  });
  ok('cada análisis dejó su mensaje en el chat', mensajesDoc >= documentos.length * 2, mensajesDoc);

  detalle = await servicio.detalle(id, user);
  log(
    `  progreso ${detalle.progreso?.cubiertos}/${detalle.progreso?.total}, riesgo ${JSON.stringify(detalle.riesgo)}, siguiente ${detalle.siguienteDocumento}`,
  );
  ok(
    'progreso 10 de 12: falta el contrato y la notificación a no adjudicados',
    detalle.progreso?.cubiertos === 10 && detalle.progreso?.total === 12,
    detalle.progreso,
  );

  // ══════════════════════════════════════════════════════════════════
  log('▸ Pregunta sobre los resultados');
  respuesta = await chat(id, '¿Cuál documento salió peor y por qué?');
  ok(
    'el agente responde sobre los análisis',
    respuesta.mensajes.some((m) => m.rol === 'AGENTE' && m.texto.length > 40),
  );

  // ══════════════════════════════════════════════════════════════════
  log('▸ Dictamen PARCIAL (prueba mínima 6)');
  const parcial = await servicio.solicitarDictamen(id, false, user);
  await esperarCola(id);
  const dParcial = await servicio.dictamen(parcial.id, user);
  const puntaje = dParcial.puntaje as { global?: { porcentaje?: number; rango?: string } } | null;
  log(
    `  ${dParcial.estado} ${dParcial.alcance} ${puntaje?.global?.porcentaje} % ${puntaje?.global?.rango}, pendientes ${JSON.stringify(dParcial.pendientes)}, contradicciones ${Array.isArray(dParcial.coherencia) ? dParcial.coherencia.length : '-'}`,
  );
  ok('sale PARCIAL', dParcial.estado === 'LISTO' && dParcial.alcance === 'PARCIAL', dParcial.error);
  if (dParcial.estado === 'LISTO') {
    const pdf = await servicio.dictamenPdf(parcial.id, user);
    fs.writeFileSync(path.join('.tmp-docs', 'dictamen-real-parcial.pdf'), pdf.buffer);
    fs.writeFileSync(path.join('.tmp-docs', 'dictamen-real-parcial.md'), dParcial.markdown ?? '');
    ok('el PDF del parcial se genera', pdf.buffer.subarray(0, 5).toString() === '%PDF-');
  }

  // ══════════════════════════════════════════════════════════════════
  log('▸ Dictamen FINAL pedido por el chat (prueba mínima 7, con forzar_final)');
  respuesta = await chat(id, 'Emite el dictamen final ahora, aunque falten documentos.');
  let final = respuesta.acciones.find((a) => a.accion === 'solicitar_dictamen');
  if (!final) {
    observaciones.push(
      'El chat no devolvió solicitar_dictamen: el FINAL se pidió con el endpoint.',
    );
    const pedido = await servicio.solicitarDictamen(id, true, user);
    final = { accion: 'solicitar_dictamen', dictamenId: pedido.id, forzarFinal: true };
  }
  ok('el FINAL se pidió con forzar_final', final.forzarFinal === true, final);
  await esperarCola(id);
  const dFinal = await servicio.dictamen(final.dictamenId as string, user);
  log(`  ${dFinal.estado} ${dFinal.alcance}`);
  ok('sale FINAL', dFinal.estado === 'LISTO' && dFinal.alcance === 'FINAL', dFinal.error);
  if (dFinal.estado === 'LISTO') {
    const pdf = await servicio.dictamenPdf(dFinal.id, user);
    fs.writeFileSync(path.join('.tmp-docs', 'dictamen-real-final.pdf'), pdf.buffer);
    fs.writeFileSync(path.join('.tmp-docs', 'dictamen-real-final.md'), dFinal.markdown ?? '');
    ok('el PDF del final se genera', pdf.buffer.subarray(0, 5).toString() === '%PDF-');
  }
  detalle = await servicio.detalle(id, user);
  ok('el FINAL cierra el expediente', detalle.estado === 'CERRADA');

  // ══════════════════════════════════════════════════════════════════
  const metricas = documentos
    .map((d) => d.metricas as { tokens_total?: number; latencia_ms?: number } | null)
    .filter(Boolean);
  const tokens = metricas.reduce((s, m) => s + (m?.tokens_total ?? 0), 0);
  console.log(`\n${'─'.repeat(70)}`);
  log(`Expediente ${id} (queda en la base para revisarlo).`);
  log(
    `Tokens de los análisis: ${tokens.toLocaleString('es-VE')}. Tiempo total: ${Math.round((Date.now() - inicio) / 60000)} min.`,
  );
  observaciones.forEach((o) => log(`Observación: ${o}`));
  if (fallas.length) {
    log(`✘ ${fallas.length} fallas de ${pasadas + fallas.length}:`);
    fallas.forEach((f) => log(`  - ${f}`));
    process.exitCode = 1;
  } else {
    log(`✔ ${pasadas} comprobaciones, todas correctas.`);
  }
}

main()
  .catch((error) => {
    console.error(reloj(), error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
