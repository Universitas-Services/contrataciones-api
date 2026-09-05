import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateClausulaDto, UpdateClausulaDto, QueryClausulaDto } from './dto/clausula.dto';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { TokensService } from './tokens.service';

/**
 * tb_biblioteca_clausulas_ente — cláusulas que cada ente guarda en su propia
 * biblioteca para reutilizarlas al armar el modelo de contrato.
 */
@Injectable()
export class ClausulasEnteService {
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

  private assertAccesoEnte(enteId: string, user: UsuarioActual) {
    const accesoGlobal = user.rol === 'UNIVERSITAS' || user.rol === 'SUPERVISOR';
    if (!accesoGlobal && enteId !== user.enteId) {
      throw new ForbiddenException('No tiene acceso a las cláusulas de este ente');
    }
  }

  /** La API expone `titulo` y `cuerpo`; la tabla usa nombres con sufijo. */
  private formatear(c: {
    id: string;
    enteId: string;
    tituloClausulaBib: string;
    cuerpoClausulaBib: string;
    fechaGuardadoClausulaBib: Date;
    updatedAt: Date;
  }) {
    return {
      id: c.id,
      enteId: c.enteId,
      titulo: c.tituloClausulaBib,
      cuerpo: c.cuerpoClausulaBib,
      origen: 'biblioteca' as const,
      fechaGuardado: c.fechaGuardadoClausulaBib,
      updatedAt: c.updatedAt,
    };
  }

  private async obtener(id: string, user: UsuarioActual) {
    const clausula = await this.prisma.clausulaBibliotecaEnte.findFirst({
      where: { id, deletedAt: null },
    });
    if (!clausula) throw new NotFoundException(`Cláusula ${id} no encontrada`);

    this.assertAccesoEnte(clausula.enteId, user);
    return clausula;
  }

  async findAll(enteId: string, query: QueryClausulaDto, user: UsuarioActual) {
    this.assertAccesoEnte(enteId, user);

    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ClausulaBibliotecaEnteWhereInput = {
      enteId,
      deletedAt: null,
      ...(search && {
        OR: [
          { tituloClausulaBib: { contains: search, mode: 'insensitive' } },
          { cuerpoClausulaBib: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.clausulaBibliotecaEnte.count({ where }),
      this.prisma.clausulaBibliotecaEnte.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaGuardadoClausulaBib: 'desc' },
      }),
    ]);

    return {
      data: data.map((c) => this.formatear(c)),
      meta: { total, page, lastPage: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: UsuarioActual) {
    const clausula = await this.obtener(id, user);
    return this.formatear(clausula);
  }

  async create(enteId: string, dto: CreateClausulaDto, user: UsuarioActual) {
    this.assertTokensValidos(dto.cuerpo);

    this.assertAccesoEnte(enteId, user);

    const clausula = await this.prisma.clausulaBibliotecaEnte.create({
      data: {
        enteId,
        tituloClausulaBib: dto.titulo,
        cuerpoClausulaBib: dto.cuerpo,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    return this.formatear(clausula);
  }

  async update(id: string, dto: UpdateClausulaDto, user: UsuarioActual) {
    this.assertTokensValidos(dto.cuerpo);

    await this.obtener(id, user);

    const clausula = await this.prisma.clausulaBibliotecaEnte.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { tituloClausulaBib: dto.titulo }),
        ...(dto.cuerpo !== undefined && { cuerpoClausulaBib: dto.cuerpo }),
        updatedBy: user.id,
      },
    });

    return this.formatear(clausula);
  }

  async remove(id: string, user: UsuarioActual) {
    await this.obtener(id, user);

    await this.prisma.clausulaBibliotecaEnte.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    return { message: 'Cláusula eliminada de la biblioteca del ente' };
  }
}
