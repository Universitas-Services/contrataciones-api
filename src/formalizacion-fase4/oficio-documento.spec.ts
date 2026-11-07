import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { alcanceDe } from './alcance-oferente.util';
import { DecaimientoService } from './decaimiento.service';
import { mapDatosCiclo } from './documentos-fase4.mapper';

const EXPEDIENTE = {
  codigoNomenclatura: 'CA-001-2026',
  descripcionObjeto: 'Adquisición de insumos',
  ente: { nombre: 'GOBERNACIÓN', rif: 'G-1', ciudad: 'Los Teques' },
  fasePreparatoria: { porcentajeFielCumplimiento: 10 },
  cronograma: { fechaLimiteAdjudicacion: new Date('2026-10-01T00:00:00.000Z') },
};

const CICLO = {
  numeroCiclo: 1,
  caracterSnapshot: 'TOTAL',
  decision: 'SUBSIGUIENTE',
  causalDecaimiento: 'NO FIRMÓ CONTRATO',
  fechaNotificacionAdjudicacionIncumplidor: new Date('2026-10-13T00:00:00.000Z'),
  fechaCertificacionIncumplimiento: new Date('2026-10-26T00:00:00.000Z'),
  fechaVencimientoGarantias: null,
  fechaVencimientoFirmaContrato: null,
  alcanceReadjudicacionParcial: null,
  montoReadjudicadoParcialBs: null,
  montoReadjudicadoBs: 1000000,
  plazoEjecucionSubsiguiente: 75,
  modalidadDegradadaSugerida: null,
  renglonesAfectadosDecaimiento: null,
  numResolucionDecaimiento: 'RESOL-045-2026',
  fechaResolucionDecaimiento: new Date('2026-10-27T00:00:00.000Z'),
  numOficioNotificacionDecaimiento: 'OF-112-2026',
  fechaOficioNotificacionDecaimiento: new Date('2026-10-28T00:00:00.000Z'),
  infractor: {
    nombreProveedorEvaluado: 'ALFA, C.A.',
    rifProveedorEvaluado: 'J-1',
    nombreRepLegalEvaluado: 'Ana Rojas',
  },
  subsiguiente: null,
};

const FIRMAS = {
  nom_completo_autoridad: 'María Pérez',
  nom_completo_delegado: '',
  cargo_oficial_autoridad: 'Gobernadora',
  cargo_oficial_delegado: '',
  datos_designacion_autoridad: 'Decreto N° 1',
  datos_designacion_delegado: '',
};

function oficio(ciclo: typeof CICLO, alcanceInfractor: string | null = null) {
  const plantilla = path.join(
    __dirname,
    '../generador-documentos/templates/notificacion-decaimiento-template.docx',
  );
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(plantilla, 'binary')), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });
  doc.render(
    mapDatosCiclo({
      expediente: EXPEDIENTE,
      ciclo,
      destinatario: null,
      alcanceInfractor,
      firmas: FIRMAS,
    }),
  );
  return (doc.getZip().file('word/document.xml')?.asText() ?? '').replace(/<[^>]+>/g, '');
}

const PARCIAL = { ...CICLO, caracterSnapshot: 'PARCIAL' };

describe('oficio de notificación de decaimiento con la plantilla real', () => {
  it.each([
    ['TOTAL', CICLO, null],
    ['PARCIAL', PARCIAL, '6 al 9'],
  ])('%s no deja marcas sin reemplazar', (_nombre, ciclo, alcance) => {
    const texto = oficio(ciclo, alcance);
    expect(texto).not.toMatch(/\{[^}]*\}/);
    expect(texto).not.toContain('undefined');
  });

  it('llena encabezado, destinatario y antecedentes', () => {
    const texto = oficio(CICLO);
    expect(texto).toContain('OFICIO N°: OF-112-2026');
    expect(texto).toContain('Los Teques, 28 de octubre de 2026');
    expect(texto).toContain('Ana Rojas');
    expect(texto).toContain('ALFA, C.A.');
    expect(texto).toContain('en fecha 26 de octubre de 2026');
    expect(texto).toContain('Resolución N° RESOL-045-2026');
  });

  it('TOTAL no menciona renglones', () => {
    const texto = oficio(CICLO);
    expect(texto).toContain(
      'DECAIMIENTO DE LA ADJUDICACIÓN TOTAL otorgada a su representada el pasado 1 de octubre de 2026.',
    );
    expect(texto).not.toContain('renglones o ítems');
  });

  it('PARCIAL se limita a los renglones del infractor', () => {
    const texto = oficio(PARCIAL, '6 al 9');
    expect(texto).toContain('DECAIMIENTO DE LA ADJUDICACIÓN PARCIAL otorgada');
    expect(texto).toContain('correspondiente a los renglones o ítems N° 6 al 9.');
    expect(texto).not.toContain('ADJUDICACIÓN TOTAL');
  });
});

describe('alcanceDe', () => {
  it('suma lo que el oferente asumió en ciclos cerrados', () => {
    const ciclos = [
      {
        decision: 'SUBSIGUIENTE',
        subsiguienteEvaluacionId: 'eva-1',
        alcanceReadjudicacionParcial: '6 al 9',
      },
      {
        decision: 'SUBSIGUIENTE',
        subsiguienteEvaluacionId: 'eva-2',
        alcanceReadjudicacionParcial: '10',
      },
    ];
    expect(alcanceDe('eva-1', { alcanceAdjudicacionParcial: '1 al 5' }, ciclos)).toBe(
      '1 al 5; 6 al 9',
    );
  });
});

describe('DecaimientoService.notificarInfractor', () => {
  const DTO = {
    numOficioNotificacionDecaimiento: 'OF-112-2026',
    fechaOficioNotificacionDecaimiento: '2026-10-28',
  };
  const USUARIO = { id: 'u-1' } as never;

  function crear() {
    const tx = {
      decaimientoFase4: { update: jest.fn().mockResolvedValue({}) },
      documentoGenerado: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      decaimientoFase4: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ciclo-1',
          infractorEvaluacionId: 'eva-1',
          resolucionGeneradaAt: new Date('2026-10-27T00:00:00.000Z'),
          fechaResolucionDecaimiento: new Date('2026-10-27T00:00:00.000Z'),
        }),
      },
      $transaction: jest.fn((fn: (cliente: typeof tx) => unknown) => fn(tx)),
    };
    const fase4 = {
      cargarExpediente: jest.fn().mockResolvedValue({ selladoFase4At: null }),
      assertNoSellado: jest.fn(),
      getEstado: jest.fn().mockResolvedValue({}),
    };
    const documentos = { completarPendientes: jest.fn().mockResolvedValue({}) };
    const servicio = new DecaimientoService(prisma as never, fase4 as never, documentos as never);
    return { servicio, tx };
  }

  it('guarda el oficio y deja sin vigencia el anterior', async () => {
    const { servicio, tx } = crear();
    await servicio.notificarInfractor('exp-1', DTO, USUARIO);

    expect(tx.decaimientoFase4.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numOficioNotificacionDecaimiento: 'OF-112-2026',
          fechaOficioNotificacionDecaimiento: new Date('2026-10-28T00:00:00.000Z'),
        }),
      }),
    );
    expect(tx.documentoGenerado.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estaDesactualizado: true } }),
    );
    expect(tx.documentoGenerado.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.documentoGenerado.create.mock.invocationCallOrder[0],
    );
  });

  it('acepta la misma fecha de la resolución', async () => {
    const { servicio, tx } = crear();
    await servicio.notificarInfractor(
      'exp-1',
      { ...DTO, fechaOficioNotificacionDecaimiento: '2026-10-27' },
      USUARIO,
    );
    expect(tx.documentoGenerado.create).toHaveBeenCalled();
  });

  it('rechaza una fecha anterior a la resolución', async () => {
    const { servicio, tx } = crear();
    await expect(
      servicio.notificarInfractor(
        'exp-1',
        { ...DTO, fechaOficioNotificacionDecaimiento: '2026-10-26' },
        USUARIO,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(tx.documentoGenerado.create).not.toHaveBeenCalled();
  });
});
