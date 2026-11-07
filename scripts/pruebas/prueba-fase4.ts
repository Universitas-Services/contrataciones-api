/**
 * Prueba end-to-end de la Fase 4 de gestión, contra la base local.
 *
 * Siembra su propio escenario, corre los dos desenlaces del ciclo de
 * decaimiento (siguiente opción y procedimiento desierto), comprueba las
 * reglas de orden y bloqueo, y borra todo lo que creó.
 *
 *   npx ts-node -T scripts/pruebas/prueba-fase4.ts
 *
 * Sólo corre contra una base local: aborta si DATABASE_URL apunta a otro host.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../src/database/prisma.service';
import { FormalizacionFase4Service } from '../../src/formalizacion-fase4/formalizacion-fase4.service';
import { DecaimientoService } from '../../src/formalizacion-fase4/decaimiento.service';
import { DocumentosFase4Service } from '../../src/formalizacion-fase4/documentos-fase4.service';
import { GeneradorDocumentosService } from '../../src/generador-documentos/generador-documentos.service';
import type { UsuarioActual } from '../../src/common/types/usuario-actual.type';

const CODIGO_PRUEBA = 'PRUEBA-FASE4';

function assertBaseLocal() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres|db)[:/]/.test(url)) {
    console.error('✖ Esta prueba escribe y borra datos: sólo corre contra una base local.');
    process.exit(1);
  }
}

// ── Pequeño arnés, para no arrastrar Jest a un script de base de datos ──
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

async function rechaza(
  descripcion: string,
  accion: () => Promise<unknown>,
  textoEsperado?: string,
) {
  try {
    await accion();
    ok(descripcion, false, '(no lanzó error)');
  } catch (error) {
    const mensaje = (error as { message?: string }).message ?? `${error}`;
    ok(descripcion, textoEsperado ? mensaje.includes(textoEsperado) : true, mensaje);
  }
}

const prisma = new PrismaClient();

async function limpiar() {
  const previos = await prisma.expedienteContratacion.findMany({
    where: { codigoNomenclatura: { startsWith: CODIGO_PRUEBA } },
    select: { id: true },
  });
  for (const { id } of previos) {
    await prisma.expedienteContratacion.delete({ where: { id } });
  }
}

/** Expediente con tres oferentes calificados y el primero adjudicado. */
async function sembrar(caracter: 'TOTAL' | 'PARCIAL', sufijo: string) {
  const ente = await prisma.entePublico.findFirst({ where: { deletedAt: null } });
  const modalidad = await prisma.modalidadContratacion.findFirst();
  if (!ente || !modalidad) throw new Error('La base no tiene ente o modalidad: corre el seed.');

  const expediente = await prisma.expedienteContratacion.create({
    data: {
      enteId: ente.id,
      modalidadId: modalidad.id,
      descripcionObjeto: 'Adquisición de prueba para la Fase 4',
      codigoNomenclatura: `${CODIGO_PRUEBA}-${sufijo}`,
      estatusProceso: 'ADJUDICADO',
      caracterAdjudicacion: caracter,
    },
  });

  const posiciones = ['Primera Opción', 'Segunda Opción', 'Tercera Opción'];
  const montos = [367500, 300000, 280000];
  const evaluaciones: string[] = [];

  for (let i = 0; i < 3; i += 1) {
    const oferta = await prisma.ofertaPresentada.create({
      data: {
        expedienteId: expediente.id,
        nombreProveedorOferente: `Oferente de prueba ${i + 1}`,
        rifProveedorOferente: `J-0000000${i + 1}-0`,
        nombreRepLegalOferente: `Representante ${i + 1}`,
        cedulaRepLegalOferente: `V-1000000${i + 1}`,
        datosRegistroMercantilProveedorOferente: `Registro Mercantil ${i + 1}`,
        montoOfertaBs: montos[i],
        numeroSobresEntregados: 2,
      },
    });

    const evaluacion = await prisma.evaluacionResultados.create({
      data: {
        ofertaId: oferta.id,
        nombreProveedorEvaluado: `Oferente de prueba ${i + 1}`,
        rifProveedorEvaluado: `J-0000000${i + 1}-0`,
        nombreRepLegalEvaluado: `Representante ${i + 1}`,
        cedulaRepLegalEvaluado: `V-1000000${i + 1}`,
        oferenteCalificado: true,
        posicionPrelacion: posiciones[i],
        totalEvaluacion: 95 - i * 5,
      },
    });
    evaluaciones.push(evaluacion.id);
  }

  // Dictamen: el primero adjudicado, los otros con causa de no adjudicación.
  // En PARCIAL se adjudica también al segundo, que es el caso real: el
  // decaimiento de uno no puede tumbar los renglones del otro.
  await prisma.dictamenAdjudicacion.create({
    data: {
      expedienteId: expediente.id,
      evaluacionId: evaluaciones[0],
      tipoDictamen: caracter,
      ...(caracter === 'TOTAL'
        ? {
            partidasAdjudicadasTotal: '4.02.01.01.00',
            montoAdjudicadoTotal: montos[0],
            plazoEjecucionOfertaGanadora: 90,
          }
        : {
            oferenteAdjudicadoProcedimiento: true,
            alcanceAdjudicacionParcial: 'Renglones 01, 02',
            partidasAdjudicadasParcial: '4.02.01.01.00',
            montoAdjudicadoParcial: montos[0],
            plazoEjecucionOfertaParcial: 90,
          }),
    },
  });

  for (const [indice, evaluacionId] of evaluaciones.slice(1).entries()) {
    const segundoAdjudicadoParcial = caracter === 'PARCIAL' && indice === 0;

    await prisma.dictamenAdjudicacion.create({
      data: {
        expedienteId: expediente.id,
        evaluacionId,
        tipoDictamen: caracter,
        ...(segundoAdjudicadoParcial
          ? {
              oferenteAdjudicadoProcedimiento: true,
              alcanceAdjudicacionParcial: 'Renglón 03',
              partidasAdjudicadasParcial: '4.02.01.02.00',
              montoAdjudicadoParcial: montos[1],
              plazoEjecucionOfertaParcial: 60,
            }
          : {
              oferenteAdjudicadoProcedimiento: false,
              causaNoAdjudicado: 'Precio superior al de la primera opción',
            }),
      },
    });
  }

  return { expedienteId: expediente.id, evaluaciones };
}

const OFICIO = {
  numOficioNotificacionDecaimiento: 'OF-112-2026',
  fechaOficioNotificacionDecaimiento: '2026-12-31',
};

const NOTIFICACION_SUBSIGUIENTE = {
  numNotificacionAdjudicacionSubsiguiente: 'NOT-045-2026',
  fechaNotificacionAdjudicacionSubsiguiente: '2026-12-31',
};

const AVISO_FIN = {
  numNotificacionFinProceso: 'AVISO-012-2026',
  fechaNotificacionFinProceso: '2026-12-31',
};

async function main() {
  assertBaseLocal();

  const prismaService = prisma as unknown as PrismaService;
  // Sin plantillas todavía: el generador nunca llega a usar correo ni almacenamiento.
  const generador = new GeneradorDocumentosService(prismaService, {} as never, {} as never);
  const documentos = new DocumentosFase4Service(prismaService, generador);
  const fase4 = new FormalizacionFase4Service(prismaService, documentos);
  const decaimiento = new DecaimientoService(prismaService, fase4, documentos);
  const user: UsuarioActual = { id: 'prueba-fase4', rol: 'UNIVERSITAS' } as UsuarioActual;

  await limpiar();

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Escenario TOTAL — el ciclo termina en la siguiente opción');
  // ══════════════════════════════════════════════════════════════════
  const total = await sembrar('TOTAL', 'TOTAL');
  const [primero, segundo] = total.evaluaciones;

  let estado = await fase4.getEstado(total.expedienteId, user);
  ok('la fase arranca habilitada', estado.gates.faseHabilitada);
  ok('el primero aparece ADJUDICADO', estado.oferentes[0].estatus === 'ADJUDICADO');
  ok('su monto sale del dictamen', estado.oferentes[0].montoContratoBs === 367500);
  ok('los demás quedan en RESERVA', estado.oferentes[1].estatus === 'RESERVA');
  ok('se puede declarar decaimiento', estado.gates.puedeDeclararDecaimiento);
  ok('no hay contratos bloqueados todavía', !estado.gates.contratosBloqueados);

  // -- Orden obligatorio: no se puede saltar al certificado ----------
  await rechaza(
    'sin ciclo abierto, el certificado se rechaza',
    () =>
      decaimiento.guardarCertificado(
        total.expedienteId,
        {
          fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
          fechaCertificacionIncumplimiento: '2026-10-23',
          causalDecaimiento: 'NO FIRMÓ CONTRATO',
        } as never,
        user,
      ),
    'No hay un ciclo de decaimiento en curso',
  );

  // -- Declarar ------------------------------------------------------
  estado = await decaimiento.declarar(total.expedienteId, { infractorEvaluacionId: primero }, user);
  ok('el infractor pasa a EN_DECAIMIENTO', estado.oferentes[0].estatus === 'EN_DECAIMIENTO');
  ok('en TOTAL se bloquean todos los contratos', estado.gates.contratosBloqueados);
  ok('el ciclo activo es el número 1', estado.cicloActivo?.numeroCiclo === 1);
  ok(
    'el backend ya sabe que hay siguiente opción',
    estado.cicloActivo?.existeOpcionSubsiguiente === true,
  );

  await rechaza(
    'no se permite un segundo ciclo simultáneo',
    () => decaimiento.declarar(total.expedienteId, { infractorEvaluacionId: segundo }, user),
    'Ya hay un ciclo de decaimiento en curso',
  );

  await rechaza(
    'con los contratos bloqueados no se guarda ningún borrador',
    () => fase4.guardarBorrador(total.expedienteId, segundo, { clauses: [] }, user),
    'los contratos están bloqueados',
  );

  await rechaza(
    'sin decisión no se emite el certificado',
    () =>
      decaimiento.guardarCertificado(
        total.expedienteId,
        {
          fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
          fechaCertificacionIncumplimiento: '2026-10-23',
          causalDecaimiento: 'NO FIRMÓ CONTRATO',
        } as never,
        user,
      ),
    'Primero debe elegir',
  );

  // -- Decisión ------------------------------------------------------
  await decaimiento.elegirDecision(total.expedienteId, { decision: 'SUBSIGUIENTE' }, user);

  await rechaza(
    'la fecha de certificación no puede ser anterior a la de notificación',
    () =>
      decaimiento.guardarCertificado(
        total.expedienteId,
        {
          fechaNotificacionAdjudicacionIncumplidor: '2026-10-23',
          fechaCertificacionIncumplimiento: '2026-10-13',
          causalDecaimiento: 'NO FIRMÓ CONTRATO',
          montoReadjudicadoBs: 300000,
        } as never,
        user,
      ),
    'no puede ser anterior',
  );

  await rechaza(
    'el plazo del subsiguiente es obligatorio',
    () =>
      decaimiento.guardarCertificado(
        total.expedienteId,
        {
          fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
          fechaCertificacionIncumplimiento: '2026-10-23',
          causalDecaimiento: 'NO FIRMÓ CONTRATO',
          montoReadjudicadoBs: 300000,
        } as never,
        user,
      ),
    'plazoEjecucionSubsiguiente',
  );

  await rechaza(
    'en TOTAL el monto de la readjudicación es obligatorio',
    () =>
      decaimiento.guardarCertificado(
        total.expedienteId,
        {
          fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
          fechaCertificacionIncumplimiento: '2026-10-23',
          causalDecaimiento: 'NO FIRMÓ CONTRATO',
        } as never,
        user,
      ),
    'montoReadjudicadoBs',
  );

  // -- Certificado ---------------------------------------------------
  estado = await decaimiento.guardarCertificado(
    total.expedienteId,
    {
      fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
      fechaCertificacionIncumplimiento: '2026-10-23',
      causalDecaimiento: 'NO FIRMÓ CONTRATO',
      montoReadjudicadoBs: 300000,
      plazoEjecucionSubsiguiente: 75,
    } as never,
    user,
  );

  const certificado = estado.cicloActivo?.certificado;
  ok('el certificado queda emitido', !!certificado);
  ok(
    'el servidor eligió solo al subsiguiente en TOTAL',
    estado.cicloActivo?.subsiguiente?.evaluacionId === segundo,
  );
  ok(
    'el vencimiento de garantías son 5 días hábiles',
    certificado?.fechaVencimientoGarantias?.toISOString().slice(0, 10) === '2026-10-20',
  );
  ok(
    'el vencimiento de firma son 8 días hábiles',
    certificado?.fechaVencimientoFirmaContrato?.toISOString().slice(0, 10) === '2026-10-23',
  );

  await rechaza(
    'con certificado emitido ya no se deshace el ciclo',
    () => decaimiento.deshacer(total.expedienteId, user),
    'no se puede deshacer',
  );

  await rechaza(
    'con certificado emitido ya no se cambia la decisión',
    () => decaimiento.elegirDecision(total.expedienteId, { decision: 'DESIERTO' }, user),
    'La decisión no se puede cambiar',
  );

  await rechaza(
    'no se notifica al infractor sin resolución',
    () => decaimiento.notificarInfractor(total.expedienteId, OFICIO, user),
    'Primero debe emitirse la resolución',
  );

  // -- Resolución ----------------------------------------------------
  estado = await decaimiento.guardarResolucion(
    total.expedienteId,
    { numResolucionDecaimiento: 'RESOL-045-2026', fechaResolucionDecaimiento: '2026-10-23' },
    user,
  );
  ok('la resolución queda registrada', !!estado.cicloActivo?.resolucion);

  await rechaza(
    'no se notifica al subsiguiente antes que al infractor',
    () => decaimiento.notificarSubsiguiente(total.expedienteId, NOTIFICACION_SUBSIGUIENTE, user),
    'Primero debe notificarse el decaimiento al infractor',
  );

  // -- Notificaciones ------------------------------------------------
  await rechaza(
    'el oficio no puede ser anterior a la resolución',
    () =>
      decaimiento.notificarInfractor(
        total.expedienteId,
        { ...OFICIO, fechaOficioNotificacionDecaimiento: '2026-10-22' },
        user,
      ),
    'no puede ser anterior a la de la resolución',
  );

  await decaimiento.notificarInfractor(
    total.expedienteId,
    { ...OFICIO, numOficioNotificacionDecaimiento: 'OF-MAL-ESCRITO' },
    user,
  );
  estado = await decaimiento.notificarInfractor(total.expedienteId, OFICIO, user);
  ok(
    'reemitir el oficio corrige el número',
    estado.cicloActivo?.notificacionInfractor.numOficioNotificacionDecaimiento === 'OF-112-2026',
  );
  const oficiosVigentes = await prisma.documentoGenerado.count({
    where: {
      expedienteId: total.expedienteId,
      tipoDocumento: 'NOTIFICACION_DECAIMIENTO',
      estaDesactualizado: false,
      deletedAt: null,
    },
  });
  ok('solo queda vigente un oficio', oficiosVigentes === 1, oficiosVigentes);
  ok(
    'queda la fecha de notificación al infractor',
    !!estado.cicloActivo?.notificacionInfractor.emitidaAt,
  );

  await rechaza(
    'no se cierra el ciclo antes de notificar al subsiguiente',
    () => decaimiento.cerrarCiclo(total.expedienteId, user),
    'Primero debe notificarse la adjudicación a la siguiente opción',
  );

  await rechaza(
    'la notificación no puede ser anterior a la resolución',
    () =>
      decaimiento.notificarSubsiguiente(
        total.expedienteId,
        { ...NOTIFICACION_SUBSIGUIENTE, fechaNotificacionAdjudicacionSubsiguiente: '2026-10-22' },
        user,
      ),
    'no puede ser anterior a la de la resolución',
  );

  await decaimiento.notificarSubsiguiente(
    total.expedienteId,
    { ...NOTIFICACION_SUBSIGUIENTE, numNotificacionAdjudicacionSubsiguiente: 'NOT-MAL-ESCRITA' },
    user,
  );
  estado = await decaimiento.notificarSubsiguiente(
    total.expedienteId,
    NOTIFICACION_SUBSIGUIENTE,
    user,
  );
  ok(
    'reemitir la notificación corrige el número',
    estado.cicloActivo?.notificacionSubsiguiente.numNotificacionAdjudicacionSubsiguiente ===
      'NOT-045-2026',
  );
  const notificacionesVigentes = await prisma.documentoGenerado.count({
    where: {
      expedienteId: total.expedienteId,
      tipoDocumento: 'NOTIFICACION_ADJUDICACION_SUBSIGUIENTE',
      estaDesactualizado: false,
      deletedAt: null,
    },
  });
  ok('solo queda vigente una notificación', notificacionesVigentes === 1, notificacionesVigentes);
  ok(
    'queda la fecha de notificación al subsiguiente',
    !!estado.cicloActivo?.notificacionSubsiguiente.emitidaAt,
  );

  // -- Cierre --------------------------------------------------------
  estado = await decaimiento.cerrarCiclo(total.expedienteId, user);
  const infractor = estado.oferentes.find((o) => o.evaluacionId === primero);
  const nuevo = estado.oferentes.find((o) => o.evaluacionId === segundo);

  ok('el infractor queda DECAIDO', infractor?.estatus === 'DECAIDO');
  ok('el subsiguiente pasa a ADJUDICADO', nuevo?.estatus === 'ADJUDICADO');
  ok('el nuevo adjudicado asume el monto readjudicado', nuevo?.montoContratoBs === 300000);
  ok('el ciclo pasó al historial', estado.ciclosCerrados.length === 1 && !estado.cicloActivo);
  ok('los contratos se desbloquean', !estado.gates.contratosBloqueados);
  ok('el switch vuelve a estar disponible', estado.gates.puedeDeclararDecaimiento);
  ok(
    'el decaído ya no es candidato a siguiente opción',
    !estado.candidatosSubsiguientes.some((c) => c.evaluacionId === primero),
  );

  // -- Contrato del nuevo adjudicado ---------------------------------
  const contrato = await fase4.getContrato(total.expedienteId, segundo, user);
  ok('el contrato arranca en BORRADOR', contrato.estado === 'BORRADOR');
  ok('trae el diccionario de variables resuelto', !!contrato.tokens);
  ok(
    'el nombre del contratista sale de la oferta',
    contrato.tokens.nombre_contratista_au_au === 'Oferente de prueba 2',
  );
  ok(
    'el monto en números viene formateado',
    /^[\d.]+,\d{2}$/.test(contrato.tokens.monto_contrato_numeros_au_au ?? ''),
  );
  ok(
    'el monto en letras viene resuelto',
    (contrato.tokens.monto_contrato_letras_au_au ?? '').length > 10,
  );
  ok('el objeto sale del expediente', !!contrato.tokens.objeto_contratacion_au_au);
  ok(
    'el subsiguiente hereda las partidas del infractor',
    contrato.tokens.partidas_presupuestarias_au_au === '4.02.01.01.00',
  );
  ok(
    'el subsiguiente usa el plazo que se pidió en el certificado',
    contrato.tokens.plazo_ejecucion_dias_au_au === '75',
  );
  ok(
    'la fianza de fiel cumplimiento se calcula sola',
    contrato.tokens.monto_garantia_fiel_cumplimiento_numeros_au_au !== undefined,
  );

  const generado = await fase4.generarContrato(
    total.expedienteId,
    segundo,
    { clauses: [{ order: 1, titulo: 'OBJETO', cuerpoHtml: '<p>Objeto</p>' }] },
    user,
  );
  ok('el contrato queda GENERADO', generado.estado === 'GENERADO');

  await rechaza(
    'no se genera contrato para un decaído',
    () => fase4.generarContrato(total.expedienteId, primero, { clauses: [] }, user),
    'decaimiento o decaído',
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Escenario PARCIAL — el ciclo termina en procedimiento desierto');
  // ══════════════════════════════════════════════════════════════════
  const parcial = await sembrar('PARCIAL', 'PARCIAL');
  const infractorParcial = parcial.evaluaciones[0];

  estado = await fase4.getEstado(parcial.expedienteId, user);
  ok(
    'en PARCIAL solo adjudica quien lo tiene marcado',
    estado.oferentes[0].estatus === 'ADJUDICADO',
  );
  ok('el alcance parcial se refleja', estado.oferentes[0].alcance === 'Renglones 01, 02');

  await decaimiento.declarar(
    parcial.expedienteId,
    { infractorEvaluacionId: infractorParcial },
    user,
  );
  estado = await fase4.getEstado(parcial.expedienteId, user);
  ok('en PARCIAL no se bloquean todos los contratos', !estado.gates.contratosBloqueados);

  await decaimiento.elegirDecision(parcial.expedienteId, { decision: 'DESIERTO' }, user);

  await rechaza(
    'el desierto exige la modalidad degradada',
    () =>
      decaimiento.guardarCertificado(
        parcial.expedienteId,
        {
          fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
          fechaCertificacionIncumplimiento: '2026-10-23',
          causalDecaimiento: 'NO CONSIGNÓ GARANTÍAS',
        } as never,
        user,
      ),
    'modalidad degradada',
  );

  await rechaza(
    'el desierto PARCIAL exige los renglones afectados',
    () =>
      decaimiento.guardarCertificado(
        parcial.expedienteId,
        {
          fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
          fechaCertificacionIncumplimiento: '2026-10-23',
          causalDecaimiento: 'NO CONSIGNÓ GARANTÍAS',
          modalidadDegradadaSugerida: 'Consulta de Precios (Art. 96 LCP)',
        } as never,
        user,
      ),
    'renglones afectados',
  );

  await decaimiento.guardarCertificado(
    parcial.expedienteId,
    {
      fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
      fechaCertificacionIncumplimiento: '2026-10-23',
      causalDecaimiento: 'NO CONSIGNÓ GARANTÍAS',
      modalidadDegradadaSugerida: 'Consulta de Precios (Art. 96 LCP)',
      renglonesAfectadosDecaimiento: 'Renglón 04',
    } as never,
    user,
  );
  await decaimiento.guardarResolucion(
    parcial.expedienteId,
    { numResolucionDecaimiento: 'RESOL-046-2026', fechaResolucionDecaimiento: '2026-10-23' },
    user,
  );
  await decaimiento.notificarInfractor(parcial.expedienteId, OFICIO, user);

  await rechaza(
    'un ciclo desierto no se cierra por la vía de la siguiente opción',
    () => decaimiento.cerrarCiclo(parcial.expedienteId, user),
    'se cierra con las notificaciones de fin de procedimiento',
  );

  estado = await decaimiento.cierreDesierto(parcial.expedienteId, AVISO_FIN, user);

  // El decaimiento alcanza sólo a los renglones del infractor: el segundo
  // adjudicado conserva los suyos, así que el expediente NO se sella.
  ok('el desierto parcial NO sella el expediente', !estado.sellado);
  ok('el ciclo desierto pasó al historial', estado.ciclosCerrados.length === 1);
  ok(
    'el infractor queda DECAIDO',
    estado.oferentes.find((o) => o.evaluacionId === infractorParcial)?.estatus === 'DECAIDO',
  );
  ok(
    'el otro adjudicado sigue vigente',
    estado.oferentes.find((o) => o.evaluacionId === parcial.evaluaciones[1])?.estatus ===
      'ADJUDICADO',
  );
  ok('su contrato sigue disponible', !estado.gates.contratosBloqueados);
  ok(
    'los 3 participantes ven el aviso emitido',
    estado.participantesCierre.every((p) => p.notificacionEmitidaAt),
  );
  ok(
    'todos apuntan al mismo aviso',
    new Set(estado.participantesCierre.map((p) => p.documentoId)).size === 1 &&
      !!estado.participantesCierre[0].documentoId,
  );
  const avisos = await prisma.documentoGenerado.count({
    where: {
      expedienteId: parcial.expedienteId,
      tipoDocumento: 'NOTIFICACION_FIN_PROCEDIMIENTO',
      deletedAt: null,
    },
  });
  ok('el aviso es un solo documento', avisos === 1, avisos);

  const expedienteParcial = await prisma.expedienteContratacion.findUnique({
    where: { id: parcial.expedienteId },
    select: { estatusProceso: true, declaratoriaDesierto: true },
  });
  ok(
    'el estatus del proceso no cambia a DESIERTO',
    expedienteParcial?.estatusProceso !== 'DESIERTO',
  );
  ok(
    'no se toca la declaratoria de desierto de la Fase 2',
    expedienteParcial?.declaratoriaDesierto === false,
  );

  // Con el expediente abierto, el adjudicado que queda sí puede contratar.
  const contratoVivo = await fase4.getContrato(parcial.expedienteId, parcial.evaluaciones[1], user);
  ok('el adjudicado que queda puede armar su contrato', contratoVivo.estado === 'BORRADOR');

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ PARCIAL — un adjudicado asume también los renglones del infractor');
  // ══════════════════════════════════════════════════════════════════
  const readj = await sembrar('PARCIAL', 'READJ-PARCIAL');
  const [infractorReadj, asumeReadj] = readj.evaluaciones;

  estado = await fase4.getEstado(readj.expedienteId, user);
  const montoBaseReadj = estado.oferentes.find((o) => o.evaluacionId === asumeReadj)
    ?.montoContratoBs as number;

  await decaimiento.declarar(readj.expedienteId, { infractorEvaluacionId: infractorReadj }, user);
  await decaimiento.elegirDecision(readj.expedienteId, { decision: 'SUBSIGUIENTE' }, user);
  await decaimiento.guardarCertificado(
    readj.expedienteId,
    {
      fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
      fechaCertificacionIncumplimiento: '2026-10-23',
      causalDecaimiento: 'NO FIRMÓ CONTRATO',
      subsiguienteEvaluacionId: asumeReadj,
      alcanceReadjudicacionParcial: 'Renglones 01, 02',
      montoReadjudicadoParcialBs: 100000,
      plazoEjecucionSubsiguiente: 75,
    } as never,
    user,
  );
  await decaimiento.guardarResolucion(
    readj.expedienteId,
    { numResolucionDecaimiento: 'RESOL-048-2026', fechaResolucionDecaimiento: '2026-10-23' },
    user,
  );
  await decaimiento.notificarInfractor(readj.expedienteId, OFICIO, user);
  await decaimiento.notificarSubsiguiente(readj.expedienteId, NOTIFICACION_SUBSIGUIENTE, user);
  estado = await decaimiento.cerrarCiclo(readj.expedienteId, user);

  const contratoReadj = await fase4.getContrato(readj.expedienteId, asumeReadj, user);
  ok(
    'el contrato lleva sus partidas y las del infractor',
    contratoReadj.tokens.partidas_presupuestarias_au_au === '4.02.01.02.00, 4.02.01.01.00',
    contratoReadj.tokens.partidas_presupuestarias_au_au,
  );
  ok(
    'el monto suma su adjudicación y lo readjudicado',
    contratoReadj.montoContratoBs === montoBaseReadj + 100000,
    contratoReadj.montoContratoBs,
  );
  ok(
    'el plazo sigue saliendo de su dictamen hasta definir la regla',
    contratoReadj.tokens.plazo_ejecucion_dias_au_au === '60',
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Documentos sin plantilla: el flujo sigue y quedan pendientes');
  // ══════════════════════════════════════════════════════════════════
  const documentoCiclo = estado.ciclosCerrados[0].certificado?.documentoId as string;
  ok('el paso registra su documento aunque no haya archivo', !!documentoCiclo);

  const filaAntes = await prisma.documentoGenerado.findUnique({ where: { id: documentoCiclo } });
  ok('el registro queda con la URL vacía', filaAntes?.urlArchivo === '');

  await rechaza(
    'la vista previa sin archivo responde conflicto',
    () => documentos.preview(readj.expedienteId, documentoCiclo),
    'aún no se ha generado',
  );
  await rechaza(
    'la descarga sin archivo responde conflicto',
    () => documentos.descarga(readj.expedienteId, documentoCiclo),
    'aún no se ha generado',
  );
  await rechaza(
    'un documento de otro expediente no se sirve',
    () => documentos.preview(total.expedienteId, documentoCiclo),
    'no encontrado',
  );

  const reintento = await fase4.regenerarPendientes(readj.expedienteId, user);
  ok(
    'regenerar informa los cuatro documentos que siguen pendientes',
    reintento.generados === 0 && reintento.pendientes === 4,
    reintento,
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Desierto que sí cierra el procedimiento');
  // ══════════════════════════════════════════════════════════════════
  const ultimo = await sembrar('TOTAL', 'DESIERTO-TOTAL');

  await decaimiento.declarar(
    ultimo.expedienteId,
    { infractorEvaluacionId: ultimo.evaluaciones[0] },
    user,
  );
  await rechaza(
    'en TOTAL no se declara desierto si queda reserva',
    () => decaimiento.elegirDecision(ultimo.expedienteId, { decision: 'DESIERTO' }, user),
    'Quedan oferentes en reserva',
  );

  // Se agota el orden de prelación: ya nadie puede asumir.
  await prisma.evaluacionResultados.updateMany({
    where: { id: { in: ultimo.evaluaciones.slice(1) } },
    data: { oferenteCalificado: false },
  });
  await decaimiento.elegirDecision(ultimo.expedienteId, { decision: 'DESIERTO' }, user);
  await decaimiento.guardarCertificado(
    ultimo.expedienteId,
    {
      fechaNotificacionAdjudicacionIncumplidor: '2026-10-13',
      fechaCertificacionIncumplimiento: '2026-10-23',
      causalDecaimiento: 'RECHAZO EXPRESO',
      modalidadDegradadaSugerida: 'Consulta de Precios (Art. 96 LCP)',
    } as never,
    user,
  );
  await decaimiento.guardarResolucion(
    ultimo.expedienteId,
    { numResolucionDecaimiento: 'RESOL-047-2026', fechaResolucionDecaimiento: '2026-10-23' },
    user,
  );
  await decaimiento.notificarInfractor(ultimo.expedienteId, OFICIO, user);
  estado = await decaimiento.cierreDesierto(ultimo.expedienteId, AVISO_FIN, user);

  ok('sin adjudicados vigentes, el expediente sí se sella', estado.sellado);
  ok('ya no se puede declarar otro decaimiento', !estado.gates.puedeDeclararDecaimiento);

  const expedienteSellado = await prisma.expedienteContratacion.findUnique({
    where: { id: ultimo.expedienteId },
    select: { estatusProceso: true, declaratoriaDesierto: true },
  });
  ok('el estatus del proceso pasa a DESIERTO', expedienteSellado?.estatusProceso === 'DESIERTO');
  ok(
    'tampoco aquí se toca la declaratoria de la Fase 2',
    expedienteSellado?.declaratoriaDesierto === false,
  );

  await rechaza(
    'tras el sellado toda escritura responde con conflicto',
    () =>
      decaimiento.declarar(
        ultimo.expedienteId,
        { infractorEvaluacionId: ultimo.evaluaciones[1] },
        user,
      ),
    'Expediente sellado',
  );

  // -- Salida de emergencia ------------------------------------------
  estado = await decaimiento.desellar(ultimo.expedienteId, user);
  ok('el desellado devuelve el expediente a edición', !estado.sellado);
  ok('el desellado reabre el ciclo que lo cerró', estado.cicloActivo?.numeroCiclo === 1);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n▸ Vencimientos con feriados del ente');
  // ══════════════════════════════════════════════════════════════════
  const vencimientos = await decaimiento.calcularVencimientos(
    total.expedienteId,
    '2026-10-13',
    user,
  );
  ok(
    'la vista previa coincide con lo que guardó el certificado',
    vencimientos.fechaVencimientoGarantias.toISOString().slice(0, 10) === '2026-10-20' &&
      vencimientos.fechaVencimientoFirmaContrato.toISOString().slice(0, 10) === '2026-10-23',
  );

  await rechaza(
    'calcular-vencimientos sin fecha responde 400, no 500',
    () => decaimiento.calcularVencimientos(total.expedienteId, '' as never, user),
    'YYYY-MM-DD',
  );

  await limpiar();

  console.log(`\n${'─'.repeat(60)}`);
  if (fallas.length === 0) {
    console.log(`✔ ${pasadas} comprobaciones, todas correctas.`);
  } else {
    console.log(`✘ ${fallas.length} fallas de ${pasadas + fallas.length} comprobaciones:`);
    for (const falla of fallas) console.log(`   · ${falla}`);
  }
  await prisma.$disconnect();
  process.exit(fallas.length === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error('\n✖ La prueba se cayó:', error);
  await limpiar().catch(() => undefined);
  await prisma.$disconnect();
  process.exit(1);
});
