import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUnidadUsuariaDto } from './dto/create-unidad-usuaria.dto';
import { UpdateUnidadUsuariaDto } from './dto/update-unidad-usuaria.dto';

@Injectable()
export class UnidadUsuariaService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.findOne(id, enteId);

    return this.prisma.unidadUsuaria.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, enteId: string, userId: string) {
    await this.findOne(id, enteId);

    return this.prisma.unidadUsuaria.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });
  }
}
