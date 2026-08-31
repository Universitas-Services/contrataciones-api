import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ExpedienteAccessService } from '../common/services/expediente-access.service';
import { CreatePresupuestoItemDto } from './dto/create-presupuesto-item.dto';
import { UpdatePresupuestoItemDto } from './dto/update-presupuesto-item.dto';
import { QueryPresupuestoItemDto } from './dto/query-presupuesto-item.dto';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@Injectable()
export class PresupuestoItemService {
  private readonly IVA_RATE = 0.16; // 16%

  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: ExpedienteAccessService,
  ) {}

  private async invalidarDocumentos(expedienteId: string) {
    await this.prisma.documentoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
    await this.prisma.pliegoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
  }

  /**
   * Recalcula el total del presupuesto del expediente a partir de sus ítems
   * vigentes y lo persiste en el expediente.
   */
  private async sincronizarTotalPresupuesto(expedienteId: string) {
    const aggregate = await this.prisma.presupuestoItem.aggregate({
      where: { expedienteId, deletedAt: null },
      _sum: { totalItem: true },
    });

    await this.prisma.expedienteContratacion.update({
      where: { id: expedienteId },
      data: { totalPresupuesto: aggregate._sum.totalItem ?? 0 },
    });
  }

  private async despuesDeMutar(expedienteId: string) {
    await this.sincronizarTotalPresupuesto(expedienteId);
    await this.invalidarDocumentos(expedienteId);
  }

  async create(expedienteId: string, dto: CreatePresupuestoItemDto, user: UsuarioActual) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);

    // Calculo automático del total del item
    const totalItem = dto.cantidadRequerida * dto.precioUnitarioEstimado;

    const result = await this.prisma.presupuestoItem.create({
      data: {
        expedienteId,
        descripcionItem: dto.descripcionItem,
        codigoPartida: dto.codigoPartida,
        unidadMedida: dto.unidadMedida,
        cantidadRequerida: dto.cantidadRequerida,
        precioUnitarioEstimado: dto.precioUnitarioEstimado,
        totalItem,
      },
    });

    await this.despuesDeMutar(expedienteId);
    return result;
  }

  async findAllByExpedienteId(
    expedienteId: string,
    query: QueryPresupuestoItemDto,
    user: UsuarioActual,
  ) {
    await this.acceso.assertAcceso(expedienteId, user.enteId, user.rol);

    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PresupuestoItemWhereInput = {
      expedienteId,
      deletedAt: null,
      ...(search && {
        OR: [
          { descripcionItem: { contains: search, mode: 'insensitive' } },
          { codigoPartida: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // 1. Obtener items paginados y conteo total para la meta
    const [total, items] = await Promise.all([
      this.prisma.presupuestoItem.count({ where }),
      this.prisma.presupuestoItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // 2. Calcular Totales del Expediente (siempre del expediente completo, no solo de lo filtrado/paginado)
    const aggregate = await this.prisma.presupuestoItem.aggregate({
      where: { expedienteId, deletedAt: null },
      _sum: { totalItem: true },
    });

    const subtotal = Number(aggregate._sum.totalItem || 0);

    // Calcular Impuesto y Total "Al Vuelo"
    const impuestoMonto = subtotal * this.IVA_RATE;
    const montoTotal = subtotal + impuestoMonto;

    return {
      items,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
      totales: {
        subtotal,
        porcentajeIvaAplicado: this.IVA_RATE * 100,
        // Alias con el nombre mal escrito que consume el front actual. Retirar
        // cuando el front migre a porcentajeIvaAplicado.
        porcentajeIvaApicado: this.IVA_RATE * 100,
        montoIva: impuestoMonto,
        montoTotal,
      },
    };
  }

  async findAll(query: QueryPresupuestoItemDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PresupuestoItemWhereInput = {
      deletedAt: null,
      ...(search && {
        OR: [
          { descripcionItem: { contains: search, mode: 'insensitive' } },
          { codigoPartida: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, data] = await Promise.all([
      this.prisma.presupuestoItem.count({ where }),
      this.prisma.presupuestoItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdatePresupuestoItemDto, user: UsuarioActual) {
    const existing = await this.prisma.presupuestoItem.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Item de presupuesto no encontrado');

    await this.acceso.assertAcceso(existing.expedienteId, user.enteId, user.rol);

    const newCantidad = dto.cantidadRequerida ?? Number(existing.cantidadRequerida);
    const newPrecio = dto.precioUnitarioEstimado ?? Number(existing.precioUnitarioEstimado);
    const totalItem = newCantidad * newPrecio;

    const result = await this.prisma.presupuestoItem.update({
      where: { id },
      data: {
        ...dto,
        totalItem,
      },
    });

    await this.despuesDeMutar(existing.expedienteId);
    return result;
  }

  async remove(id: string, user: UsuarioActual) {
    const existing = await this.prisma.presupuestoItem.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Item de presupuesto no encontrado');

    await this.acceso.assertAcceso(existing.expedienteId, user.enteId, user.rol);

    const result = await this.prisma.presupuestoItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.despuesDeMutar(existing.expedienteId);
    return result;
  }
}
