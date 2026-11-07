import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { partidasDeOferente } from './alcance-oferente.util';
import { DecaimientoService } from './decaimiento.service';
import { mapDatosCiclo } from './documentos-fase4.mapper';

const EXPEDIENTE = {
  codigoNomenclatura: 'CA-001-2026',
  descripcionObjeto: 'Adquisición de insumos',
  ente: { nombre: 'GOBERNACIÓN', rif: 'G-1', ciudad: 'Los Teques' },
  fasePreparatoria: {
    porcentajeFielCumplimiento: 10,
    requiereGarantiaLaboral: true,
    porcentajeGarantiaLaboral: 12.5,
  },
  cronograma: {
    fechaLimiteAdjudicacion: new Date('2026-10-01T00:00:00.000Z'),
    fechaLimiteEvaluacion: new Date('2026-09-20T00:00:00.000Z'),
  },
  comision: {
    datosDesignacionComision: 'Resolución N° 10',
    miembros: [
      {
        areaRepresentacion: 'SECRETARIO_A',
        tipoMiembro: 'MIEMBRO_PRINCIPAL',
        nombreCompletoMiembro: 'Luisa Díaz',
        cedulaMiembro: 'V-1',
      },
    ],
  },
};

const SIN_LABORAL = {
  ...EXPEDIENTE,
  fasePreparatoria: { ...EXPEDIENTE.fasePreparatoria, requiereGarantiaLaboral: false },
};

const CICLO = {
  numeroCiclo: 1,
  caracterSnapshot: 'TOTAL',
  decision: 'SUBSIGUIENTE',
  causalDecaimiento: 'NO FIRMÓ CONTRATO',
  fechaNotificacionAdjudicacionIncumplidor: null,
  fechaCertificacionIncumplimiento: null,
  fechaVencimientoGarantias: null,
  fechaVencimientoFirmaContrato: null,
  alcanceReadjudicacionParcial: null as string | null,
  montoReadjudicadoParcialBs: null as number | null,
  montoReadjudicadoBs: 1000000 as number | null,
  plazoEjecucionSubsiguiente: 75,
  modalidadDegradadaSugerida: null as string | null,
  renglonesAfectadosDecaimiento: null as string | null,
  numResolucionDecaimiento: 'RESOL-045-2026',
  fechaResolucionDecaimiento: new Date('2026-10-27T00:00:00.000Z'),
  numNotificacionAdjudicacionSubsiguiente: 'NOT-045-2026',
  fechaNotificacionAdjudicacionSubsiguiente: new Date('2026-10-29T00:00:00.000Z'),
  numNotificacionFinProceso: 'AVISO-012-2026',
  fechaNotificacionFinProceso: new Date('2026-10-30T00:00:00.000Z'),
  infractor: { nombreProveedorEvaluado: 'ALFA, C.A.', rifProveedorEvaluado: 'J-1' },
  subsiguiente: {
    nombreProveedorEvaluado: 'GAMMA, C.A.',
    rifProveedorEvaluado: 'J-3',
    nombreRepLegalEvaluado: 'Pedro Gil',
  } as {
    nombreProveedorEvaluado: string;
    rifProveedorEvaluado: string;
    nombreRepLegalEvaluado: string;
  } | null,
};

const SUB_PARCIAL = {
  ...CICLO,
  caracterSnapshot: 'PARCIAL',
  montoReadjudicadoBs: null,
  montoReadjudicadoParcialBs: 400000,
  alcanceReadjudicacionParcial: '6 al 9',
};
const DESIERTO_TOTAL = {
  ...CICLO,
  decision: 'DESIERTO',
  subsiguiente: null,
  montoReadjudicadoBs: null,
  modalidadDegradadaSugerida: 'Consulta de Precios',
};
const DESIERTO_PARCIAL = {
  ...DESIERTO_TOTAL,
  caracterSnapshot: 'PARCIAL',
  renglonesAfectadosDecaimiento: '6 al 9',
};

function render(
  plantilla: string,
  ciclo: typeof CICLO,
  expediente: typeof EXPEDIENTE = EXPEDIENTE,
): { texto: string; parrafos: string[] } {
  const ruta = path.join(__dirname, '../generador-documentos/templates', plantilla);
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(ruta, 'binary')), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });
  doc.render(
    mapDatosCiclo({
      expediente,
      ciclo,
      destinatario: null,
      alcanceInfractor: '1 al 9',
      partidasLiberadas: '4.02.01',
      firmas: {
        nom_completo_autoridad: 'María Pérez',
        nom_completo_delegado: '',
        cargo_oficial_autoridad: 'Gobernadora',
        cargo_oficial_delegado: '',
        datos_designacion_autoridad: 'Decreto N° 1',
        datos_designacion_delegado: '',
      },
    }),
  );
  const xml = doc.getZip().file('word/document.xml')?.asText() ?? '';
  return {
    texto: xml.replace(/<[^>]+>/g, ''),
    parrafos: xml.split('</w:p>').map((p) => p.replace(/<[^>]+>/g, '').trim()),
  };
}

const SUBSIGUIENTE = 'notificacion-adjudicacion-subsiguiente-template.docx';
const AVISO = 'notificacion-fin-procedimiento-template.docx';

describe('notificación de adjudicación subsiguiente con la plantilla real', () => {
  it.each([
    ['TOTAL con laboral', CICLO, EXPEDIENTE],
    ['TOTAL sin laboral', CICLO, SIN_LABORAL],
    ['PARCIAL con laboral', SUB_PARCIAL, EXPEDIENTE],
    ['PARCIAL sin laboral', SUB_PARCIAL, SIN_LABORAL],
  ])('%s no deja marcas sin reemplazar', (_nombre, ciclo, expediente) => {
    const { texto } = render(SUBSIGUIENTE, ciclo, expediente);
    expect(texto).not.toMatch(/\{[^}]*\}/);
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('Bs. Bs.');
  });

  it('llena encabezado, destinatario y condiciones', () => {
    const { texto } = render(SUBSIGUIENTE, CICLO);
    expect(texto).toContain('NOTIFICACIÓN N°: NOT-045-2026');
    expect(texto).toContain('Los Teques, 29 de octubre de 2026');
    expect(texto).toContain('Pedro Gil');
    expect(texto).toContain('GAMMA, C.A.');
    expect(texto).toContain('Informe de Recomendación de fecha 20 de septiembre de 2026');
    expect(texto).toContain('Objeto Adjudicado: Adjudicación Total de la contratación.');
    expect(texto).toContain('Bs. 1.000.000,00');
    expect(texto).toContain('4.02.01');
    expect(texto).toContain('75 días hábiles');
    expect(texto).toContain('Garantía de Fiel Cumplimiento (10%): Bs. 16.000,00');
  });

  it('PARCIAL lleva los renglones readjudicados', () => {
    const { texto } = render(SUBSIGUIENTE, SUB_PARCIAL);
    expect(texto).toContain(
      'correspondiente única y exclusivamente a los renglones/ítems N° 6 al 9.',
    );
    expect(texto).not.toContain('Adjudicación Total');
  });

  it('la garantía laboral solo sale si Fase 1 la exige', () => {
    expect(render(SUBSIGUIENTE, CICLO).texto).toContain('Garantía Laboral (12,5%):');
    const sin = render(SUBSIGUIENTE, CICLO, SIN_LABORAL);
    expect(sin.texto).not.toContain('Garantía Laboral');
    const posicion = sin.parrafos.findIndex((p) => p.includes('Garantía de Fiel Cumplimiento'));
    expect(sin.parrafos[posicion + 1]).toContain('CONVOCATORIA');
  });
});

describe('aviso de fin de procedimiento con la plantilla real', () => {
  it.each([
    ['TOTAL', DESIERTO_TOTAL],
    ['PARCIAL', DESIERTO_PARCIAL],
  ])('%s no deja marcas sin reemplazar', (_nombre, ciclo) => {
    const { texto } = render(AVISO, ciclo);
    expect(texto).not.toMatch(/[{}]/);
    expect(texto).not.toContain('undefined');
  });

  it('llena encabezado, antecedentes y firma de la secretaria', () => {
    const { texto } = render(AVISO, DESIERTO_TOTAL);
    expect(texto).toContain('NOTIFICACIÓN N°: AVISO-012-2026');
    expect(texto).toContain('Los Teques, 30 de octubre de 2026');
    expect(texto).toContain('se otorgó el contrato a la empresa ALFA, C.A.');
    expect(texto).toContain('Luisa Díaz');
    expect(texto).toContain('C.I. N° V-1');
  });

  it('conserva el orden de los numerales', () => {
    for (const ciclo of [DESIERTO_TOTAL, DESIERTO_PARCIAL]) {
      const { texto } = render(AVISO, ciclo);
      const posiciones = [
        '1. ANTECEDENTES',
        '2. FUNDAMENTO',
        '3. DEVOLUCIÓN',
        '4. SELECCIÓN',
        '5. INFORMACIÓN',
      ].map((t) => texto.indexOf(t));
      expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
      expect(posiciones[0]).toBeGreaterThan(-1);
    }
  });

  it('TOTAL declara desierto y usa la modalidad', () => {
    const { texto } = render(AVISO, DESIERTO_TOTAL);
    expect(texto).toContain('DECLARATORIA DESIERTA:');
    expect(texto).toContain('por agotamiento de la 2da y 3ra opción');
    expect(texto).toContain('bajo la modalidad de Consulta de Precios, manteniendo');
    expect(texto).not.toContain('PARCIALMENTE');
    expect(texto).not.toContain('ítems fallidos');
  });

  it('PARCIAL usa los renglones de la Resolución, no todo el alcance', () => {
    const { texto } = render(AVISO, DESIERTO_PARCIAL);
    expect(texto).toContain('DECLARATORIA DESIERTA PARCIAL:');
    expect(texto).toContain('sobre los renglones N° 6 al 9 y tras');
    expect(texto).toContain('DECLARAR DESIERTO PARCIALMENTE');
    expect(texto).toContain('modalidad de Consulta de Precios correspondiente a la cuantía');
    expect(texto).not.toContain('1 al 9');
    expect(texto).not.toContain('por agotamiento de la 2da');
  });
});

describe('partidasDeOferente', () => {
  const dictamen = (partidas: string | null) => ({
    partidasAdjudicadasTotal: partidas,
    partidasAdjudicadasParcial: null,
  });

  it('recorre la cadena de reemplazos', () => {
    const ciclos = [
      {
        decision: 'SUBSIGUIENTE',
        subsiguienteEvaluacionId: 'b',
        infractorEvaluacionId: 'a',
        infractor: { dictamenAdjudicacion: dictamen('4.02.01') },
      },
      {
        decision: 'SUBSIGUIENTE',
        subsiguienteEvaluacionId: 'c',
        infractorEvaluacionId: 'b',
        infractor: { dictamenAdjudicacion: null },
      },
    ];
    expect(partidasDeOferente('c', null, ciclos)).toBe('4.02.01');
  });

  it('sin partidas devuelve null para usar las del expediente', () => {
    expect(partidasDeOferente('a', null, [])).toBeNull();
  });
});

describe('DecaimientoService: notificaciones de cierre', () => {
  const USUARIO = { id: 'u-1' } as never;
  const SUB_DTO = {
    numNotificacionAdjudicacionSubsiguiente: 'NOT-045-2026',
    fechaNotificacionAdjudicacionSubsiguiente: '2026-10-29',
  };
  const AVISO_DTO = {
    numNotificacionFinProceso: 'AVISO-012-2026',
    fechaNotificacionFinProceso: '2026-10-30',
  };

  function crear(decision: string) {
    const tx = {
      decaimientoFase4: { update: jest.fn().mockResolvedValue({}) },
      documentoGenerado: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      expedienteContratacion: { update: jest.fn().mockResolvedValue({}) },
      contratoFase4: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      decaimientoFase4: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'ciclo-1',
          decision,
          caracterSnapshot: 'TOTAL',
          infractorEvaluacionId: 'eva-1',
          subsiguienteEvaluacionId: 'eva-2',
          fecNotificacionDecaimiento: new Date('2026-10-28T00:00:00.000Z'),
          fechaResolucionDecaimiento: new Date('2026-10-27T00:00:00.000Z'),
        }),
      },
      $transaction: jest.fn((fn: (cliente: typeof tx) => unknown) => fn(tx)),
    };
    const fase4 = {
      cargarExpediente: jest.fn().mockResolvedValue({ selladoFase4At: null }),
      assertNoSellado: jest.fn(),
      getEstado: jest.fn().mockResolvedValue({ oferentes: [] }),
    };
    const documentos = { completarPendientes: jest.fn().mockResolvedValue({}) };
    const servicio = new DecaimientoService(prisma as never, fase4 as never, documentos as never);
    return { servicio, tx };
  }

  it('la notificación al subsiguiente guarda sus datos y deja sin vigencia la anterior', async () => {
    const { servicio, tx } = crear('SUBSIGUIENTE');
    await servicio.notificarSubsiguiente('exp-1', SUB_DTO, USUARIO);

    expect(tx.decaimientoFase4.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numNotificacionAdjudicacionSubsiguiente: 'NOT-045-2026',
          fechaNotificacionAdjudicacionSubsiguiente: new Date('2026-10-29T00:00:00.000Z'),
        }),
      }),
    );
    expect(tx.documentoGenerado.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.documentoGenerado.create.mock.invocationCallOrder[0],
    );
  });

  it('rechaza una notificación anterior a la resolución', async () => {
    const { servicio, tx } = crear('SUBSIGUIENTE');
    await expect(
      servicio.notificarSubsiguiente(
        'exp-1',
        { ...SUB_DTO, fechaNotificacionAdjudicacionSubsiguiente: '2026-10-26' },
        USUARIO,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(tx.documentoGenerado.create).not.toHaveBeenCalled();
  });

  it('el cierre genera un solo aviso, sin destinatario', async () => {
    const { servicio, tx } = crear('DESIERTO');
    await servicio.cierreDesierto('exp-1', AVISO_DTO, USUARIO);

    expect(tx.documentoGenerado.create).toHaveBeenCalledTimes(1);
    const { data } = tx.documentoGenerado.create.mock.calls[0][0];
    expect(data.tipoDocumento).toBe('NOTIFICACION_FIN_PROCEDIMIENTO');
    expect(data.evaluacionId).toBeUndefined();
    expect(tx.decaimientoFase4.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'CERRADO',
          numNotificacionFinProceso: 'AVISO-012-2026',
        }),
      }),
    );
  });

  it('rechaza un aviso anterior a la resolución', async () => {
    const { servicio, tx } = crear('DESIERTO');
    await expect(
      servicio.cierreDesierto(
        'exp-1',
        { ...AVISO_DTO, fechaNotificacionFinProceso: '2026-10-26' },
        USUARIO,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(tx.documentoGenerado.create).not.toHaveBeenCalled();
  });
});
