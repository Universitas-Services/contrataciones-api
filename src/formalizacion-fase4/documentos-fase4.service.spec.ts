import { ConflictException, NotFoundException } from '@nestjs/common';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { GeneradorDocumentosService } from '../generador-documentos/generador-documentos.service';
import { mapDatosCiclo, mapDatosContrato } from './documentos-fase4.mapper';
import { DocumentosFase4Service } from './documentos-fase4.service';
import { LINEA_VACIA } from './pildoras.util';

const CICLO = {
  numeroCiclo: 1,
  caracterSnapshot: 'TOTAL',
  decision: 'SUBSIGUIENTE',
  causalDecaimiento: 'NO FIRMÓ CONTRATO',
  fechaNotificacionAdjudicacionIncumplidor: new Date('2026-10-13T00:00:00.000Z'),
  fechaCertificacionIncumplimiento: null,
  fechaVencimientoGarantias: null,
  fechaVencimientoFirmaContrato: null,
  alcanceReadjudicacionParcial: null,
  montoReadjudicadoParcialBs: null,
  montoReadjudicadoBs: 1000,
  plazoEjecucionSubsiguiente: 75,
  modalidadDegradadaSugerida: null,
  renglonesAfectadosDecaimiento: null,
  numResolucionDecaimiento: null,
  fechaResolucionDecaimiento: null,
  infractor: { nombreProveedorEvaluado: 'Infractor', rifProveedorEvaluado: 'J-1' },
  subsiguiente: { nombreProveedorEvaluado: 'Siguiente', rifProveedorEvaluado: 'J-2' },
};

const EXPEDIENTE = {
  codigoNomenclatura: 'CA-001',
  descripcionObjeto: 'Objeto',
  ente: { nombre: 'Ente', rif: 'G-1' },
  fasePreparatoria: { porcentajeFielCumplimiento: 10 },
};

function crear() {
  const tx = {
    documentoGenerado: {
      update: jest.fn().mockResolvedValue({ versionDocumento: 2 }),
      create: jest.fn().mockResolvedValue({ id: 'doc-nuevo' }),
    },
    contratoFase4: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    documentoGenerado: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
    },
    expedienteContratacion: { findUnique: jest.fn().mockResolvedValue(EXPEDIENTE) },
    $transaction: jest.fn((fn: (cliente: typeof tx) => unknown) => fn(tx)),
  };
  const generador = {
    plantillaExiste: jest.fn().mockReturnValue(true),
    renderizarYSubir: jest.fn().mockResolvedValue({ fileUrl: 'https://archivo', fileName: 'a' }),
    mapDocToPreview: jest.fn().mockReturnValue({ previewUrl: 'https://vista' }),
    getFirmasExpediente: jest.fn().mockResolvedValue({}),
  };
  const servicio = new DocumentosFase4Service(
    prisma as never,
    generador as unknown as GeneradorDocumentosService,
  );
  servicio['logger'].error = jest.fn();
  return { servicio, prisma, generador, tx };
}

const PENDIENTE = {
  id: 'doc-1',
  tipoDocumento: 'CERTIFICADO_INCUMPLIMIENTO',
  evaluacion: null,
  decaimiento: CICLO,
};

const BLOQUES = {
  retencionFielCumplimiento: false,
  anticipoContrato: false,
  requiereGarantiaLaboral: false,
  retencionFianzaLaboral: false,
  polizaResponsabilidadCivil: false,
};

const CONTRATO = {
  contratoId: 'contrato-1',
  expedienteId: 'exp-1',
  evaluacionId: 'eva-1',
  documentoAnteriorId: null,
  clauses: [],
  bloques: BLOQUES,
  fechaFirma: null,
  tokens: {},
  userId: 'user-1',
};

describe('DocumentosFase4Service.completarPendientes', () => {
  it('genera el archivo y actualiza la misma fila, sin crear ni borrar', async () => {
    const { servicio, prisma, generador } = crear();
    prisma.documentoGenerado.findMany.mockResolvedValue([PENDIENTE]);

    const resultado = await servicio.completarPendientes('exp-1');

    expect(resultado).toEqual({ generados: 1, pendientes: 0 });
    expect(generador.renderizarYSubir).toHaveBeenCalledTimes(1);
    expect(prisma.documentoGenerado.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { urlArchivo: 'https://archivo' },
    });
    expect(prisma.documentoGenerado.delete).not.toHaveBeenCalled();
  });

  it('sin plantilla deja el registro pendiente y no falla', async () => {
    const { servicio, prisma, generador } = crear();
    prisma.documentoGenerado.findMany.mockResolvedValue([PENDIENTE]);
    generador.plantillaExiste.mockReturnValue(false);

    await expect(servicio.completarPendientes('exp-1')).resolves.toEqual({
      generados: 0,
      pendientes: 1,
    });
    expect(generador.renderizarYSubir).not.toHaveBeenCalled();
  });

  it('un fallo de la subida no se propaga al paso legal', async () => {
    const { servicio, prisma, generador } = crear();
    prisma.documentoGenerado.findMany.mockResolvedValue([PENDIENTE]);
    generador.renderizarYSubir.mockRejectedValue(new Error('sin red'));

    await expect(servicio.completarPendientes('exp-1')).resolves.toEqual({
      generados: 0,
      pendientes: 1,
    });
    expect(prisma.documentoGenerado.update).not.toHaveBeenCalled();
  });
});

describe('DocumentosFase4Service.emitirContrato', () => {
  it('crea el documento, lo enlaza y conserva el anterior como desactualizado', async () => {
    const { servicio, tx } = crear();

    const id = await servicio.emitirContrato({ ...CONTRATO, documentoAnteriorId: 'doc-viejo' });

    expect(id).toBe('doc-nuevo');
    expect(tx.documentoGenerado.update).toHaveBeenCalledWith({
      where: { id: 'doc-viejo' },
      data: { estaDesactualizado: true },
    });
    expect(tx.documentoGenerado.create.mock.calls[0][0].data.versionDocumento).toBe(3);
    expect(tx.contratoFase4.update).toHaveBeenCalledWith({
      where: { id: 'contrato-1' },
      data: { documentoId: 'doc-nuevo' },
    });
  });

  it('sin plantilla no hace nada y devuelve null', async () => {
    const { servicio, generador, tx } = crear();
    generador.plantillaExiste.mockReturnValue(false);

    await expect(servicio.emitirContrato(CONTRATO)).resolves.toBeNull();
    expect(tx.documentoGenerado.create).not.toHaveBeenCalled();
  });

  it('si falla la subida, el contrato anterior sigue vigente', async () => {
    const { servicio, generador, tx } = crear();
    generador.renderizarYSubir.mockRejectedValue(new Error('sin red'));

    await expect(
      servicio.emitirContrato({ ...CONTRATO, documentoAnteriorId: 'doc-viejo' }),
    ).resolves.toBeNull();
    expect(tx.documentoGenerado.update).not.toHaveBeenCalled();
  });
});

describe('DocumentosFase4Service — preview y descarga', () => {
  it('rechaza un documento que no es de este expediente', async () => {
    const { servicio } = crear();
    await expect(servicio.preview('exp-1', 'doc-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('responde conflicto si el archivo aún no existe', async () => {
    const { servicio, prisma } = crear();
    prisma.documentoGenerado.findFirst.mockResolvedValue({ id: 'doc-1', urlArchivo: '' });
    await expect(servicio.descarga('exp-1', 'doc-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('el nombre del archivo lleva el tipo y la versión', async () => {
    const { servicio, prisma } = crear();
    prisma.documentoGenerado.findFirst.mockResolvedValue({
      id: 'doc-1',
      urlArchivo: 'https://archivo',
      tipoDocumento: 'CONTRATO',
      versionDocumento: 2,
    });
    await expect(servicio.descarga('exp-1', 'doc-1')).resolves.toEqual({
      url: 'https://archivo',
      fileName: 'contrato-v2.docx',
    });
  });
});

describe('mapDatosCiclo', () => {
  it('calcula la fianza del subsiguiente y marca los bloques', () => {
    const datos = mapDatosCiclo({
      expediente: EXPEDIENTE,
      ciclo: CICLO,
      destinatario: null,
    });

    expect(datos.es_total).toBe(true);
    expect(datos.decision_subsiguiente).toBe(true);
    expect(datos.monto_fiel_cumplimiento_subsiguiente_bs_au_au).toBe('Bs. 16,00');
    expect(datos.fecha_certificacion_incumplimiento_au_au).toBe(LINEA_VACIA);
    expect(datos.nombre_destinatario_au_au).toBe(LINEA_VACIA);
  });

  it('en PARCIAL toma el monto parcial', () => {
    const datos = mapDatosCiclo({
      expediente: EXPEDIENTE,
      ciclo: { ...CICLO, caracterSnapshot: 'PARCIAL', montoReadjudicadoParcialBs: 500 },
      destinatario: null,
    });
    expect(datos.monto_readjudicado_numeros_au_au).toContain('500,00');
  });
});

describe('mapDatosContrato', () => {
  /** Un .docx mínimo, para comprobar que los datos llenan una plantilla real. */
  function plantilla(cuerpo: string) {
    const zip = new PizZip();
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '</Types>',
    );
    zip.file(
      'word/document.xml',
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        `<w:body><w:p><w:r><w:t>${cuerpo}</w:t></w:r></w:p></w:body></w:document>`,
    );
    return zip;
  }

  it('llena una plantilla con las cláusulas en orden y en texto plano', () => {
    const datos = mapDatosContrato(
      { monto_contrato_letras_au_au: 'MIL BOLÍVARES' },
      [
        { order: 2, titulo: 'MONTO', cuerpoHtml: '<p>Por [MONTO CONTRATO EN LETRAS].</p>' },
        { order: 1, titulo: 'DOMICILIO', cuerpoHtml: '<p>En [CIUDAD DOMICILIO ESPECIAL].</p>' },
      ],
      { bloques: BLOQUES, firmas: {}, fechaFirma: null },
    );

    const doc = new Docxtemplater(
      plantilla(
        '{#clausulas_custom_au_au}{num_clausula_custom_au_au} {titulo_clausula_custom_au_au}: {cuerpo_clausula_custom_au_au} {/clausulas_custom_au_au}',
      ),
      { delimiters: { start: '{', end: '}' } },
    );
    doc.render(datos);
    const xml = doc.getZip().file('word/document.xml')?.asText() ?? '';

    expect(xml).toContain(`PRIMERA DOMICILIO: En ${LINEA_VACIA}.`);
    expect(xml).toContain('SEGUNDA MONTO: Por MIL BOLÍVARES.');
    expect(xml.indexOf('PRIMERA')).toBeLessThan(xml.indexOf('SEGUNDA'));
    expect(xml).not.toContain('<span');
  });

  it('una variable sin valor sale como línea, nunca como null', () => {
    const datos = mapDatosContrato({ rif_ente_au_au: null }, [], {
      bloques: BLOQUES,
      firmas: {},
      fechaFirma: null,
    });
    expect(datos).toMatchObject({ rif_ente: LINEA_VACIA });
  });
});
