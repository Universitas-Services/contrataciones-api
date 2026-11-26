import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { assertCedulasSinRepetir, cedulasNuevas } from '../common/utils/cedula-unica.util';
import { sumarMinutosAHora } from '../common/utils/date-formatter.util';
import { marcarDesactualizados } from '../common/utils/documentos-dependientes.util';
import { AdquirentePliegoService } from '../adquiriente-pliego/adquiriente-pliego.service';
import { GestionAdjudicacionService } from '../evaluacion-fase3/gestion-adjudicacion/gestion-adjudicacion.service';
import { HubService } from '../evaluacion-fase3/hub/hub.service';
import {
  calcularActoUnico,
  validarActoUnico,
} from '../expediente-contratacion/cronograma-acto-unico.util';
import { ExpedienteContratacionService } from '../expediente-contratacion/expediente-contratacion.service';
import { renderizarPildoras } from '../formalizacion-fase4/pildoras.util';
import {
  montoFielCumplimiento,
  unirPartidas,
} from '../formalizacion-fase4/tokens-contrato.resolver';
import { GeneradorDocumentosService } from '../generador-documentos/generador-documentos.service';
import { mapOferentesDesierto } from '../generador-documentos/mappers/informe-desierto.mapper';
import { logoComoPng } from '../manuales/manuales.service';
import { huboCambios, modeloContratoComparable } from './invalidacion-documentos.util';

const dia = (f: Date) => f.toISOString().split('T')[0];
const fecha = (f: string) => new Date(`${f}T00:00:00Z`);

/** Word completo (cuerpo y membrete); falla si una marca no tiene valor. */
function render(plantilla: string, datos: object): string {
  const ruta = path.join(__dirname, '../generador-documentos/templates', plantilla);
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(ruta, 'binary')), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
    nullGetter: (parte: { module?: string; value?: string }) => {
      if (!parte.module) throw new Error(`Sin valor: ${parte.value}`);
      return '';
    },
  });
  doc.render(datos);
  return Object.keys(doc.getZip().files)
    .filter((f) => /word\/(document|header\d*)\.xml$/.test(f))
    .map((f) =>
      doc
        .getZip()
        .file(f)!
        .asText()
        .replace(/<[^>]+>/g, ''),
    )
    .join('\n');
}

describe('Fianza de fiel cumplimiento', () => {
  it('(monto × 0,16 + monto) × porcentaje', () => {
    expect(montoFielCumplimiento(1_000_000, 20)).toBeCloseTo(232_000, 2);
    expect(montoFielCumplimiento(null, 20)).toBeNull();
  });

  it('las partidas no se repiten ni arrastran la unidad', () => {
    expect(unirPartidas('401-07-83-00, 401-07-83-00 UNIDAD')).toBe('401-07-83-00');
    expect(unirPartidas('4.02.01.01.00')).toBe('4.02.01.01.00');
  });
});

describe('Hora de apertura', () => {
  it.each([
    ['10:00 a.m.', '10:30 a.m.'],
    ['11:45 AM', '12:15 PM'],
    ['12:40 p.m.', '1:10 p.m.'],
    ['09:30 am', '10:00 am'],
    ['14:00', '14:30'],
    ['10:00 a. m.', '10:30 a. m.'],
  ])('%s → %s', (antes, despues) => {
    expect(sumarMinutosAHora(antes, 30)?.replace(/^0/, '')).toBe(despues);
  });

  it('un texto que no es una hora no se inventa', () => {
    expect(sumarMinutosAHora('por definir', 30)).toBeNull();
    expect(sumarMinutosAHora(null, 30)).toBeNull();
  });
});

describe('Documentos de Fase 2', () => {
  const miembro = (areaRepresentacion: string) => ({
    areaRepresentacion,
    tipoMiembro: 'MIEMBRO_PRINCIPAL',
    nombreCompletoMiembro: `Nombre ${areaRepresentacion}`,
    cedulaMiembro: '1',
  });
  const expediente = {
    codigoNomenclatura: 'CA-001',
    descripcionObjeto: 'Objeto',
    ente: { nombre: 'Alcaldía de Prueba', direccionFiscal: 'Calle 1' },
    comision: {
      datosDesignacionComision: 'Gaceta 1',
      miembros: ['AREA_JURIDICA', 'AREA_TECNICA', 'AREA_ECONOMICA_FINANCIERA', 'SECRETARIO_A'].map(
        miembro,
      ),
    },
    fasePreparatoria: { horaActoRecepAper: '10:00 a.m.' },
    cronograma: { fechaActoRecepcionAperturaSobres: fecha('2026-03-11') },
    adquirientesPliego: [{ fechaAdquisicion: fecha('2026-03-04'), proveedor: null }],
  };
  const prisma = {
    expedienteContratacion: { findUnique: jest.fn().mockResolvedValue(expediente) },
  };
  const servicio = new GeneradorDocumentosService(prisma as never, {} as never, {} as never);

  it('el acta de apertura sale media hora después de la recepción', async () => {
    const apertura = render(
      'acta-apertura-sobres-template.docx',
      await servicio.getDatosActaAperturaSobres('e'),
    );
    expect(apertura).toContain('Siendo las 10:30 a.m.');
    const recepcion = render(
      'acta-recepcion-sobres-template.docx',
      await servicio.getDatosActaRecepcionSobres('e'),
    );
    expect(recepcion).toContain('Siendo las 10:00 a.m.');
    expect(recepcion).toContain('Nombre AREA_TECNICA');
  });

  it('el registro de adquirentes lleva el ente en el membrete', async () => {
    const texto = render(
      'registro-adquirentes-template.docx',
      await servicio.getDatosRegistroAdquirentes('e'),
    );
    expect(texto).toContain('Alcaldía de Prueba');
    expect(texto).not.toContain('undefined');
  });
});

describe('Requisitos preliminares del informe', () => {
  it('salen del recaudo consignado, con las marcas nuevas y las viejas', () => {
    const datos = mapOferentesDesierto(
      [
        {
          nombreProveedorOferente: 'A',
          evaluacion: {
            plantillasSnapshot: { legal: { items: [] } },
            hubLegal: {
              submitted: true,
              form: {
                items: {
                  modGarantiaMantenimientoOfertaAuAu: { consignado: 'SI' },
                  modDeclaracionCompromisoRespSocialAuAu: { consignado: 'NO' },
                },
              },
            },
            indVerificadoGarantia: null,
            indVerificadoCrs: true,
          },
        },
      ] as never,
      { incluirEvaluacion: false },
    );
    const [fila] = datos.requisitos_preliminares as Record<string, string>[];
    expect(fila.garantia_mantenimiento_oferta_au_au).toBe(fila.ind_verificado_garantia_au_au);
    expect(fila.garantia_mantenimiento_oferta_au_au).toMatch(/^S[IÍ]$/i);
    expect(fila.declaracion_compromiso_resp_social_au_au).toMatch(/^NO$/i);
  });
});

describe('Calificación legal: solo descalifica el Sobre 1', () => {
  function crear() {
    const item = (id: string, sobre: 1 | 2) => ({
      id,
      sobre,
      eliminatorio: true, // como en las plantillas ya congeladas
      etiquetaCorta: id,
      pregunta: id,
      personalizado: false,
    });
    const evaluacion = {
      id: 'ev',
      oferta: { expedienteId: 'exp', expediente: { enteId: 'e' } },
      plantillasSnapshot: {
        legal: {
          items: [
            item('rif', 1),
            item('modDeclaracionAutocalculoVanAuAu', 1),
            item('ofertaTecnicoEconomicaAuAu', 2),
          ],
        },
        promocion: null,
      },
    };
    const update = jest.fn();
    const prisma = {
      evaluacionResultados: { findFirst: jest.fn().mockResolvedValue(evaluacion), update },
      documentoGenerado: { updateMany: jest.fn() },
      pliegoGenerado: { updateMany: jest.fn() },
    };
    const prelacion = { recalcularPorExpediente: jest.fn() };
    const servicio = new HubService(prisma as never, {} as never, {} as never, prelacion as never);
    return { servicio, update, prisma };
  }
  const form = (rif: string, sobre2: string) =>
    ({
      items: {
        rif: { consignado: rif },
        modDeclaracionAutocalculoVanAuAu: { consignado: 'NO' },
        ofertaTecnicoEconomicaAuAu: { consignado: sobre2 },
      },
      justificacion: 'x'.repeat(4000),
    }) as never;
  const user = { id: 'u', enteId: 'e', rol: 'EJECUTOR' } as never;

  it('faltar un documento del Sobre 2 o el VAN no descalifica', async () => {
    const { servicio, update, prisma } = crear();
    await servicio.patchLegal('ev', 'confirm', form('SI', 'NO'), user);
    expect(update.mock.calls[0][0].data.oferenteCalificadoLegal).toBe(true);
    // Confirmar marca el informe, no el pliego.
    const tipos = prisma.documentoGenerado.updateMany.mock.calls[0][0].where.tipoDocumento.in;
    expect(tipos).toContain('INFORME_RECOMENDACION');
    expect(tipos).not.toContain('LISTA_COTEJO');
    expect(prisma.pliegoGenerado.updateMany).not.toHaveBeenCalled();
  });

  it('faltar uno del Sobre 1 sí', async () => {
    const { servicio, update } = crear();
    await servicio.patchLegal('ev', 'confirm', form('NO', 'SI'), user);
    expect(update.mock.calls[0][0].data.oferenteCalificadoLegal).toBe(false);
  });

  it('al guardar un borrador el hub queda en evaluación', async () => {
    const { servicio, update } = crear();
    await servicio.patchLegal('ev', 'draft', form('NO', 'SI'), user);
    expect(update.mock.calls[0][0].data.hubResultadoFinal).toBe('en_evaluacion');
  });
});

describe('Documentos desactualizados', () => {
  const cliente = () => ({
    documentoGenerado: { updateMany: jest.fn() },
    pliegoGenerado: { updateMany: jest.fn() },
  });

  it('la tabla del pliego solo se toca si el pliego depende del dato', async () => {
    const a = cliente();
    await marcarDesactualizados(a as never, 'e', ['ACTA_ADJUDICACION']);
    expect(a.pliegoGenerado.updateMany).not.toHaveBeenCalled();
    const b = cliente();
    await marcarDesactualizados(b as never, 'e');
    expect(b.pliegoGenerado.updateMany).toHaveBeenCalled();
    expect(b.documentoGenerado.updateMany.mock.calls[0][0].where.tipoDocumento).toBeUndefined();
  });

  it('guardar el modelo de contrato con las píldoras resueltas no cuenta como cambio', () => {
    const cuerpo = (html: string) => ({ clauses: [{ order: 1, titulo: 'A', cuerpoHtml: html }] });
    const crudo =
      '<p>{desc_objeto_contratacion_au_au}, {porcentaje_fiel_cumplimiento_au_au}% y [MONTO CONTRATO EN LETRAS]</p>';
    const resuelto = renderizarPildoras(
      crudo,
      { objeto_contratacion_au_au: 'Sillas', porcentaje_fiel_cumplimiento_au_au: '20%' },
      'RESOLVER',
    );
    const cambio = (a: object, b: object) =>
      huboCambios(modeloContratoComparable(a), modeloContratoComparable(b));
    expect(resuelto).not.toBe(crudo);
    expect(cambio(cuerpo(crudo), cuerpo(resuelto))).toBe(false);
    expect(cambio(cuerpo(crudo), cuerpo(resuelto.replace(' y ', ' más ')))).toBe(true);
  });

  it('solo un dictamen distinto desactualiza el informe', async () => {
    const guardado = {
      evaluacionId: 'ev',
      tipoDictamen: 'TOTAL',
      partidasAdjudicadasTotal: null,
      oferenteAdjudicadoProcedimiento: false,
      causaNoAdjudicado: 'Precio',
    };
    const prisma = {
      ...cliente(),
      expedienteContratacion: {
        findFirst: jest.fn().mockResolvedValue({
          enteId: 'e',
          caracterAdjudicacion: 'TOTAL',
          dictamenesAdjudicacion: [guardado],
        }),
      },
      evaluacionResultados: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ oferenteCalificado: true, posicionPrelacion: 'Segunda Opción' }),
      },
      dictamenAdjudicacion: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const servicio = new GestionAdjudicacionService(
      prisma as never,
      { sincronizarEstatus: jest.fn() } as never,
    );
    const user = { id: 'u', enteId: 'e', rol: 'EJECUTOR' } as never;
    await servicio.upsertDictamenNoAdjudicado('x', 'ev', { causaNoAdjudicadoAuAu: 'Precio' }, user);
    expect(prisma.documentoGenerado.updateMany).not.toHaveBeenCalled();
    await servicio.upsertDictamenNoAdjudicado('x', 'ev', { causaNoAdjudicadoAuAu: 'Plazo' }, user);
    expect(prisma.documentoGenerado.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('Cronograma de Acto Único', () => {
  const llamado = fecha('2026-03-02');
  const calcular = (tipo: 'BIENES' | 'SERVICIOS' | 'OBRAS', feriados: string[] = []) =>
    calcularActoUnico(tipo, llamado, feriados);

  it.each([
    ['BIENES', '2026-03-10', '2026-03-11', '2026-03-18', '2026-03-20', '2026-03-24'],
    ['SERVICIOS', '2026-03-12', '2026-03-13', '2026-03-24', '2026-03-27', '2026-03-31'],
    ['OBRAS', '2026-03-16', '2026-03-17', '2026-03-31', '2026-04-06', '2026-04-08'],
  ] as const)('%s: fechas según las reglas de QA', (tipo, fin, acto, ev, adj, notif) => {
    const c = calcular(tipo);
    expect(dia(c.fechaInicioDisponibilidadPliego)).toBe('2026-03-03');
    expect(dia(c.fechaSolicitudAclaratorias)).toBe('2026-03-05');
    expect(dia(c.fechaFinDisponibilidadPliego)).toBe(fin);
    expect(dia(c.fechaRespuestaAclaratorias)).toBe(fin);
    expect(dia(c.fechaActoRecepcionAperturaSobres)).toBe(acto);
    expect(dia(c.fechaLimiteEvaluacion)).toBe(ev);
    expect(dia(c.fechaLimiteAdjudicacion)).toBe(adj);
    expect(dia(c.fechaLimiteNotificacion)).toBe(notif);
    expect(validarActoUnico(tipo, c, [])).toEqual([]);
  });

  it('los feriados del ente corren las fechas', () => {
    const c = calcular('BIENES', ['03-03']);
    expect(dia(c.fechaInicioDisponibilidadPliego)).toBe('2026-03-04');
    expect(dia(c.fechaActoRecepcionAperturaSobres)).toBe('2026-03-12');
  });

  it('deja adelantar evaluación, adjudicación y notificación', () => {
    const c = {
      ...calcular('BIENES'),
      fechaLimiteEvaluacion: fecha('2026-03-12'),
      fechaLimiteAdjudicacion: fecha('2026-03-13'),
      fechaLimiteNotificacion: fecha('2026-03-16'),
    };
    expect(validarActoUnico('BIENES', c, [])).toEqual([]);
  });

  it('rechaza lo que se sale de los lapsos', () => {
    const base = calcular('BIENES');
    const con = (cambios: Partial<typeof base>) =>
      validarActoUnico('BIENES', { ...base, ...cambios }, []).join(' ');
    expect(con({ fechaActoRecepcionAperturaSobres: fecha('2026-03-10') })).toMatch(/mínimo/);
    expect(con({ fechaActoRecepcionAperturaSobres: fecha('2026-04-02') })).toMatch(/15 días/);
    expect(con({ fechaFinDisponibilidadPliego: fecha('2026-03-09') })).toMatch(/10\/03\/2026/);
    expect(con({ fechaLimiteNotificacion: fecha('2026-03-25') })).toMatch(/uno o dos días/);
    expect(con({ fechaLimiteAdjudicacion: fecha('2026-03-24') })).toMatch(/uno o dos días/);
    expect(
      con({
        fechaLimiteAdjudicacion: fecha('2026-03-24'),
        fechaLimiteNotificacion: fecha('2026-03-26'),
      }),
    ).toMatch(/9 días hábiles/);
  });
});

describe('Revertir la declaratoria de desierto', () => {
  function crear(expediente: object, evaluaciones = 0, cronogramas = 1) {
    const update = jest.fn().mockResolvedValue({});
    const prisma: Record<string, unknown> = {
      expedienteContratacion: { findFirst: jest.fn().mockResolvedValue(expediente), update },
      evaluacionResultados: { count: jest.fn().mockResolvedValue(evaluaciones) },
      cronogramaExpediente: { count: jest.fn().mockResolvedValue(cronogramas) },
      informeRecomendacion: { count: jest.fn().mockResolvedValue(0) },
      documentoGenerado: { updateMany: jest.fn() },
      pliegoGenerado: { updateMany: jest.fn() },
    };
    prisma.$transaction = (fn: (tx: unknown) => unknown) => fn(prisma);
    const servicio = new ExpedienteContratacionService(prisma as never, {} as never);
    return { servicio, update };
  }
  const desierto = { id: 'x', enteId: 'e', declaratoriaDesierto: true, selladoFase4At: null };

  it('vuelve al estatus guardado y limpia la causal', async () => {
    const { servicio, update } = crear({ ...desierto, estatusPrevioDesierto: 'EN_EVALUACION' });
    await servicio.revertirDesierto('x', 'u', 'e', 'EJECUTOR');
    expect(update.mock.calls[0][0].data).toMatchObject({
      declaratoriaDesierto: false,
      causalDeclaratoriaDesierto: null,
      estatusProceso: 'EN_EVALUACION',
    });
  });

  it.each([
    [2, 1, 'EN_EVALUACION'],
    [0, 1, 'EN_PREPARACION'],
    [0, 0, 'BORRADOR'],
  ])('sin estatus guardado lo deduce (%i, %i)', async (ev, cr, esperado) => {
    const { servicio, update } = crear({ ...desierto, estatusPrevioDesierto: null }, ev, cr);
    await servicio.revertirDesierto('x', 'u', 'otro-ente', 'UNIVERSITAS');
    expect(update.mock.calls[0][0].data.estatusProceso).toBe(esperado);
  });

  it('no se revierte lo cerrado en Fase 4, ni lo no desierto, ni lo de otro ente', async () => {
    const codigo = (p: Promise<unknown>) => p.catch((e: { status: number }) => e.status);
    const sellado = crear({ ...desierto, selladoFase4At: new Date() }).servicio;
    expect(await codigo(sellado.revertirDesierto('x', 'u', 'e', 'ADMIN_ENTE'))).toBe(409);
    const normal = crear({ ...desierto, declaratoriaDesierto: false }).servicio;
    expect(await codigo(normal.revertirDesierto('x', 'u', 'e', 'ADMIN_ENTE'))).toBe(400);
    const ajeno = crear(desierto).servicio;
    expect(await codigo(ajeno.revertirDesierto('x', 'u', 'otro', 'ADMIN_ENTE'))).toBe(400);
  });
});

describe('Adquirentes del pliego', () => {
  it('la fecha debe caer en la disponibilidad del pliego', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = {
      expedienteContratacion: { findFirst: jest.fn().mockResolvedValue({}) },
      cronogramaExpediente: {
        findFirst: jest.fn().mockResolvedValue({
          fechaInicioDisponibilidadPliego: fecha('2026-03-03'),
          fechaFinDisponibilidadPliego: fecha('2026-03-10'),
        }),
      },
      adquirentePliego: { create },
      documentoGenerado: { updateMany: jest.fn() },
    };
    const servicio = new AdquirentePliegoService(prisma as never, {} as never, {} as never);
    const guardar = (fechaAdquisicion: string) =>
      servicio.create({ expedienteId: 'x', fechaAdquisicion } as never, 'u', 'e');
    await expect(guardar('2026-03-02')).rejects.toThrow(/03\/03\/2026 y el 10\/03\/2026/);
    await expect(guardar('2026-03-11')).rejects.toThrow();
    await guardar('2026-03-03');
    await guardar('2026-03-10');
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('Cédulas', () => {
  it('editar sin tocar la cédula no la revisa, y no se repite en el formulario', () => {
    expect(cedulasNuevas(['V-1.234'], ['1234', '', undefined, '777'])).toEqual(['777']);
    expect(() => assertCedulasSinRepetir(['V-1.234', '1234'])).toThrow(/repetida/);
    expect(() => assertCedulasSinRepetir(['1', null, undefined, '2'])).not.toThrow();
  });
});

describe('Logo del manual', () => {
  it('Cloudinary lo entrega en PNG', () => {
    expect(logoComoPng('https://res.cloudinary.com/x/image/upload/v1/logo.webp')).toBe(
      'https://res.cloudinary.com/x/image/upload/f_png/v1/logo.webp',
    );
    expect(logoComoPng('https://otro.com/logo.png')).toBe('https://otro.com/logo.png');
  });
});

describe('Estado de los documentos', () => {
  const crear = (docs: object[]) => {
    const updateMany = jest.fn();
    const prisma = {
      documentoGenerado: { findMany: jest.fn().mockResolvedValue(docs), updateMany },
    };
    const servicio = new GeneradorDocumentosService(prisma as never, {} as never, {} as never);
    return { servicio, updateMany };
  };

  it('incluye Lista de Cotejo y Notificaciones; una desactualizada basta', async () => {
    const doc = (tipoDocumento: string, estaDesactualizado: boolean) => ({
      tipoDocumento,
      estaDesactualizado,
      urlArchivo: 'u',
    });
    const { servicio } = crear([
      doc('LISTA_COTEJO', false),
      doc('NOTIFICACION_NO_ADJUDICADO', true),
      doc('NOTIFICACION_NO_ADJUDICADO', false),
    ]);
    const estado = await servicio.getStatusPorExpediente('e');
    const de = (tipo: string) => estado.find((e) => e.tipo === tipo)!;
    expect(de('LISTA_COTEJO')).toMatchObject({ generado: true, estaDesactualizado: false });
    expect(de('NOTIFICACION_NO_ADJUDICADO')).toMatchObject({ estaDesactualizado: true });
    expect(de('NOTIFICACION_ADJUDICADO')).toMatchObject({ generado: false });
  });

  it('al regenerar retira la notificación de otro tipo que tenía el oferente', async () => {
    const { servicio, updateMany } = crear([]);
    jest
      .spyOn(servicio, 'getDatosNotificaciones')
      .mockResolvedValue([
        { tipoDocumento: 'NOTIFICACION_ADJUDICADO', evaluacionId: 'ev', tokens: {} },
      ] as never);
    jest.spyOn(servicio, 'generarDocumento').mockResolvedValue({ id: 'nuevo' } as never);
    await servicio.generarNotificacionesFase4('e', 'u');
    expect(updateMany.mock.calls[0][0].where.id).toEqual({ notIn: ['nuevo'] });
  });
});
