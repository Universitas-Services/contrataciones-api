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
    const {
      nombreOrganizacion,
      rifOrganizacion,
      emailOrganizacion,
      nombreUsuario,
      apellidoUsuario,
      emailUsuario,
      password,
      entesIds,
    } = createDto;

    // 1. Validaciones previas
    const existingOrg = await this.prisma.supervisor.findFirst({
      where: {
        OR: [{ rif: rifOrganizacion }, { email: emailOrganizacion }],
      },
    });

    if (existingOrg) {
      throw new ConflictException('Ya existe una Organización Supervisora con ese RIF o Email');
    }

    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: emailUsuario },
    });

    if (existingUser) {
      throw new ConflictException('El email del usuario supervisor ya está registrado');
    }

    // Verificar Entes
    const entes = await this.prisma.entePublico.findMany({
      where: { id: { in: entesIds } },
    });

    if (entes.length !== entesIds.length) {
      throw new BadRequestException('Algunos Entes especificados no existen');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 2. Transacción de creación
    return this.prisma.$transaction(async (tx) => {
      // A. Crear Organización Supervisora
      const supervisorOrg = await tx.supervisor.create({
        data: {
          nombre: nombreOrganizacion,
          rif: rifOrganizacion,
          email: emailOrganizacion,
        },
      });

      // B. Asignar Entes a la Organización (Tabla EnteSupervisor)
      // Nota: Asumimos fecha inicio hoy, fecha fin 1 año por defecto o indefinido
      const relacionEntes = entesIds.map((enteId) => ({
        enteId,
        supervisorId: supervisorOrg.id,
        fechaInicio: new Date(),
        createdBy,
      }));

      await tx.enteSupervisor.createMany({
        data: relacionEntes,
      });

      // C. Crear Usuario Supervisor vinculado a la Organización
      const usuarioSupervisor = await tx.usuario.create({
        data: {
          supervisorId: supervisorOrg.id,
          nombre: nombreUsuario,
          apellido: apellidoUsuario,
          email: emailUsuario,
          passwordHash,
          rol: 'SUPERVISOR',
          activo: true,
        },
      });

      // D. (Opcional) Crear asignaciones directas al usuario para compatibilidad actual
      // Aunque con la relación usuario->org->ente sería suficiente, mantendremos
      // SupervisorAsignacion para que la lógica actual de permisos siga funcionando sin cambios masivos
      const asignacionesUsuario = entesIds.map((enteId) => ({
        supervisorId: usuarioSupervisor.id,
        enteId,
        createdBy,
      }));

      await tx.supervisorAsignacion.createMany({
        data: asignacionesUsuario,
      });

      return usuarioSupervisor;
    });
  }

  // Modificado para obtener data incluyendo la org
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

  async remove(id: string) {
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

  // Nuevo: Obtener detalles de los entes asignados al supervisor actual
  async getMisEntes(supervisorId: string) {
    const asignaciones = await this.prisma.supervisorAsignacion.findMany({
      where: { supervisorId },
      include: {
        ente: {
          select: {
            id: true,
            nombre: true,
            rif: true,
            siglas: true,
            logoUrl: true,
            estado: true,
            municipio: true,
            _count: {
              select: {
                expedientes: true,
                usuarios: true,
              },
            },
          },
        },
      },
      orderBy: {
        ente: {
          nombre: 'asc',
        },
      },
    });

    return asignaciones.map((a) => ({
      ...a.ente,
      asignadoEn: a.createdAt,
    }));
  }
}
