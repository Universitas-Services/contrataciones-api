import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateEnteDto } from './dto/create-ente.dto';
import { CreateAdminEnteDto } from './dto/create-admin-ente.dto';
import { UpdateEnteDto } from './dto/update-ente.dto';

@Injectable()
export class EntesService {
  constructor(private prisma: PrismaService) {}

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
      // 1. Determinar el universitasId correcto (Organización)
      // Si el usuario creador no está en la tabla Universitas, buscamos la organización principal
      let universitasOrgId = universitasId;
      const esUniversitas = await tx.universitas.findUnique({ where: { id: universitasId } });

      if (!esUniversitas) {
        const defaultUniversitas = await tx.universitas.findFirst();
        if (!defaultUniversitas) {
          throw new ConflictException(
            'No se encontró una organización Universitas principal para asociar el Ente.',
          );
        }
        universitasOrgId = defaultUniversitas.id;
      }

      // 2. Crear Ente
      // Construir objeto de datos solo con valores definidos
      const createData: Record<string, any> = {
        nombre: enteData.nombre,
        universitasId: universitasOrgId,
        createdBy: universitasId,
      };

      // Agregar campos opcionales solo si están definidos
      if (enteData.rif !== undefined) createData.rif = enteData.rif;
      if (enteData.siglas !== undefined) createData.siglas = enteData.siglas;
      if (enteData.logoUrl !== undefined) createData.logoUrl = enteData.logoUrl;
      if (enteData.direccionFiscal !== undefined)
        createData.direccionFiscal = enteData.direccionFiscal;
      if (enteData.estado !== undefined) createData.estado = enteData.estado;
      if (enteData.municipio !== undefined) createData.municipio = enteData.municipio;
      if (enteData.parroquia !== undefined) createData.parroquia = enteData.parroquia;
      if (enteData.ciudad !== undefined) createData.ciudad = enteData.ciudad;

      const ente = await tx.entePublico.create({
        data: createData as any,
      });

      // 3. Crear Usuario Admin Ente vinculado
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

  async createAdmin(enteId: string, adminData: CreateAdminEnteDto) {
    // Verificar que el Ente existe
    const ente = await this.prisma.entePublico.findUnique({
      where: { id: enteId, deletedAt: null },
    });

    if (!ente) throw new NotFoundException('Ente no encontrado');

    // Verificar si el email ya existe
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: adminData.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado para otro usuario');
    }

    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    return this.prisma.usuario.create({
      data: {
        enteId: ente.id,
        email: adminData.email,
        passwordHash: hashedPassword,
        nombre: adminData.nombre,
        apellido: adminData.apellido,
        rol: 'ADMIN_ENTE',
        activo: true,
      },
    });
  }

  async findAll(user?: { rol: string; id?: string; enteId?: string }) {
    const whereClause: any = { deletedAt: null };

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
      where: whereClause as Prisma.EntePublicoWhereInput,
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

  async findAvailable() {
    return this.prisma.entePublico.findMany({
      where: {
        deletedAt: null,
        supervisoresAsignados: {
          none: {}, // Filtra Entes que NO tienen registros en la tabla pivote
        },
      },
      select: {
        id: true,
        nombre: true,
        rif: true,
        estado: true,
        municipio: true,
      },
      orderBy: {
        nombre: 'asc',
      },
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

  async update(id: string, updateEnteDto: UpdateEnteDto, userId: string) {
    // Verificar que el Ente existe
    await this.findOne(id);

    return this.prisma.entePublico.update({
      where: { id },
      data: {
        ...updateEnteDto,
        datosConfirmados: true,
        updatedBy: userId,
      },
    });
  }

  async updateLogo(id: string, logoUrl: string, userId: string) {
    // Verificar que el Ente existe
    await this.findOne(id);

    return this.prisma.entePublico.update({
      where: { id },
      data: {
        logoUrl,
        updatedBy: userId,
      },
    });
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
