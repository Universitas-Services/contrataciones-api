import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEnteDto } from './dto/create-ente.dto';

@Injectable()
export class EntesService {
  constructor(private prisma: PrismaService) {}

  async create(createEnteDto: CreateEnteDto, universitasId: string) {
    return this.prisma.entePublico.create({
      data: {
        ...createEnteDto,
        universitasId,
        createdBy: universitasId,
      },
    });
  }

  async findAll(user?: { rol: string; id?: string; enteId?: string }) {
    let whereClause: any = { deletedAt: null };

    if (user) {
      if (user.rol === 'SUPERVISOR' && user.id) {
        // Supervisor: Solo ve Entes asignados
        const asignaciones = await this.prisma.supervisorAsignacion.findMany({
          where: { supervisorId: user.id },
          select: { enteId: true },
        });

        const entesIds = asignaciones.map((a) => a.enteId);

        whereClause.id = { in: entesIds };
      } else if (user.rol !== 'UNIVERSITAS' && user.enteId) {
        // Otros roles: Solo ven su Ente
        whereClause.id = user.enteId;
      }
      // UNIVERSITAS: No agrega filtro (ve todos)
    }

    return this.prisma.entePublico.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            usuarios: true,
            expedientes: true,
            proveedores: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ente = await this.prisma.entePublico.findFirst({
      where: { id, deletedAt: null },
      include: {
        usuarios: {
          where: { deletedAt: null },
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            rol: true,
            activo: true,
          },
        },
        maximasAutoridades: {
          where: { vigente: true, deletedAt: null },
        },
        comisiones: {
          where: { deletedAt: null },
          include: { miembros: true },
        },
      },
    });

    if (!ente) {
      throw new NotFoundException(`Ente con ID ${id} no encontrado`);
    }

    return ente;
  }

  async remove(id: string, userId: string) {
    return this.prisma.entePublico.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });
  }
}
