import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateNormativaDto, UpdateNormativaDto, QueryNormativaDto } from './dto/normativa.dto';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

/**
 * tb_normativa_ente — normativa propia de cada ente.
 *
 * Cada ente sólo ve y modifica la suya. UNIVERSITAS y SUPERVISOR pueden
 * consultar la de cualquier ente.
 */
@Injectable()
export class NormativaEnteService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAccesoEnte(enteId: string, user: UsuarioActual) {
    const accesoGlobal = user.rol === 'UNIVERSITAS' || user.rol === 'SUPERVISOR';
    if (!accesoGlobal && enteId !== user.enteId) {
      throw new ForbiddenException('No tiene acceso a la normativa de este ente');
    }
  }

  private async obtener(id: string, user: UsuarioActual) {
    const normativa = await this.prisma.normativaEnte.findFirst({
      where: { id, deletedAt: null },
    });
    if (!normativa) throw new NotFoundException(`Normativa ${id} no encontrada`);

    this.assertAccesoEnte(normativa.enteId, user);
    return normativa;
  }

  async findAll(enteId: string, query: QueryNormativaDto, user: UsuarioActual) {
    this.assertAccesoEnte(enteId, user);

    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NormativaEnteWhereInput = {
      enteId,
      deletedAt: null,
      ...(search && {
        textoNormativaCompleto: { contains: search, mode: 'insensitive' },
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.normativaEnte.count({ where }),
      this.prisma.normativaEnte.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecCreacion: 'desc' },
      }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: UsuarioActual) {
    return this.obtener(id, user);
  }

  async create(enteId: string, dto: CreateNormativaDto, user: UsuarioActual) {
    this.assertAccesoEnte(enteId, user);

    return this.prisma.normativaEnte.create({
      data: {
        enteId,
        textoNormativaCompleto: dto.textoNormativaCompleto,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateNormativaDto, user: UsuarioActual) {
    await this.obtener(id, user);

    return this.prisma.normativaEnte.update({
      where: { id },
      data: { ...dto, updatedBy: user.id },
    });
  }

  async remove(id: string, user: UsuarioActual) {
    await this.obtener(id, user);

    await this.prisma.normativaEnte.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    return { message: 'Normativa del ente eliminada' };
  }
}
