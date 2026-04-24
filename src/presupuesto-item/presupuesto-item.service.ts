import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreatePresupuestoItemDto } from './dto/create-presupuesto-item.dto';
import { UpdatePresupuestoItemDto } from './dto/update-presupuesto-item.dto';
import { QueryPresupuestoItemDto } from './dto/query-presupuesto-item.dto';

@Injectable()
export class PresupuestoItemService {
  private readonly IVA_RATE = 0.16; // 16%

  constructor(private readonly prisma: PrismaService) {}

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

  async create(expedienteId: string, dto: CreatePresupuestoItemDto) {
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

    await this.invalidarDocumentos(expedienteId);
    return result;
  }

  async findAllByExpedienteId(expedienteId: string, query: QueryPresupuestoItemDto) {
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

  async update(id: string, dto: UpdatePresupuestoItemDto) {
    const existing = await this.prisma.presupuestoItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item de presupuesto no encontrado');

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

    await this.invalidarDocumentos(existing.expedienteId);
    return result;
  }

  async remove(id: string) {
    const existing = await this.prisma.presupuestoItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item de presupuesto no encontrado');

    const result = await this.prisma.presupuestoItem.delete({
      where: { id },
    });

    await this.invalidarDocumentos(existing.expedienteId);
    return result;
  }
}
