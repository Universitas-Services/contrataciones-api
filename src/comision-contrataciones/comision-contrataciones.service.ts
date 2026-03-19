import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateComisionContratacionesDto } from './dto/create-comision-contrataciones.dto';
import { UpdateComisionContratacionesDto } from './dto/update-comision-contrataciones.dto';
import { CreateMiembroComisionDto } from './dto/create-miembro-comision.dto';
import { UpdateMiembroComisionDto } from './dto/update-miembro-comision.dto';

@Injectable()
export class ComisionContratacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateComisionContratacionesDto, enteId: string, userId: string) {
    const { miembros, ...comisionData } = createDto;

    return this.prisma.comisionContrataciones.create({
      data: {
        ...comisionData,
        enteId,
        createdBy: userId,
        miembros:
          miembros && miembros.length > 0
            ? {
                create: miembros.map((miembro) => ({
                  ...miembro,
                })),
              }
            : undefined,
      },
      include: {
        miembros: true,
      },
    });
  }

  async findAll(enteId: string) {
    return this.prisma.comisionContrataciones.findMany({
      where: {
        enteId,
        deletedAt: null,
      },
      include: {
        miembros: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, enteId: string) {
    const comision = await this.prisma.comisionContrataciones.findFirst({
      where: {
        id,
        enteId,
        deletedAt: null,
      },
      include: {
        miembros: true,
      },
    });

    if (!comision) {
      throw new NotFoundException(`Comisión de Contrataciones con ID ${id} no encontrada`);
    }

    return comision;
  }

  async update(
    id: string,
    updateDto: UpdateComisionContratacionesDto,
    enteId: string,
    userId: string,
  ) {
    await this.findOne(id, enteId);

    // Separamos miembros para no intentar actualizar la relación directamente en este método
    // La actualización de miembros se maneja por endpoints separados o lógica específica si se requiere
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { miembros, ...comisionData } = updateDto;

    return this.prisma.comisionContrataciones.update({
      where: { id },
      data: {
        ...comisionData,
        updatedBy: userId,
      },
      include: {
        miembros: true,
      },
    });
  }

  async remove(id: string, enteId: string, userId: string) {
    await this.findOne(id, enteId);

    return this.prisma.comisionContrataciones.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });
  }

  // Métodos específicos para Miembros

  async addMiembro(comisionId: string, createMiembroDto: CreateMiembroComisionDto, enteId: string) {
    await this.findOne(comisionId, enteId); // Verificar existencia y acceso

    return this.prisma.miembroComision.create({
      data: {
        ...createMiembroDto,
        comisionId,
      },
    });
  }

  async removeMiembro(miembroId: string, enteId: string) {
    // Primero verificamos que el miembro pertenezca a una comisión del ente
    const miembro = await this.prisma.miembroComision.findFirst({
      where: {
        id: miembroId,
        comision: {
          enteId,
          deletedAt: null,
        },
      },
    });

    if (!miembro) {
      throw new NotFoundException(`Miembro con ID ${miembroId} no encontrado o sin acceso.`);
    }

    return this.prisma.miembroComision.delete({
      where: { id: miembroId },
    });
  }

  async updateMiembro(miembroId: string, updateDto: UpdateMiembroComisionDto, enteId: string) {
    const miembro = await this.prisma.miembroComision.findFirst({
      where: {
        id: miembroId,
        comision: { enteId, deletedAt: null },
      },
    });

    if (!miembro) {
      throw new NotFoundException(`Miembro con ID ${miembroId} no encontrado o sin acceso.`);
    }

    return this.prisma.miembroComision.update({
      where: { id: miembroId },
      data: updateDto,
    });
  }
}
