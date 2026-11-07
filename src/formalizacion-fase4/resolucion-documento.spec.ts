import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { DecaimientoService } from './decaimiento.service';
import { mapDatosCiclo } from './documentos-fase4.mapper';

const EXPEDIENTE = {
  codigoNomenclatura: 'CA-001-2026',
  descripcionObjeto: 'Adquisición de insumos',
  ente: { nombre: 'GOBERNACIÓN', rif: 'G-1', ciudad: 'Los Teques' },
  fasePreparatoria: { porcentajeFielCumplimiento: 10 },
  cronograma: {
    fechaLimiteAdjudicacion: new Date('2026-10-01T00:00:00.000Z'),
    fechaLimiteEvaluacion: new Date('2026-09-20T00:00:00.000Z'),
  },
  comision: { datosDesignacionComision: 'Resolución N° 10', miembros: [] },
};

const CICLO = {
  numeroCiclo: 1,
  caracterSnapshot: 'TOTAL',
  decision: 'SUBSIGUIENTE',
  causalDecaimiento: 'NO FIRMÓ CONTRATO',
  fechaNotificacionAdjudicacionIncumplidor: new Date('2026-10-13T00:00:00.000Z'),
  fechaCertificacionIncumplimiento: new Date('2026-10-26T00:00:00.000Z'),
  fechaVencimientoGarantias: new Date('2026-10-20T00:00:00.000Z'),
  fechaVencimientoFirmaContrato: new Date('2026-10-23T00:00:00.000Z'),
  alcanceReadjudicacionParcial: null as string | null,
  montoReadjudicadoParcialBs: null as number | null,
  montoReadjudicadoBs: 1000000 as number | null,
  plazoEjecucionSubsiguiente: 75,
  modalidadDegradadaSugerida: null as string | null,
  renglonesAfectadosDecaimiento: null as string | null,
  numResolucionDecaimiento: 'RESOL-045-2026',
  fechaResolucionDecaimiento: new Date('2026-10-27T00:00:00.000Z'),
  infractor: { nombreProveedorEvaluado: 'ALFA, C.A.', rifProveedorEvaluado: 'J-1' },
  subsiguiente: { nombreProveedorEvaluado: 'GAMMA, C.A.', rifProveedorEvaluado: 'J-3' } as {
    nombreProveedorEvaluado: string;
    rifProveedorEvaluado: string;
  } | null,
};

const FIRMAS = {
  nom_completo_autoridad: 'María Pérez',
  nom_completo_delegado: '',
  cargo_oficial_autoridad: 'Gobernadora',
  cargo_oficial_delegado: '',
  datos_designacion_autoridad: 'Decreto N° 1',
  datos_designacion_delegado: '',
};

function resolucion(ciclo: typeof CICLO) {
  const plantilla = path.join(
    __dirname,
    '../generador-documentos/templates/resolucion-decaimiento-template.docx',
  );
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(plantilla, 'binary')), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });
  doc.render(mapDatosCiclo({ expediente: EXPEDIENTE, ciclo, destinatario: null, firmas: FIRMAS }));
  return (doc.getZip().file('word/document.xml')?.asText() ?? '').replace(/<[^>]+>/g, '');
}

const TOTAL_SUBSIGUIENTE = CICLO;
const PARCIAL_SUBSIGUIENTE = {
  ...CICLO,
  caracterSnapshot: 'PARCIAL',
  montoReadjudicadoBs: null,
  montoReadjudicadoParcialBs: 400000,
  alcanceReadjudicacionParcial: '6 al 9',
};
const TOTAL_DESIERTO = {
  ...CICLO,
  decision: 'DESIERTO',
  subsiguiente: null,
  montoReadjudicadoBs: null,
  modalidadDegradadaSugerida: 'Consulta de Precios (Art. 96 LCP)',
};
const PARCIAL_DESIERTO = {
  ...TOTAL_DESIERTO,
  caracterSnapshot: 'PARCIAL',
  renglonesAfectadosDecaimiento: '6 al 9',
};

describe('resolución de decaimiento con la plantilla real', () => {
  it.each([
    ['TOTAL subsiguiente', TOTAL_SUBSIGUIENTE],
    ['PARCIAL subsiguiente', PARCIAL_SUBSIGUIENTE],
    ['TOTAL desierto', TOTAL_DESIERTO],
    ['PARCIAL desierto', PARCIAL_DESIERTO],
  ])('%s no deja marcas sin reemplazar', (_nombre, ciclo) => {
    const texto = resolucion(ciclo);
    expect(texto).not.toMatch(/\{[^}]*\}/);
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('Bs. Bs.');
  });

  it('llena encabezado, vistos y firma', () => {
    const texto = resolucion(TOTAL_SUBSIGUIENTE);
    expect(texto).toContain('RESOLUCIÓN N° RESOL-045-2026');
    expect(texto).toContain('Los Teques, 27 de octubre de 2026');
    expect(texto).toContain('Quien suscribe, María Pérez, en mi carácter de Gobernadora');
    expect(texto).toContain('de GOBERNACIÓN, designado(a) mediante Decreto N° 1');
    expect(texto).toContain('a favor de la empresa ALFA, C.A. RIF J-1');
  });

  it('con subsiguiente cita el orden de prelación y adjudica', () => {
    const texto = resolucion(TOTAL_SUBSIGUIENTE);
    expect(texto).toContain('El Informe de Recomendación de fecha 20 de septiembre de 2026');
    expect(texto).toContain('OTORGAR LA ADJUDICACIÓN SUBSIGUIENTE TOTAL');
    expect(texto).toContain('GAMMA, C.A., RIF J-3');
    expect(texto).toContain('Bs. 1.000.000,00');
    expect(texto).toContain('facultada para otorgar de forma inmediata');
    expect(texto).not.toContain('NO EXISTEN OTRAS OFERTAS');
    expect(texto).not.toContain('DECLARAR DESIERTO');
  });

  it('PARCIAL con subsiguiente lleva renglones y monto', () => {
    const texto = resolucion(PARCIAL_SUBSIGUIENTE);
    expect(texto).toContain('SUBSIGUIENTE PARCIAL de los renglones N° 6 al 9');
    expect(texto).toContain('Bs. 400.000,00');
    expect(texto).not.toContain('SUBSIGUIENTE TOTAL');
  });

  it('TOTAL desierto declara desierto y no adjudica', () => {
    const texto = resolucion(TOTAL_DESIERTO);
    expect(texto).toContain('para asumir el objeto de la contratación');
    expect(texto).toContain('DECLARAR DESIERTO el procedimiento');
    expect(texto).toContain('Consulta de Precios (Art. 96 LCP)');
    expect(texto).not.toContain('OTORGAR LA ADJUDICACIÓN SUBSIGUIENTE');
    expect(texto).not.toContain('facultada para otorgar de forma inmediata');
  });

  it('PARCIAL desierto se limita a los renglones afectados', () => {
    const texto = resolucion(PARCIAL_DESIERTO);
    expect(texto).toContain('renglones o ítems liberados tras el decaimiento');
    expect(texto).toContain('DECLARAR DESIERTO PARCIALMENTE');
    expect(texto).toContain('renglones o ítems N° 6 al 9');
    expect(texto).not.toContain('DECLARAR DESIERTO el procedimiento');
  });
});

describe('DecaimientoService.elegirDecision', () => {
  function crear(candidatos: unknown[], caracterSnapshot = 'TOTAL') {
    const update = jest.fn().mockResolvedValue({});
    const fase4 = {
      cargarExpediente: jest.fn().mockResolvedValue({ selladoFase4At: null }),
      assertNoSellado: jest.fn(),
      getEstado: jest.fn().mockResolvedValue({ candidatosSubsiguientes: candidatos }),
    };
    const prisma = {
      decaimientoFase4: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'ciclo-1', certificadoGeneradoAt: null, caracterSnapshot }),
        update,
      },
    };
    const servicio = new DecaimientoService(prisma as never, fase4 as never, {} as never);
    return { servicio, update };
  }

  const USUARIO = { id: 'u-1' } as never;

  it('en PARCIAL permite DESIERTO aunque haya otros adjudicados', async () => {
    const { servicio, update } = crear([{ evaluacionId: 'eva-2' }], 'PARCIAL');
    await servicio.elegirDecision('exp-1', { decision: 'DESIERTO' }, USUARIO);
    expect(update).toHaveBeenCalled();
  });

  it('en TOTAL rechaza DESIERTO si quedan oferentes en reserva', async () => {
    const { servicio, update } = crear([{ evaluacionId: 'eva-2' }]);
    await expect(
      servicio.elegirDecision('exp-1', { decision: 'DESIERTO' }, USUARIO),
    ).rejects.toThrow(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('acepta DESIERTO sin oferentes en reserva', async () => {
    const { servicio, update } = crear([]);
    await servicio.elegirDecision('exp-1', { decision: 'DESIERTO' }, USUARIO);
    expect(update).toHaveBeenCalled();
  });

  it('sigue rechazando SUBSIGUIENTE sin oferentes en reserva', async () => {
    const { servicio } = crear([]);
    await expect(
      servicio.elegirDecision('exp-1', { decision: 'SUBSIGUIENTE' }, USUARIO),
    ).rejects.toThrow(BadRequestException);
  });
});
