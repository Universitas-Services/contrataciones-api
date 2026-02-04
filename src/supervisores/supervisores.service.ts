import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { AsignarEntesDto } from './dto/asignar-entes.dto';

@Injectable()
export class SupervisoresService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateSupervisorDto, createdBy: string) {
    // Verificar que el email no esté en uso
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar que todos los Entes existan
    const entes = await this.prisma.entePublico.findMany({
      where: { id: { in: createDto.entesIds } },
    });

    if (entes.length !== createDto.entesIds.length) {
      throw new BadRequestException('Algunos Entes especificados no existen');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createDto.password, 10);

    // Crear supervisor y asignaciones en transacción
    const supervisor = await this.prisma.$transaction(async (tx) => {
      // Crear usuario con rol SUPERVISOR
      const newSupervisor = await tx.usuario.create({
        data: {
          nombre: createDto.nombre,
          apellido: createDto.apellido,
          email: createDto.email,
          passwordHash,
          rol: 'SUPERVISOR',
          activo: true,
        },
      });

      // Crear asignaciones de Entes
      const asignaciones = createDto.entesIds.map((enteId) => ({
        supervisorId: newSupervisor.id,
        enteId,
        createdBy,
      }));

      await tx.supervisorAsignacion.createMany({
        data: asignaciones,
      });

      return newSupervisor;
    });

    // Retornar supervisor con Entes asignados
    return this.findOne(supervisor.id);
  }

  async findAll() {
    const supervisores = await this.prisma.usuario.findMany({
      where: {
        rol: 'SUPERVISOR',
        deletedAt: null,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        activo: true,
        createdAt: true,
        _count: {
          select: {
            entesAsignados: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return supervisores.map((s) => ({
      id: s.id,
      nombre: `${s.nombre} ${s.apellido}`,
      email: s.email,
      activo: s.activo,
      cantidadEntesAsignados: s._count.entesAsignados,
      createdAt: s.createdAt,
    }));
  }

  async findOne(id: string) {
    const supervisor = await this.prisma.usuario.findFirst({
      where: {
        id,
        rol: 'SUPERVISOR',
        deletedAt: null,
      },
      include: {
        entesAsignados: {
          include: {
            ente: {
              select: {
                id: true,
                nombre: true,
                siglas: true,
                rif: true,
              },
            },
          },
        },
      },
    });

    if (!supervisor) {
      throw new NotFoundException('Supervisor no encontrado');
    }

    return {
      id: supervisor.id,
      nombre: `${supervisor.nombre} ${supervisor.apellido}`,
      email: supervisor.email,
      activo: supervisor.activo,
      rol: supervisor.rol,
      entesAsignados: supervisor.entesAsignados.map((asignacion) => ({
        ...asignacion.ente,
        asignadoEn: asignacion.createdAt,
      })),
    };
  }

  async asignarEntes(supervisorId: string, dto: AsignarEntesDto, updatedBy: string) {
    // Verificar que el supervisor exista
    const supervisor = await this.prisma.usuario.findFirst({
      where: {
        id: supervisorId,
        rol: 'SUPERVISOR',
        deletedAt: null,
      },
    });

    if (!supervisor) {
      throw new NotFoundException('Supervisor no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      // Remover asignaciones
      if (dto.removerEntes && dto.removerEntes.length > 0) {
        await tx.supervisorAsignacion.deleteMany({
          where: {
            supervisorId,
            enteId: { in: dto.removerEntes },
          },
        });
      }

      // Agregar nuevas asignaciones
      if (dto.agregarEntes && dto.agregarEntes.length > 0) {
        // Verificar que los Entes existan
        const entes = await tx.entePublico.findMany({
          where: { id: { in: dto.agregarEntes } },
        });

        if (entes.length !== dto.agregarEntes.length) {
          throw new BadRequestException('Algunos Entes especificados no existen');
        }

        // Crear asignaciones (ignora duplicados)
        for (const enteId of dto.agregarEntes) {
          await tx.supervisorAsignacion.upsert({
            where: {
              supervisorId_enteId: {
                supervisorId,
                enteId,
              },
            },
            create: {
              supervisorId,
              enteId,
              createdBy: updatedBy,
            },
            update: {
              updatedBy,
              updatedAt: new Date(),
            },
          });
        }
      }
    });

    return this.findOne(supervisorId);
  }

  async remove(id: string, deletedBy: string) {
    const supervisor = await this.prisma.usuario.findFirst({
      where: {
        id,
        rol: 'SUPERVISOR',
        deletedAt: null,
      },
    });

    if (!supervisor) {
      throw new NotFoundException('Supervisor no encontrado');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    });

    return {
      message: 'Supervisor eliminado correctamente',
      id,
    };
  }

  // Método auxiliar para verificar si un supervisor tiene acceso a un Ente
  async tieneAccesoAEnte(supervisorId: string, enteId: string): Promise<boolean> {
    const asignacion = await this.prisma.supervisorAsignacion.findUnique({
      where: {
        supervisorId_enteId: {
          supervisorId,
          enteId,
        },
      },
    });

    return !!asignacion;
  }

  // Método auxiliar para obtener todos los Entes asignados a un supervisor
  async getEntesAsignados(supervisorId: string): Promise<string[]> {
    const asignaciones = await this.prisma.supervisorAsignacion.findMany({
      where: { supervisorId },
      select: { enteId: true },
    });

    return asignaciones.map((a) => a.enteId);
  }
}
