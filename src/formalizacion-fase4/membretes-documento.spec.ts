import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { mapDatosCiclo } from './documentos-fase4.mapper';

const EXPEDIENTE = {
  codigoNomenclatura: 'CA-001-2026',
  descripcionObjeto: 'Adquisición de insumos',
  ente: { nombre: 'GOBERNACIÓN DE MIRANDA', rif: 'G-1', ciudad: 'Los Teques' },
  fasePreparatoria: {
    porcentajeFielCumplimiento: 10,
    requiereGarantiaLaboral: true,
    porcentajeGarantiaLaboral: 5,
  },
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
  fechaNotificacionAdjudicacionIncumplidor: null,
  fechaCertificacionIncumplimiento: null,
  fechaVencimientoGarantias: null,
  fechaVencimientoFirmaContrato: null,
  alcanceReadjudicacionParcial: '6 al 9',
  montoReadjudicadoParcialBs: 400000,
  montoReadjudicadoBs: 1000000,
  plazoEjecucionSubsiguiente: 75,
  modalidadDegradadaSugerida: 'Consulta de Precios',
  renglonesAfectadosDecaimiento: '6 al 9',
  numResolucionDecaimiento: 'RESOL-045-2026',
  fechaResolucionDecaimiento: null,
  infractor: { nombreProveedorEvaluado: 'ALFA, C.A.', rifProveedorEvaluado: 'J-1' },
  subsiguiente: { nombreProveedorEvaluado: 'GAMMA, C.A.', rifProveedorEvaluado: 'J-3' },
};

const FIRMA_AUTORIDAD = {
  nom_completo_autoridad: 'María Pérez',
  nom_completo_delegado: '',
  cargo_oficial_autoridad: 'Gobernadora',
  cargo_oficial_delegado: '',
  datos_designacion_autoridad: 'Decreto N° 1',
  datos_designacion_delegado: '',
};

const FIRMA_DELEGADO = {
  ...FIRMA_AUTORIDAD,
  nom_completo_autoridad: '',
  nom_completo_delegado: 'José Ruiz',
  cargo_oficial_autoridad: '',
  cargo_oficial_delegado: 'Secretario General',
};

const PLANTILLAS = [
  'certificado-incumplimiento-template.docx',
  'resolucion-decaimiento-template.docx',
  'notificacion-decaimiento-template.docx',
  'notificacion-adjudicacion-subsiguiente-template.docx',
  'notificacion-fin-procedimiento-template.docx',
];

const CASOS = ['TOTAL', 'PARCIAL'].flatMap((caracterSnapshot) =>
  ['SUBSIGUIENTE', 'DESIERTO'].map((decision) => ({ caracterSnapshot, decision })),
);

/** Renderiza todo el Word, y no solo el cuerpo: el membrete vive en otra parte del archivo. */
function renderizar(plantilla: string, ciclo: typeof CICLO, firmas: Record<string, string>) {
  const ruta = path.join(__dirname, '../generador-documentos/templates', plantilla);
  const sinValor: string[] = [];
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(ruta, 'binary')), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
    nullGetter: (parte) => {
      sinValor.push(parte.value ?? '');
      return '';
    },
  });
  doc.render(mapDatosCiclo({ expediente: EXPEDIENTE, ciclo, destinatario: null, firmas }));
  const membrete = (doc.getZip().file('word/header1.xml')?.asText() ?? '').replace(/<[^>]+>/g, '');
  return { sinValor, membrete };
}

describe('marcas de los documentos del ciclo', () => {
  it.each(PLANTILLAS)('%s recibe un valor para todas sus marcas', (plantilla) => {
    for (const caso of CASOS) {
      const { sinValor } = renderizar(plantilla, { ...CICLO, ...caso }, FIRMA_AUTORIDAD);
      expect(sinValor).toEqual([]);
    }
  });

  it.each(PLANTILLAS.slice(1))('%s lleva ente y cargo en el membrete', (plantilla) => {
    const { membrete } = renderizar(plantilla, CICLO, FIRMA_AUTORIDAD);
    expect(membrete).toContain('GOBERNACIÓN DE MIRANDA');
    expect(membrete).toContain('DESPACHO DEL GOBERNADORA');
  });

  it('si firma el delegado, el membrete lleva su cargo', () => {
    const { membrete } = renderizar(PLANTILLAS[1], CICLO, FIRMA_DELEGADO);
    expect(membrete).toContain('DESPACHO DEL SECRETARIO GENERAL');
  });
});
