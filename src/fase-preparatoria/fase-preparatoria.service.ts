import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateFasePreparatoriaDto } from './dto/create-fase-preparatoria.dto';
import { PrismaService } from '../database/prisma.service';
import { ExpedienteAccessService } from '../common/services/expediente-access.service';
import { RolUsuario } from '@prisma/client';

@Injectable()
export class FasePreparatoriaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: ExpedienteAccessService,
  ) {}

  private formatFasePreparatoriaResponse(fase: any) {
    if (!fase) return fase;
    let normativaLegal: string[] | null = null;
    if (fase.normativaLegal) {
      const raw = String(fase.normativaLegal).trim();
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.map((i) => String(i).trim()).filter(Boolean);
            normativaLegal = cleaned.length > 0 ? cleaned : null;
          } else if (raw.length > 0) {
            normativaLegal = [raw];
          }
        } catch {
          normativaLegal = [raw];
        }
      } else if (raw.length > 0) {
        normativaLegal = [raw];
      }
    }
    return {
      ...fase,
      normativaLegal,
    };
  }

  async findByExpedienteId(expedienteId: string, enteId: string, rol: RolUsuario) {
    await this.acceso.assertAcceso(expedienteId, enteId, rol);

    const fase = await this.prisma.fasePreparatoria.findUnique({
      where: { expedienteId },
    });

    if (!fase) {
      throw new NotFoundException(
        `Fase Preparatoria no encontrada para el expediente ${expedienteId}`,
      );
    }

    return this.formatFasePreparatoriaResponse(fase);
  }

  async upsertByExpedienteId(
    expedienteId: string,
    dto: CreateFasePreparatoriaDto,
    userId: string,
    enteId: string,
    rol: RolUsuario,
  ) {
    await this.acceso.assertAcceso(expedienteId, enteId, rol);

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

    let normativaLegalDb: string | null = null;
    const rawNormative: unknown = dto.normativaLegal;
    if (Array.isArray(rawNormative) && rawNormative.length > 0) {
      normativaLegalDb = JSON.stringify(rawNormative);
    } else if (typeof rawNormative === 'string' && rawNormative.trim()) {
      normativaLegalDb = rawNormative.trim();
    }

    const data = {
      ...dto,
      fechaActaInicio: fechaActa,
      normativaLegal: normativaLegalDb,
    };

    // Upsert using expedienteId (which is @unique in schema)
    const result = await this.prisma.fasePreparatoria.upsert({
      where: { expedienteId },
      create: {
        ...data,
        createdBy: userId,
        updatedBy: userId,
        expediente: { connect: { id: expedienteId } },
      },
      update: {
        ...data,
        updatedBy: userId,
      },
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

    return this.formatFasePreparatoriaResponse(result);
  }
}
