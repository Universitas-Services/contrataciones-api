import { BadRequestException } from '@nestjs/common';
import { GeneradorDocumentosService } from './generador-documentos.service';

const PLANTILLA = 'acta-inicio-template.docx';

function crear() {
  const prisma = {
    documentoGenerado: {
      findFirst: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'doc-nuevo',
          tipoDocumento: data.tipoDocumento,
          createdAt: new Date(),
        }),
      ),
    },
  };
  const storage = {
    uploadFile: jest.fn().mockResolvedValue('https://archivo'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };
  const servicio = new GeneradorDocumentosService(prisma as never, {} as never, storage);
  return { servicio, prisma, storage };
}

describe('GeneradorDocumentosService.generarDocumento', () => {
  it('sigue reemplazando el documento anterior en las Fases 1 a 3', async () => {
    const { servicio, prisma, storage } = crear();
    prisma.documentoGenerado.findFirst.mockResolvedValue({
      id: 'doc-viejo',
      urlArchivo: '',
      versionDocumento: 1,
    });

    const resultado = await servicio.generarDocumento(
      'exp-1',
      'ACTA_INICIO',
      PLANTILLA,
      'user-1',
      {},
    );

    expect(prisma.documentoGenerado.delete).toHaveBeenCalledWith({ where: { id: 'doc-viejo' } });
    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    expect(prisma.documentoGenerado.create.mock.calls[0][0].data).toMatchObject({
      expedienteId: 'exp-1',
      tipoDocumento: 'ACTA_INICIO',
      urlArchivo: 'https://archivo',
      versionDocumento: 2,
      createdBy: 'user-1',
    });
    expect(resultado).toMatchObject({ id: 'doc-nuevo', url: 'https://archivo' });
  });

  it('rechaza una plantilla que no existe', async () => {
    const { servicio } = crear();
    await expect(
      servicio.generarDocumento('exp-1', 'ACTA_INICIO', 'no-existe.docx', 'user-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('GeneradorDocumentosService.renderizarYSubir', () => {
  it('sube el archivo sin tocar la base', async () => {
    const { servicio, prisma, storage } = crear();

    const { fileUrl, fileName } = await servicio.renderizarYSubir(
      'exp-1',
      'ACTA_INICIO',
      PLANTILLA,
      {},
    );

    expect(fileUrl).toBe('https://archivo');
    expect(fileName).toMatch(/^acta_inicio-exp-1-\d+\.docx$/);
    expect(storage.uploadFile.mock.calls[0][1]).toBe(`expedientes/exp-1/${fileName}`);
    expect(prisma.documentoGenerado.create).not.toHaveBeenCalled();
    expect(prisma.documentoGenerado.delete).not.toHaveBeenCalled();
  });
});

describe('GeneradorDocumentosService.plantillaExiste', () => {
  it('distingue una plantilla disponible de una ausente', () => {
    const { servicio } = crear();
    expect(servicio.plantillaExiste(PLANTILLA)).toBe(true);
    expect(servicio.plantillaExiste('resolucion-decaimiento-template.docx')).toBe(false);
  });
});
