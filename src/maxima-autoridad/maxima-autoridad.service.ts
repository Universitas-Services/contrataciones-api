import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateMaximaAutoridadDto } from './dto/create-maxima-autoridad.dto';
import { UpdateMaximaAutoridadDto } from './dto/update-maxima-autoridad.dto';

@Injectable()
export class MaximaAutoridadService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateMaximaAutoridadDto, enteId: string, userId: string) {
    return this.prisma.maximaAutoridad.create({
      data: {
        ...createDto,
        vigente: false,
        enteId,
        createdBy: userId,
      },
    });
  }

  async findAll(enteId: string) {
    return this.prisma.maximaAutoridad.findMany({
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
    const autoridad = await this.prisma.maximaAutoridad.findFirst({
      where: {
        id,
        enteId,
        deletedAt: null,
      },
    });

    if (!autoridad) {
      throw new NotFoundException(`Máxima Autoridad con ID ${id} no encontrada`);
    }

    return autoridad;
  }

  async update(id: string, updateDto: UpdateMaximaAutoridadDto, enteId: string, userId: string) {
    // Verificar existencia y pertenencia
    await this.findOne(id, enteId);

    return this.prisma.maximaAutoridad.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, enteId: string, userId: string) {
    await this.findOne(id, enteId);

    return this.prisma.maximaAutoridad.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });
  }

  async activar(id: string, enteId: string, userId: string) {
    await this.findOne(id, enteId);

    const activaExisente = await this.prisma.maximaAutoridad.findFirst({
      where: {
        enteId,
        vigente: true,
        deletedAt: null,
      },
    });

    if (activaExisente && activaExisente.id !== id) {
      throw new BadRequestException(
        'Ya existe una Máxima Autoridad activa para este ente. Debe desactivarla manualmente antes de activar otra.',
      );
    }

    return this.prisma.maximaAutoridad.update({
      where: { id },
      data: {
        vigente: true,
        updatedBy: userId,
      },
    });
  }

  async desactivar(id: string, enteId: string, userId: string) {
    await this.findOne(id, enteId);

    return this.prisma.maximaAutoridad.update({
      where: { id },
      data: {
        vigente: false,
        updatedBy: userId,
      },
    });
  }
}
