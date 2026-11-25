import { tokenPermitido } from '../auth/token-subida';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { CronogramaEnteService } from '../cronograma-ente/cronograma-ente.service';
import { hoyEnCaracas, ocurrenciasDelFeriado } from '../cronograma-ente/feriados.util';
import { ExpedienteContratacionService } from '../expediente-contratacion/expediente-contratacion.service';
import { calcularActoUnico } from '../expediente-contratacion/cronograma-acto-unico.util';
import { conTextosVigentes, SnapshotService } from '../evaluacion-fase3/hub/snapshot.service';
import { stripHtml } from '../generador-documentos/mappers/pliego-condiciones.mapper';
import { GeneradorDocumentosService } from '../generador-documentos/generador-documentos.service';
import { MaximaAutoridadService } from '../maxima-autoridad/maxima-autoridad.service';
import {
  conservarLetra,
  FORMATO_CEDULA,
  normalizarCedula,
} from '../proveedores/cedula-proveedor.util';
import { validarPdfs } from '../proveedores/validar-pdf.util';

const fecha = (texto: string) => new Date(`${texto}T00:00:00Z`);
const dia = (f: Date) => f.toISOString().split('T')[0];
const codigo = (p: Promise<unknown>) => p.catch((e: { status: number }) => e.status);

describe('Token de subida', () => {
  it('solo entra en sus rutas; el de sesión, en todas', () => {
    expect(tokenPermitido(undefined, 'GET', '/entes')).toBe(true);
    expect(tokenPermitido('subida', 'POST', '/proveedores')).toBe(true);
    expect(tokenPermitido('subida', 'PATCH', '/proveedores/:id')).toBe(true);
    expect(tokenPermitido('subida', 'GET', '/proveedores')).toBe(false);
    expect(tokenPermitido('subida', 'POST', '/auth/token-subida')).toBe(false);
    expect(tokenPermitido('otro', 'POST', '/proveedores')).toBe(false);
    expect(tokenPermitido(null, 'POST', '/proveedores')).toBe(false);
  });

  it('la estrategia lo rechaza fuera de ellas', () => {
    const estrategia = new JwtStrategy({} as never);
    const req = (method: string, path: string) => ({ method, route: { path } }) as never;
    const payload = { sub: 'u', rol: 'EJECUTOR', alcance: 'subida' };
    expect(() => estrategia.validate(req('GET', '/entes'), payload)).toThrow(/subir archivos/);
    expect(estrategia.validate(req('POST', '/proveedores'), payload).id).toBe('u');
  });
});

describe('Feriados: ocurrencias', () => {
  const fechas = [fecha('2026-12-21'), fecha('2027-01-20')];
  const recurrente = (mmdd: string) => ({ esRecurrente: true, fecha: null, fechaRecurrente: mmdd });
  const especifico = (f: string) => ({
    esRecurrente: false,
    fecha: fecha(f),
    fechaRecurrente: null,
  });

  it('cuenta solo lo que cae dentro del cronograma y era hábil', () => {
    const dias = (f: Parameters<typeof ocurrenciasDelFeriado>[0], extra: string[] = []) =>
      ocurrenciasDelFeriado(f, fechas, [
        f.esRecurrente ? f.fechaRecurrente! : dia(f.fecha!),
        ...extra,
      ]).map(dia);
    expect(dias(recurrente('01-01'))).toEqual(['2027-01-01']);
    expect(dias(recurrente('06-24'))).toEqual([]);
    expect(dias(especifico('2026-12-20'))).toEqual([]);
    expect(dias(especifico('2027-01-21'))).toEqual([]);
    expect(dias(especifico('2026-12-26'))).toEqual([]); // sábado
    expect(dias(especifico('2026-12-25'))).toEqual(['2026-12-25']);
    expect(dias(especifico('2026-12-25'), ['12-25'])).toEqual([]); // ya era feriado
    expect(dias(recurrente('02-29'))).toEqual([]);
  });

  it('el día en Caracas cambia a las 04:00 UTC', () => {
    expect(dia(hoyEnCaracas(new Date('2026-11-25T03:59:00Z')))).toBe('2026-11-24');
    expect(dia(hoyEnCaracas(new Date('2026-11-25T04:00:00Z')))).toBe('2026-11-25');
  });
});

describe('Feriados: cronogramas', () => {
  beforeAll(() => jest.useFakeTimers({ now: new Date('2026-02-01T12:00:00Z') }));
  afterAll(() => jest.useRealTimers());

  async function registrar(
    feriado: { esRecurrente: boolean; fecha: Date | null; fechaRecurrente: string | null },
    cronograma: object,
    estatusProceso = 'EN_PREPARACION',
  ) {
    const update = jest.fn();
    const alertas = jest.fn();
    const desactualizar = jest.fn();
    const prisma: Record<string, unknown> = {
      expedienteContratacion: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'x', estatusProceso, cronograma: { id: 'c', ...cronograma } }]),
      },
      diaNoLaborableEnte: { findMany: jest.fn().mockResolvedValue([feriado]) },
      cronogramaExpediente: { update },
      alertaCronograma: { createMany: alertas },
      documentoGenerado: { updateMany: desactualizar },
      pliegoGenerado: { updateMany: jest.fn() },
    };
    prisma.$transaction = (fn: (tx: unknown) => unknown) => fn(prisma);
    const servicio = new CronogramaEnteService(prisma as never);
    const conflictos = await servicio.detectarConflictos('e', { id: 'f', ...feriado });
    return { conflictos, update, alertas, desactualizar };
  }
  const el = (f: string) => ({ esRecurrente: false, fecha: fecha(f), fechaRecurrente: null });
  const base = calcularActoUnico('BIENES', fecha('2026-03-02'), []);

  it('uno dentro deja el cronograma igual al que se habría calculado con él', async () => {
    const { update, desactualizar, conflictos } = await registrar(el('2026-03-10'), base);
    const movidas = update.mock.calls[0][0].data;
    const esperado = calcularActoUnico('BIENES', fecha('2026-03-02'), ['2026-03-10']);
    for (const campo of Object.keys(esperado) as (keyof typeof esperado)[]) {
      expect([campo, dia(movidas[campo] ?? base[campo])]).toEqual([campo, dia(esperado[campo])]);
    }
    expect(movidas.fechaLlamadoParticipar).toBeUndefined();
    expect(desactualizar).toHaveBeenCalled();
    expect(conflictos[0].soloAviso).toBe(false);
  });

  it('uno recurrente de enero no toca un cronograma de marzo', async () => {
    const { conflictos, update } = await registrar(
      { esRecurrente: true, fecha: null, fechaRecurrente: '01-01' },
      base,
    );
    expect(conflictos).toEqual([]);
    expect(update).not.toHaveBeenCalled();
  });

  it('con el llamado publicado o en evaluación solo avisa', async () => {
    const yaLlamado = calcularActoUnico('BIENES', fecha('2026-01-30'), []);
    for (const r of [
      await registrar(el('2026-03-10'), base, 'EN_EVALUACION'),
      await registrar(el('2026-02-05'), yaLlamado),
    ]) {
      expect(r.conflictos[0].soloAviso).toBe(true);
      expect(r.update.mock.calls[0][0].data).toEqual({ tieneConflictoFestivo: true });
      expect(r.alertas).toHaveBeenCalled();
      expect(r.desactualizar).not.toHaveBeenCalled();
    }
  });

  it('un cronograma ya terminado no se toca', async () => {
    const viejo = calcularActoUnico('BIENES', fecha('2024-06-03'), []);
    const { conflictos } = await registrar(el('2024-06-10'), viejo);
    expect(conflictos).toEqual([]);
  });
});

describe('Expediente', () => {
  function servicioCon(expediente: object, ofertas = 0, informes = 0) {
    const docs = jest.fn();
    const prisma: Record<string, unknown> = {
      expedienteContratacion: {
        findFirst: jest.fn().mockResolvedValue(expediente),
        update: jest.fn().mockResolvedValue({}),
      },
      ofertaPresentada: { count: jest.fn().mockResolvedValue(ofertas) },
      evaluacionResultados: { count: jest.fn().mockResolvedValue(0) },
      cronogramaExpediente: { count: jest.fn().mockResolvedValue(1) },
      informeRecomendacion: { count: jest.fn().mockResolvedValue(informes) },
      documentoGenerado: { updateMany: docs },
      pliegoGenerado: { updateMany: jest.fn() },
    };
    prisma.$transaction = (fn: (tx: unknown) => unknown) => fn(prisma);
    return { servicio: new ExpedienteContratacionService(prisma as never, {} as never), docs };
  }
  const exp = {
    id: 'x',
    enteId: 'e',
    declaratoriaDesierto: false,
    estatusProceso: 'EN_EVALUACION',
  };
  const declarar = (causal: string, ofertas: number) =>
    codigo(
      servicioCon(exp, ofertas).servicio.declararDesierto(
        'x',
        { causalDeclaratoriaDesierto: causal, justificacionDeclaratoriaDesierto: 'j' },
        'u',
        'e',
        'EJECUTOR',
      ),
    );

  it('«ninguna oferta» no vale con ofertas registradas; las otras causales sí', async () => {
    const primera = '1. Ninguna oferta haya sido presentada.';
    expect(await declarar(primera, 2)).toBe(400);
    expect(await declarar(primera, 0)).toHaveProperty('message');
    expect(await declarar('2. Todas las ofertas resulten rechazadas', 2)).toHaveProperty('message');
  });

  it('al revertir retira el informe de desierto y conserva el de adjudicación', async () => {
    for (const [informes, filtro] of [
      [0, undefined],
      [1, false],
    ] as const) {
      const { servicio, docs } = servicioCon({ ...exp, declaratoriaDesierto: true }, 0, informes);
      await servicio.revertirDesierto('x', 'u', 'e', 'EJECUTOR');
      const { where, data } = docs.mock.calls[0][0];
      expect(where.tipoDocumento).toBe('INFORME_RECOMENDACION');
      expect(where.estaDesactualizado).toBe(filtro);
      expect(data.deletedAt).toBeInstanceOf(Date);
    }
  });
});

describe('Rúbrica y recaudos', () => {
  it('las evaluaciones iniciadas muestran la fórmula vigente y conservan sus rangos', () => {
    const viejo = {
      id: 'solvencia',
      kind: 'indice',
      titulo: 'viejo',
      pregunta: 'vieja',
      aspectoHint: 'Activo total entre pasivo total',
      rangos: { rangoMaximo: 9 },
    };
    const r = conTextosVigentes({
      financiera: { puntuacionMinima: 40, criterios: [viejo] },
    } as never);
    expect(r.financiera.criterios[0]).toMatchObject({
      aspectoHint: 'Activo circulante entre pasivo circulante',
      rangos: { rangoMaximo: 9 },
    });
    expect(r.financiera.puntuacionMinima).toBe(40);
  });

  it('la pregunta del recaudo personalizado conserva las mayúsculas', async () => {
    const fase = {
      calificacionLegalData: {
        personalizados: [{ exigido: true, sobre: 1, descripcion: 'Certificado del SENIAT' }],
      },
    };
    const prisma = { fasePreparatoria: { findUnique: jest.fn().mockResolvedValue(fase) } };
    const r = await new SnapshotService(prisma as never).construir('x');
    expect(r.legal.items[0].pregunta).toBe('¿Consignó Certificado del SENIAT?');
  });
});

describe('Generación de documentos', () => {
  const anterior = { id: 'd', urlArchivo: '/uploads/a.docx', versionDocumento: 3 };
  function crear() {
    const orden: string[] = [];
    const prisma: Record<string, unknown> = {
      documentoGenerado: {
        findFirst: jest.fn().mockResolvedValue(anterior),
        deleteMany: jest.fn(() => orden.push('borrar registro')),
        create: jest.fn((a: { data: object }) => {
          orden.push('crear');
          return { id: 'n', ...a.data };
        }),
      },
    };
    prisma.$transaction = (fn: (tx: unknown) => unknown) => fn(prisma);
    const storage = { deleteFile: jest.fn(() => orden.push('borrar archivo')) };
    const servicio = Object.create(GeneradorDocumentosService.prototype);
    Object.assign(servicio, { prisma, storage });
    return { servicio, orden };
  }
  const generar = (s: { generarDocumento: (...a: unknown[]) => Promise<unknown> }) =>
    s.generarDocumento('x', 'ACTA_INICIO', 't.docx', 'u', {});

  it('si la generación falla conserva el documento anterior', async () => {
    const { servicio, orden } = crear();
    servicio.renderizarYSubir = jest.fn().mockRejectedValue(new Error('fallo'));
    await expect(generar(servicio)).rejects.toThrow('fallo');
    expect(orden).toEqual([]);
  });

  it('borra el archivo anterior solo al final', async () => {
    const { servicio, orden } = crear();
    servicio.renderizarYSubir = jest.fn().mockResolvedValue({ fileUrl: 'u', fileName: 'f' });
    await generar(servicio);
    expect(orden).toEqual(['borrar registro', 'crear', 'borrar archivo']);
  });

  it('decodifica los caracteres de las cláusulas', () => {
    expect(stripHtml('<p>Robles &amp; Asociados&nbsp;&quot;RA&quot; &lt;5%&gt; d&#39;Or</p>')).toBe(
      'Robles & Asociados "RA" <5%> d\'Or',
    );
  });
});

describe('Delegado de la máxima autoridad', () => {
  const guardada = {
    id: 'a',
    enteId: 'e',
    cedulaAutoridad: 'V-1111111',
    cedulaDelegado: 'V-2222222',
  };
  const actualizar = (esDelegado: boolean, dto: object) => {
    const prisma = {
      maximaAutoridad: {
        findFirst: jest.fn().mockResolvedValue({ ...guardada, esDelegado }),
        update: jest.fn().mockResolvedValue('ok'),
      },
      expedienteContratacion: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const manuales = { marcarManualDesactualizado: jest.fn() };
    return codigo(
      new MaximaAutoridadService(prisma as never, manuales as never).update(
        'a',
        dto as never,
        'e',
        'u',
      ),
    );
  };

  it('sin delegado, quien lo era puede ser la autoridad', async () => {
    expect(await actualizar(true, { esDelegado: false, cedulaAutoridad: 'V-2222222' })).toBe('ok');
    expect(await actualizar(false, { cedulaAutoridad: 'V-2222222' })).toBe('ok');
  });

  it('con delegado siguen sin poder repetirse', async () => {
    expect(await actualizar(true, { cedulaAutoridad: 'V-2222222' })).toBe(400);
    expect(await actualizar(false, { esDelegado: true, cedulaDelegado: 'V-1111111' })).toBe(400);
    expect(await actualizar(true, { nombreCompletoAutoridad: 'Otro' })).toBe('ok');
  });
});

describe('Proveedores', () => {
  it('la cédula acepta letra o solo números', () => {
    expect(normalizarCedula('v12.345.678')).toBe('V-12345678');
    expect(normalizarCedula('E-81234567')).toBe('E-81234567');
    expect(normalizarCedula('12345678')).toBe('12345678');
    expect(normalizarCedula('')).toBeUndefined();
    expect(FORMATO_CEDULA.test('V-12345678')).toBe(true);
    expect(FORMATO_CEDULA.test('X-123')).toBe(false);
    expect(FORMATO_CEDULA.test('abc')).toBe(false);
  });

  it('la misma cédula sin letra no borra la letra registrada', () => {
    expect(conservarLetra('81234567', 'E-81234567')).toBe('E-81234567');
    expect(conservarLetra('1234567', 'E-81234567')).toBe('1234567');
    expect(conservarLetra('V-81234567', 'E-81234567')).toBe('V-81234567');
  });

  it('dice qué archivo no es PDF', () => {
    const archivo = (originalname: string, texto: string) => [
      { originalname, buffer: Buffer.from(texto) },
    ];
    expect(() => validarPdfs({ doc_rif: archivo('rif.pdf', '%PDF-1.7') })).not.toThrow();
    expect(() => validarPdfs(undefined)).not.toThrow();
    expect(() =>
      validarPdfs({
        doc_rif: archivo('rif.pdf', '%PDF-1.7'),
        doc_rnc: archivo('rnc.pdf', 'hola'),
      }),
    ).toThrow('Este archivo no es un PDF válido: «rnc.pdf».');
  });
});
