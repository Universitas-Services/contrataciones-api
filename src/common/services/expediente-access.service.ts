import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Centraliza la verificación de que un expediente exista y sea accesible
 * para el usuario autenticado. UNIVERSITAS y SUPERVISOR no están acotados
 * a un solo ente; el resto de roles solo ve expedientes de su propio ente.
 */
@Injectable()
export class ExpedienteAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAcceso(expedienteId: string, enteId: string, rol: RolUsuario) {
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, deletedAt: null },
      select: { id: true, enteId: true, estatusProceso: true, modalidadId: true },
    });

    if (!expediente) {
      throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);
    }

    const accesoGlobal = rol === 'UNIVERSITAS' || rol === 'SUPERVISOR';
    if (!accesoGlobal && expediente.enteId !== enteId) {
      throw new ForbiddenException('No tiene acceso a este expediente');
    }

    return expediente;
  }
}
