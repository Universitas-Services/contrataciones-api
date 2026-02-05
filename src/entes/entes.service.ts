import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateEnteDto } from './dto/create-ente.dto';

@Injectable()
export class EntesService {
  constructor(private prisma: PrismaService) { }

  async create(createEnteDto: CreateEnteDto, universitasId: string) {
    const { emailContacto, password, nombreAdmin, apellidoAdmin, ...enteData } = createEnteDto;

    // Verificar si el email ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: emailContacto },
    });

    if (existingUser) {
      throw new ConflictException('El email del administrador ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Transacción para crear Ente y Usuario Admin
    return this.prisma.$transaction(async (tx) => {
      // 1. Crear Ente
      // Construir objeto de datos solo con valores definidos
      const createData: Record<string, any> = {
        nombre: enteData.nombre,
        universitasId,
        createdBy: universitasId,
      };

      // Agregar campos opcionales solo si están definidos
      if (enteData.rif !== undefined) createData.rif = enteData.rif;
      if (enteData.siglas !== undefined) createData.siglas = enteData.siglas;
      if (enteData.logoUrl !== undefined) createData.logoUrl = enteData.logoUrl;
      if (enteData.direccionFiscal !== undefined) createData.direccionFiscal = enteData.direccionFiscal;
      if (enteData.estado !== undefined) createData.estado = enteData.estado;
      if (enteData.municipio !== undefined) createData.municipio = enteData.municipio;
      if (enteData.parroquia !== undefined) createData.parroquia = enteData.parroquia;

      const ente = await tx.entePublico.create({
        data: createData as any,
      });

      // 2. Crear Usuario Admin Ente vinculado
      await tx.usuario.create({
        data: {
          enteId: ente.id,
          email: emailContacto,
          passwordHash: hashedPassword,
          nombre: nombreAdmin,
          apellido: apellidoAdmin,
          rol: 'ADMIN_ENTE',
          activo: true,
        },
      });

      return ente;
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

  async restore(id: string, userId: string) {
    return this.prisma.entePublico.update({
      where: { id },
      data: {
        deletedAt: null,
        updatedBy: userId,
      },
    });
  }
}
