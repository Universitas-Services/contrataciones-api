import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { mapDatosCiclo } from './documentos-fase4.mapper';

const EXPEDIENTE = {
  codigoNomenclatura: 'CA-001-2026',
  descripcionObjeto: 'Adquisición de insumos',
  ente: { nombre: 'GOBERNACIÓN', rif: 'G-1' },
  fasePreparatoria: { porcentajeFielCumplimiento: 10 },
  cronograma: { fechaLimiteAdjudicacion: new Date('2026-10-01T00:00:00.000Z') },
  comision: {
    datosDesignacionComision: 'Resolución N° 10',
    miembros: [
      {
        areaRepresentacion: 'AREA_JURIDICA',
        tipoMiembro: 'MIEMBRO_PRINCIPAL',
        nombreCompletoMiembro: 'Otra Persona',
        cedulaMiembro: '1',
      },
      {
        areaRepresentacion: 'SECRETARIO_A',
        tipoMiembro: 'MIEMBRO_PRINCIPAL',
        nombreCompletoMiembro: 'Ana Gómez',
        cedulaMiembro: '9.876.543',
      },
    ],
  },
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
  numResolucionDecaimiento: null,
  fechaResolucionDecaimiento: null,
  infractor: { nombreProveedorEvaluado: 'ALFA, C.A.', rifProveedorEvaluado: 'J-1' },
  subsiguiente: { nombreProveedorEvaluado: 'GAMMA, C.A.', rifProveedorEvaluado: 'J-3' } as {
    nombreProveedorEvaluado: string;
    rifProveedorEvaluado: string;
  } | null,
};

const FIRMAS = { nom_completo_autoridad: 'María Pérez', nom_completo_delegado: '' };

function certificado(ciclo: typeof CICLO) {
  const plantilla = path.join(
    __dirname,
    '../generador-documentos/templates/certificado-incumplimiento-template.docx',
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

describe('certificado de incumplimiento con la plantilla real', () => {
  it.each([
    ['TOTAL subsiguiente', TOTAL_SUBSIGUIENTE],
    ['PARCIAL subsiguiente', PARCIAL_SUBSIGUIENTE],
    ['TOTAL desierto', TOTAL_DESIERTO],
    ['PARCIAL desierto', PARCIAL_DESIERTO],
  ])('%s no deja marcas sin reemplazar', (_nombre, ciclo) => {
    const texto = certificado(ciclo);
    expect(texto).not.toMatch(/\{[^}]*\}/);
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('Bs. Bs.');
  });

  it('llena encabezado, antecedentes y firma', () => {
    const texto = certificado(TOTAL_SUBSIGUIENTE);
    expect(texto).toContain('PARA: María Pérez');
    expect(texto).toContain('Quien suscribe, Ana Gómez');
    expect(texto).toContain('C.I. N° 9.876.543');
    expect(texto).toContain('conferidas en Resolución N° 10');
    expect(texto).toContain('a favor de la empresa ALFA, C.A., RIF J-1');
    expect(texto).toContain('Concurso Abierto N° CA-001-2026');
  });

  it('TOTAL con subsiguiente recomienda la adjudicación total y nada más', () => {
    const texto = certificado(TOTAL_SUBSIGUIENTE);
    expect(texto).toContain('Adjudicación Subsiguiente Total');
    expect(texto).toContain('GAMMA, C.A., RIF J-3');
    expect(texto).toContain('Bs. 1.000.000,00');
    expect(texto).not.toContain('Adjudicación Subsiguiente Parcial');
    expect(texto).not.toContain('Declarar Desierto');
  });

  it('PARCIAL con subsiguiente lleva renglones y monto', () => {
    const texto = certificado(PARCIAL_SUBSIGUIENTE);
    expect(texto).toContain('Adjudicación Subsiguiente Parcial de los renglones N° 6 al 9');
    expect(texto).toContain('Bs. 400.000,00');
    expect(texto).not.toContain('Adjudicación Subsiguiente Total');
  });

  it('TOTAL desierto declara desierto el procedimiento con su modalidad', () => {
    const texto = certificado(TOTAL_DESIERTO);
    expect(texto).toContain('Declarar Desierto el procedimiento');
    expect(texto).toContain('Consulta de Precios (Art. 96 LCP)');
    expect(texto).not.toContain('Adjudicación Subsiguiente');
    expect(texto).not.toContain('Desierto Parcialmente');
  });

  it('PARCIAL desierto se limita a los renglones afectados', () => {
    const texto = certificado(PARCIAL_DESIERTO);
    expect(texto).toContain('Declarar Desierto Parcialmente');
    expect(texto).toContain('renglones o ítems N° 6 al 9');
    expect(texto).not.toContain('Adjudicación Subsiguiente');
  });
});
