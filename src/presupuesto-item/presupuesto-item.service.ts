import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePresupuestoItemDto } from './dto/create-presupuesto-item.dto';
import { UpdatePresupuestoItemDto } from './dto/update-presupuesto-item.dto';

@Injectable()
export class PresupuestoItemService {
  private readonly IVA_RATE = 0.16; // 16%

  constructor(private readonly prisma: PrismaService) {}

  async create(expedienteId: string, dto: CreatePresupuestoItemDto) {
    // Calculo automático del total del item
    const totalItem = dto.cantidadRequerida * dto.precioUnitarioEstimado;

    return this.prisma.presupuestoItem.create({
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
  }

  async findAllByExpedienteId(expedienteId: string) {
    const items = await this.prisma.presupuestoItem.findMany({
      where: { expedienteId },
    });

    // Calcular Subtotal sumando todos los items
    const subtotal = items.reduce((acc, item) => acc + Number(item.totalItem), 0);

    // Calcular Impuesto y Total "Al Vuelo"
    const impuestoMonto = subtotal * this.IVA_RATE;
    const montoTotal = subtotal + impuestoMonto;

    return {
      items,
      totales: {
        subtotal,
        porcentajeIvaApicado: this.IVA_RATE * 100, // Ej: 16
        montoIva: impuestoMonto,
        montoTotal,
      },
    };
  }

  async update(id: string, dto: UpdatePresupuestoItemDto) {
    const existing = await this.prisma.presupuestoItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item de presupuesto no encontrado');

    const newCantidad = dto.cantidadRequerida ?? Number(existing.cantidadRequerida);
    const newPrecio = dto.precioUnitarioEstimado ?? Number(existing.precioUnitarioEstimado);
    const totalItem = newCantidad * newPrecio;

    return this.prisma.presupuestoItem.update({
      where: { id },
      data: {
        ...dto,
        totalItem,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.presupuestoItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item de presupuesto no encontrado');

    return this.prisma.presupuestoItem.delete({
      where: { id },
    });
  }
}
