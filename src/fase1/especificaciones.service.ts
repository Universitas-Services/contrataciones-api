import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ExpedienteAccessService } from '../common/services/expediente-access.service';
import type { IStorageService } from '../common/interfaces/storage-service.interface';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@Injectable()
export class EspecificacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: ExpedienteAccessService,
    @Inject('IStorageService') private readonly storage: IStorageService,
  ) {}

  private async getFase(expedienteId: string, userId: string) {
    const existente = await this.prisma.fasePreparatoria.findUnique({ where: { expedienteId } });
    if (existente) return existente;

    return this.prisma.fasePreparatoria.create({
      data: {
        expediente: { connect: { id: expedienteId } },
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  private async invalidarDocumentos(expedienteId: string) {
    await this.prisma.documentoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
    await this.prisma.pliegoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
  }

  async obtener(expedienteId: string, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
      include: { especificaciones: true },
    });

    const archivo = fase?.especificaciones;
    if (!archivo || archivo.deletedAt) {
      return { estado: 'PENDIENTE' as const, archivo: null };
    }

    return { estado: 'COMPLETADO' as const, archivo };
  }

  /**
   * Sube el documento modelo de un recaudo personalizado de la Calificación
   * Legal y devuelve su URL. El front la coloca en `archivoModeloUrl` dentro
   * del recaudo; al completar el micromódulo se exige que exista cuando el
   * recaudo declara tener modelo.
   */
  async subirModeloRecaudo(expedienteId: string, file: Express.Multer.File, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    if (!file) throw new BadRequestException('No se ha enviado ningún archivo');

    const carpeta = `expedientes/${expedienteId}/recaudos-modelo`;
    const nombreArchivo = `modelo-${Date.now()}-${file.originalname}`;
    const url = await this.storage.uploadFile(file.buffer, carpeta, nombreArchivo);

    return {
      archivoModeloUrl: url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date(),
      uploadedBy: user.id,
    };
  }

  async subir(expedienteId: string, file: Express.Multer.File, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);
    if (!file) throw new BadRequestException('No se ha enviado ningún archivo');

    const fase = await this.getFase(expedienteId, user.id);

    // Solo se admite un archivo de especificaciones por expediente: el anterior
    // se reemplaza.
    const anterior = await this.prisma.fase1Especificacion.findUnique({
      where: { fasePreparatoriaId: fase.id },
    });

    const carpeta = `expedientes/${expedienteId}/especificaciones`;
    const nombreArchivo = `especificaciones-${Date.now()}-${file.originalname}`;
    const url = await this.storage.uploadFile(file.buffer, carpeta, nombreArchivo);

    const datos = {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey: `${carpeta}/${nombreArchivo.replace(/\.[^/.]+$/, '')}`,
      url,
      uploadedAt: new Date(),
      uploadedBy: user.id,
      deletedAt: null,
    };

    const archivo = anterior
      ? await this.prisma.fase1Especificacion.update({ where: { id: anterior.id }, data: datos })
      : await this.prisma.fase1Especificacion.create({
          data: { ...datos, fasePreparatoria: { connect: { id: fase.id } } },
        });

    await this.invalidarDocumentos(expedienteId);

    return { estado: 'COMPLETADO' as const, archivo };
  }

  async eliminar(expedienteId: string, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);

    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
      include: { especificaciones: true },
    });

    const archivo = fase?.especificaciones;
    if (!archivo || archivo.deletedAt) {
      throw new NotFoundException('No hay especificaciones técnicas cargadas para este expediente');
    }

    await this.prisma.fase1Especificacion.update({
      where: { id: archivo.id },
      data: { deletedAt: new Date() },
    });

    await this.invalidarDocumentos(expedienteId);

    return { estado: 'PENDIENTE' as const, message: 'Especificaciones técnicas eliminadas' };
  }
}
