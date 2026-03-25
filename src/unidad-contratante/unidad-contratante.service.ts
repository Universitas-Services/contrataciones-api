import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUnidadContratanteDto } from './dto/create-unidad-contratante.dto';
import { UpdateUnidadContratanteDto } from './dto/update-unidad-contratante.dto';

@Injectable()
export class UnidadContratanteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateUnidadContratanteDto, enteId: string, userId: string) {
    return this.prisma.unidadContratante.create({
      data: {
        ...createDto,
        enteId,
        createdBy: userId,
      },
    });
  }

  async findAll(enteId: string) {
    return this.prisma.unidadContratante.findMany({
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
    const unidad = await this.prisma.unidadContratante.findFirst({
      where: {
        id,
        enteId,
        deletedAt: null,
      },
    });

    if (!unidad) {
      throw new NotFoundException(`Unidad Contratante con ID ${id} no encontrada`);
    }

    return unidad;
  }

  async update(id: string, updateDto: UpdateUnidadContratanteDto, enteId: string, userId: string) {
    await this.findOne(id, enteId);

    return this.prisma.unidadContratante.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, enteId: string, userId: string) {
    const unidad = await this.findOne(id, enteId);

    return this.prisma.unidadContratante.update({
      where: { id },
      data: {
        activa: !unidad.activa,
        updatedBy: userId,
      },
    });
  }
}
