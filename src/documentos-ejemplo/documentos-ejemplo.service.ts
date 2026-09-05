import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { IStorageService } from '../common/interfaces/storage-service.interface';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import {
  CreateDocumentoEjemploDto,
  UpdateDocumentoEjemploDto,
  QueryDocumentoEjemploDto,
} from './dto/documento-ejemplo.dto';

/**
 * Catálogo de documentos de ejemplo. Los carga UNIVERSITAS y los entes los
 * consultan como guía visual mientras llenan los formularios.
 */
@Injectable()
export class DocumentosEjemploService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IStorageService') private readonly storage: IStorageService,
  ) {}

  /**
   * Genera el siguiente código de la serie: documento-01, documento-02, etc.
   * Se apoya en el mayor número ya usado, de modo que borrar uno intermedio no
   * provoque códigos repetidos.
   */
  private async siguienteCodigo(): Promise<string> {
    const existentes = await this.prisma.documentoEjemplo.findMany({
      where: { codigo: { startsWith: 'documento-' } },
      select: { codigo: true },
    });

    let mayor = 0;
    for (const { codigo } of existentes) {
      const numero = Number(codigo.replace('documento-', ''));
      if (Number.isInteger(numero) && numero > mayor) mayor = numero;
    }

    return `documento-${String(mayor + 1).padStart(2, '0')}`;
  }

  private async assertCodigoLibre(codigo: string, excluirId?: string) {
    const existente = await this.prisma.documentoEjemplo.findUnique({ where: { codigo } });
    if (existente && existente.id !== excluirId) {
      throw new ConflictException(`Ya existe un documento con el código "${codigo}"`);
    }
  }

  async findAll(query: QueryDocumentoEjemploDto) {
    const { page = 1, limit = 20, search, activo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentoEjemploWhereInput = {
      deletedAt: null,
      ...(activo !== undefined && { activo }),
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { codigo: { contains: search, mode: 'insensitive' } },
          { descripcion: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.documentoEjemplo.count({ where }),
      this.prisma.documentoEjemplo.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ orden: 'asc' }, { codigo: 'asc' }],
      }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  /**
   * Busca por código legible (documento-01) o por UUID. El frontend usa el
   * código; el panel de administración puede usar cualquiera de los dos.
   */
  async findOne(codigoOId: string) {
    const documento = await this.prisma.documentoEjemplo.findFirst({
      where: {
        deletedAt: null,
        OR: [{ codigo: codigoOId }, { id: codigoOId }],
      },
    });
    if (!documento) {
      throw new NotFoundException(`Documento de ejemplo "${codigoOId}" no encontrado`);
    }
    return documento;
  }

  async create(dto: CreateDocumentoEjemploDto, file: Express.Multer.File, user: UsuarioActual) {
    if (!file) throw new BadRequestException('Debe adjuntar la imagen del documento');

    const codigo = dto.codigo ?? (await this.siguienteCodigo());
    await this.assertCodigoLibre(codigo);

    const carpeta = 'universitas/documentos-ejemplo';
    const nombreArchivo = `${codigo}-${Date.now()}`;
    const url = await this.storage.uploadFile(file.buffer, carpeta, nombreArchivo);

    return this.prisma.documentoEjemplo.create({
      data: {
        codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        orden: dto.orden,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: `${carpeta}/${nombreArchivo}`,
        url,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateDocumentoEjemploDto, user: UsuarioActual) {
    const documento = await this.findOne(id);

    if (dto.codigo && dto.codigo !== documento.codigo) {
      await this.assertCodigoLibre(dto.codigo, documento.id);
    }

    return this.prisma.documentoEjemplo.update({
      where: { id: documento.id },
      data: { ...dto, updatedBy: user.id },
    });
  }

  /** Reemplaza la imagen conservando el código y el resto de los datos. */
  async reemplazarImagen(id: string, file: Express.Multer.File, user: UsuarioActual) {
    if (!file) throw new BadRequestException('Debe adjuntar la nueva imagen');

    const documento = await this.findOne(id);

    const carpeta = 'universitas/documentos-ejemplo';
    const nombreArchivo = `${documento.codigo}-${Date.now()}`;
    const url = await this.storage.uploadFile(file.buffer, carpeta, nombreArchivo);

    return this.prisma.documentoEjemplo.update({
      where: { id: documento.id },
      data: {
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: `${carpeta}/${nombreArchivo}`,
        url,
        updatedBy: user.id,
      },
    });
  }

  async remove(id: string, user: UsuarioActual) {
    const documento = await this.findOne(id);

    await this.prisma.documentoEjemplo.update({
      where: { id: documento.id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    return { message: `Documento de ejemplo "${documento.codigo}" eliminado` };
  }
}
