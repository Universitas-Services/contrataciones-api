import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateFasePreparatoriaDto } from './dto/create-fase-preparatoria.dto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FasePreparatoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async findByExpedienteId(expedienteId: string) {
    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
      // include: {
      //   presupuestoItems: true, // Ya no pertenece a FasePreparatoria, sino a ExpedienteContratacion
      // }
    });

    if (!fase) {
      throw new NotFoundException(
        `Fase Preparatoria no encontrada para el expediente ${expedienteId}`,
      );
    }

    return fase;
  }

  async upsertByExpedienteId(expedienteId: string, dto: CreateFasePreparatoriaDto) {
    // Validaciones de negocio: Si pliego no es gratuito, deben venir banco, cuenta, titular
    if (dto.pliegoGratuito === false) {
      if (!dto.bancoPagoPliego || !dto.cuentaPagoPliego || !dto.titularPagoPliego) {
        throw new BadRequestException(
          'Los datos de pago son obligatorios si el pliego no es gratuito.',
        );
      }
    }

    // Convert string to Date
    const fechaActa = dto.fechaActaInicio ? new Date(dto.fechaActaInicio) : undefined;

    const data = {
      ...dto,
      fechaActaInicio: fechaActa,
    };

    // Upsert using expedienteId (which is @unique in schema)
    const result = await this.prisma.fasePreparatoria.upsert({
      where: { expedienteId },
      create: {
        ...data,
        expediente: { connect: { id: expedienteId } },
      },
      update: {
        ...data,
      },
      // include: {
      //   presupuestoItems: true,
      // }
    });

    // Invalidar documentos generados
    await this.prisma.documentoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
    await this.prisma.pliegoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });

    return result;
  }
}
