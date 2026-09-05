import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CreateNormativaGlobalDto,
  UpdateNormativaGlobalDto,
  QueryNormativaGlobalDto,
} from './dto/normativa.dto';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

/**
 * tb_normativa_global — normativa que administra UNIVERSITAS.
 *
 * Es de lectura para todos los entes y de escritura sólo para UNIVERSITAS; esa
 * restricción se aplica con @Roles en el controlador.
 */
@Injectable()
export class NormativaGlobalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve el administrador de Universitas que queda como autor del registro.
   * El usuario autenticado con rol UNIVERSITAS no es una fila de la tabla
   * Universitas, así que se toma la instancia vigente.
   */
  private async resolverAdminUniversitas(): Promise<string> {
    const admin = await this.prisma.universitas.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!admin) {
      throw new BadRequestException(
        'No hay una instancia de Universitas registrada para asociar la normativa.',
      );
    }
    return admin.id;
  }

  async findAll(query: QueryNormativaGlobalDto) {
    const { page = 1, limit = 10, search, indActivo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NormativaGlobalWhereInput = {
      deletedAt: null,
      ...(indActivo !== undefined && { indActivo }),
      ...(search && {
        textoNormativaCompleto: { contains: search, mode: 'insensitive' },
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.normativaGlobal.count({ where }),
      this.prisma.normativaGlobal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecCreacion: 'desc' },
      }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const normativa = await this.prisma.normativaGlobal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!normativa) throw new NotFoundException(`Normativa global ${id} no encontrada`);
    return normativa;
  }

  async create(dto: CreateNormativaGlobalDto, user: UsuarioActual) {
    const adminUniversitasId = await this.resolverAdminUniversitas();

    return this.prisma.normativaGlobal.create({
      data: {
        textoNormativaCompleto: dto.textoNormativaCompleto,
        indActivo: dto.indActivo ?? true,
        adminUniversitasId,
        updatedBy: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateNormativaGlobalDto, user: UsuarioActual) {
    await this.findOne(id);

    return this.prisma.normativaGlobal.update({
      where: { id },
      data: { ...dto, updatedBy: user.id },
    });
  }

  async remove(id: string, user: UsuarioActual) {
    await this.findOne(id);

    await this.prisma.normativaGlobal.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    return { message: 'Normativa global eliminada' };
  }
}
