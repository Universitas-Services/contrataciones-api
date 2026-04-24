import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUnidadUsuariaDto } from './dto/create-unidad-usuaria.dto';
import { UpdateUnidadUsuariaDto } from './dto/update-unidad-usuaria.dto';

@Injectable()
export class UnidadUsuariaService {
  constructor(private readonly prisma: PrismaService) {}

  private async invalidarDocumentosExpedientes(unidadUsuariaId: string) {
    const expedientes = await this.prisma.expedienteContratacion.findMany({
      where: { unidadUsuariaId, deletedAt: null },
      select: { id: true },
    });
    const expIds = expedientes.map((e) => e.id);
    if (expIds.length === 0) return;

    await this.prisma.documentoGenerado.updateMany({
      where: { expedienteId: { in: expIds }, deletedAt: null },
      data: { estaDesactualizado: true },
    });
    await this.prisma.pliegoGenerado.updateMany({
      where: { expedienteId: { in: expIds }, deletedAt: null },
      data: { estaDesactualizado: true },
    });
  }

  async create(createDto: CreateUnidadUsuariaDto, enteId: string, userId: string) {
    return this.prisma.unidadUsuaria.create({
      data: {
        ...createDto,
        enteId,
        createdBy: userId,
      },
    });
  }

  async findAll(enteId: string) {
    return this.prisma.unidadUsuaria.findMany({
      where: {
        enteId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, enteId: string) {
    const unidad = await this.prisma.unidadUsuaria.findFirst({
      where: {
        id,
        enteId,
        deletedAt: null,
      },
    });

    if (!unidad) {
      throw new NotFoundException(`Unidad Usuaria con ID ${id} no encontrada`);
    }

    return unidad;
  }

  async update(id: string, updateDto: UpdateUnidadUsuariaDto, enteId: string, userId: string) {
    const unidad = await this.findOne(id, enteId);

    let requiereInvalidacion = false;
    const criticos = ['nombreUnidadUsuaria', 'nombreResponsableUnidadUsuaria'] as const;

    for (const key of criticos) {
      if (updateDto[key] !== undefined && updateDto[key] !== (unidad as any)[key]) {
        requiereInvalidacion = true;
        break;
      }
    }

    const actualizada = await this.prisma.unidadUsuaria.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy: userId,
      },
    });

    if (requiereInvalidacion) {
      await this.invalidarDocumentosExpedientes(id);
    }

    return actualizada;
  }

  async remove(id: string, enteId: string, userId: string) {
    const unidad = await this.findOne(id, enteId);

    return this.prisma.unidadUsuaria.update({
      where: { id },
      data: {
        activa: !unidad.activa,
        updatedBy: userId,
      },
    });
  }
}
