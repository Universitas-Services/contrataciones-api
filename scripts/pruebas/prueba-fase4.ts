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

  for (const evaluacionId of evaluaciones.slice(1)) {
    await prisma.dictamenAdjudicacion.create({
      data: {
        expedienteId: expediente.id,
        evaluacionId,
        tipoDictamen: caracter,
        oferenteAdjudicadoProcedimiento: false,
        causaNoAdjudicado: 'Precio superior al de la primera opción',
      },
    });
  }

  return { expedienteId: expediente.id, evaluaciones };
}

async function main() {
  assertBaseLocal();

  const prismaService = prisma as unknown as PrismaService;
  const fase4 = new FormalizacionFase4Service(prismaService);
  const decaimiento = new DecaimientoService(prismaService, fase4);
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
    () => decaimiento.notificarInfractor(total.expedienteId, user),
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
    () => decaimiento.notificarSubsiguiente(total.expedienteId, user),
    'Primero debe notificarse el decaimiento al infractor',
  );

  // -- Notificaciones ------------------------------------------------
  estado = await decaimiento.notificarInfractor(total.expedienteId, user);
  ok(
    'queda la fecha de notificación al infractor',
    !!estado.cicloActivo?.notificacionInfractor.emitidaAt,
  );

  await rechaza(
    'no se cierra el ciclo antes de notificar al subsiguiente',
    () => decaimiento.cerrarCiclo(total.expedienteId, user),
    'Primero debe notificarse la adjudicación a la siguiente opción',
  );

  estado = await decaimiento.notificarSubsiguiente(total.expedienteId, user);
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
    contrato.tokens.monto_contrato_numeros_au_au?.startsWith('Bs. '),
  );
  ok(
    'el monto en letras viene resuelto',
    (contrato.tokens.monto_contrato_letras_au_au ?? '').length > 10,
  );
  ok('el objeto sale del expediente', !!contrato.tokens.objeto_contratacion_au_au);

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
  await decaimiento.notificarInfractor(parcial.expedienteId, user);

  await rechaza(
    'un ciclo desierto no se cierra por la vía de la siguiente opción',
    () => decaimiento.cerrarCiclo(parcial.expedienteId, user),
    'se cierra con las notificaciones de fin de procedimiento',
  );

  estado = await decaimiento.cierreDesierto(parcial.expedienteId, user);
  ok('el expediente queda sellado', estado.sellado);
  ok('el ciclo desierto pasó al historial', estado.ciclosCerrados.length === 1);
  ok('ya no se puede declarar otro decaimiento', !estado.gates.puedeDeclararDecaimiento);
  ok(
    'se notificó a los 3 participantes',
    estado.participantesCierre.every((p) => p.notificacionEmitidaAt),
  );

  const expedienteSellado = await prisma.expedienteContratacion.findUnique({
    where: { id: parcial.expedienteId },
    select: { estatusProceso: true, declaratoriaDesierto: true },
  });
  ok('el estatus del proceso pasa a DESIERTO', expedienteSellado?.estatusProceso === 'DESIERTO');
  ok(
    'no se toca la declaratoria de desierto de la Fase 2',
    expedienteSellado?.declaratoriaDesierto === false,
  );

  await rechaza(
    'tras el sellado toda escritura responde con conflicto',
    () =>
      decaimiento.declarar(
        parcial.expedienteId,
        { infractorEvaluacionId: parcial.evaluaciones[1] },
        user,
      ),
    'Expediente sellado',
  );

  // -- Salida de emergencia ------------------------------------------
  estado = await decaimiento.desellar(parcial.expedienteId, user);
  ok('el desellado devuelve el expediente a edición', !estado.sellado);

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
