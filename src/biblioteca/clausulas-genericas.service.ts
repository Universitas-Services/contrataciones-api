import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateClausulaDto, UpdateClausulaDto, QueryClausulaDto } from './dto/clausula.dto';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { TokensService } from './tokens.service';

/**
 * tb_clausulas_genericas_ente — cláusulas modelo que administra UNIVERSITAS y
 * quedan disponibles para todos los entes al armar el modelo de contrato.
 */
@Injectable()
export class ClausulasGenericasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  /**
   * Verifica que todos los datos entre corchetes existan en el catálogo. Si
   * se colara uno inválido, el documento final saldría con el corchete crudo
   * sin que nadie lo note.
   */
  private assertTokensValidos(cuerpo?: string) {
    if (!cuerpo) return;
    const resultado = this.tokens.validar(cuerpo);
    if (!resultado.valido) {
      throw new BadRequestException({
        message: 'La cláusula contiene datos entre corchetes que no existen.',
        errores: resultado.errores,
      });
    }
  }

  private async resolverAdminUniversitas(): Promise<string> {
    const admin = await this.prisma.universitas.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!admin) {
      throw new BadRequestException(
        'No hay una instancia de Universitas registrada para asociar la cláusula.',
      );
    }
    return admin.id;
  }

  /** La API expone `titulo` y `cuerpo`; la tabla usa nombres con sufijo. */
  private formatear(c: {
    id: string;
    tituloClausulaGenerica: string;
    cuerpoClausulaGenerica: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: c.id,
      titulo: c.tituloClausulaGenerica,
      cuerpo: c.cuerpoClausulaGenerica,
      origen: 'generica' as const,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async findAll(query: QueryClausulaDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ClausulaGenericaWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { tituloClausulaGenerica: { contains: search, mode: 'insensitive' } },
          { cuerpoClausulaGenerica: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.clausulaGenerica.count({ where }),
      this.prisma.clausulaGenerica.findMany({
        where,
        skip,
        take: limit,
        orderBy: { tituloClausulaGenerica: 'asc' },
      }),
    ]);

    return {
      data: data.map((c) => this.formatear(c)),
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const clausula = await this.prisma.clausulaGenerica.findFirst({
      where: { id, deletedAt: null },
    });
    if (!clausula) throw new NotFoundException(`Cláusula genérica ${id} no encontrada`);
    return this.formatear(clausula);
  }

  async create(dto: CreateClausulaDto, user: UsuarioActual) {
    this.assertTokensValidos(dto.cuerpo);

    const adminUniversitasId = await this.resolverAdminUniversitas();

    const clausula = await this.prisma.clausulaGenerica.create({
      data: {
        tituloClausulaGenerica: dto.titulo,
        cuerpoClausulaGenerica: dto.cuerpo,
        adminUniversitasId,
        updatedBy: user.id,
      },
    });

    return this.formatear(clausula);
  }

  async update(id: string, dto: UpdateClausulaDto, user: UsuarioActual) {
    this.assertTokensValidos(dto.cuerpo);

    await this.findOne(id);

    const clausula = await this.prisma.clausulaGenerica.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { tituloClausulaGenerica: dto.titulo }),
        ...(dto.cuerpo !== undefined && { cuerpoClausulaGenerica: dto.cuerpo }),
        updatedBy: user.id,
      },
    });

    return this.formatear(clausula);
  }

  async remove(id: string, user: UsuarioActual) {
    await this.findOne(id);

    await this.prisma.clausulaGenerica.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    return { message: 'Cláusula genérica eliminada' };
  }
}
