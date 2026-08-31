import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCuentaBancariaDto, UpdateCuentaBancariaDto } from './dto/cuenta-bancaria.dto';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

/**
 * Cuentas bancarias registradas por el Ente. Alimentan la selección de cuenta
 * de pago del pliego en el micromódulo "Llamado" de la Fase 1.
 */
@Injectable()
export class CuentasBancariasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resuelve sobre qué ente opera el usuario y valida que tenga permiso. */
  private resolverEnte(enteIdSolicitado: string, user: UsuarioActual) {
    const accesoGlobal = user.rol === 'UNIVERSITAS' || user.rol === 'SUPERVISOR';
    if (!accesoGlobal && enteIdSolicitado !== user.enteId) {
      throw new ForbiddenException('No tiene acceso a las cuentas bancarias de este ente');
    }
    return enteIdSolicitado;
  }

  private async obtenerCuenta(id: string, user: UsuarioActual) {
    const cuenta = await this.prisma.cuentaBancariaEnte.findFirst({
      where: { id, deletedAt: null },
    });
    if (!cuenta) throw new NotFoundException(`Cuenta bancaria ${id} no encontrada`);

    this.resolverEnte(cuenta.enteId, user);
    return cuenta;
  }

  async findAll(enteId: string, user: UsuarioActual) {
    this.resolverEnte(enteId, user);

    return this.prisma.cuentaBancariaEnte.findMany({
      where: { enteId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(enteId: string, dto: CreateCuentaBancariaDto, user: UsuarioActual) {
    this.resolverEnte(enteId, user);

    return this.prisma.cuentaBancariaEnte.create({
      data: {
        ...dto,
        ente: { connect: { id: enteId } },
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateCuentaBancariaDto, user: UsuarioActual) {
    await this.obtenerCuenta(id, user);

    return this.prisma.cuentaBancariaEnte.update({
      where: { id },
      data: { ...dto, updatedBy: user.id },
    });
  }

  async remove(id: string, user: UsuarioActual) {
    await this.obtenerCuenta(id, user);

    await this.prisma.cuentaBancariaEnte.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    });

    return { message: 'Cuenta bancaria eliminada exitosamente' };
  }
}
