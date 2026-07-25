import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOfertaPresentadaDto } from './dto/create-oferta-presentada.dto';
import { UpdateOfertaPresentadaDto } from './dto/update-oferta-presentada.dto';
import { ProveedoresService } from '../proveedores/proveedores.service';

@Injectable()
export class OfertaPresentadaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly proveedoresService: ProveedoresService,
  ) {}

  private async invalidarDocumentos(expedienteId: string) {
    await this.prisma.documentoGenerado.updateMany({
      where: {
        expedienteId,
        deletedAt: null,
        tipoDocumento: { in: ['ACTA_RECEPCION', 'ACTA_APERTURA'] },
      },
      data: { estaDesactualizado: true },
    });
  }

  /**
   * Crear una oferta presentada.
   */
  async create(dto: CreateOfertaPresentadaDto, userId: string, enteId: string) {
    // 1. Verificar el expediente
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: dto.expedienteId, enteId, deletedAt: null },
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado o no pertenece a este ente');
    }

    // 1.5. Verificar que no exista otra oferta con el mismo RIF para este expediente
    const ofertaExistente = await this.prisma.ofertaPresentada.findFirst({
      where: {
        expedienteId: dto.expedienteId,
        rifProveedorOferente: dto.rifProveedorOferente,
        deletedAt: null,
      },
    });

    if (ofertaExistente) {
      throw new ConflictException(
        `El proveedor con RIF ${dto.rifProveedorOferente} ya ha presentado una oferta para este expediente.`,
      );
    }

    // 2. Manejo de Proveedor y Registro Express
    let proveedorId = dto.proveedorId;

    if (!proveedorId) {
      // Si no viene el ID, intentamos registro expreso usando los datos de la oferta
      const resRegistro = await this.proveedoresService.registroRapido(
        {
          rif: dto.rifProveedorOferente,
          nombre: dto.nombreProveedorOferente,
          nombreRepLegal: dto.nombreRepLegalOferente,
          cedulaRepLegal: dto.cedulaRepLegalOferente,
          datosRegistroMercantil: dto.datosRegistroMercantilProveedorOferente,
        },
        userId,
        enteId,
      );
      proveedorId = resRegistro.id;
    } else {
      // Si viene el ID, validar que exista
      const proveedor = await this.prisma.proveedor.findFirst({
        where: { id: proveedorId, enteId, deletedAt: null },
      });
      if (!proveedor) {
        throw new NotFoundException('Proveedor no encontrado en este Ente');
      }
    }

    // 3. Crear el registro con los campos mapeados
    const result = await this.prisma.ofertaPresentada.create({
      data: {
        expedienteId: dto.expedienteId,
        proveedorId: proveedorId, // Usamos el ID (proporcionado o generado)
        rifProveedorOferente: dto.rifProveedorOferente,
        nombreProveedorOferente: dto.nombreProveedorOferente,
        nombreRepLegalOferente: dto.nombreRepLegalOferente,
        cedulaRepLegalOferente: dto.cedulaRepLegalOferente,
        datosRegistroMercantilProveedorOferente: dto.datosRegistroMercantilProveedorOferente,
        correoProveedorOferente: dto.correoProveedorOferente,
        numeroSobresEntregados: dto.numeroSobresEntregados,
        montoOfertaBs: dto.montoOfertaBs,
        createdBy: userId,
      },
      include: {
        proveedor: { select: { nombre: true, rif: true } },
      },
    });

    await this.invalidarDocumentos(dto.expedienteId);

    return result;
  }

  /**
   * Listar ofertas por expediente.
   */
  async findAllByExpediente(expedienteId: string, enteId: string) {
    // Validar expediente pertenencia
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, enteId, deletedAt: null },
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado');
    }

    return this.prisma.ofertaPresentada.findMany({
      where: { expedienteId, deletedAt: null },
      include: {
        proveedor: { select: { nombre: true, rif: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener una oferta por ID.
   */
  async findOne(id: string, enteId: string) {
    const oferta = await this.prisma.ofertaPresentada.findFirst({
      where: {
        id,
        deletedAt: null,
        expediente: { enteId },
      },
      include: {
        proveedor: { select: { nombre: true, rif: true } },
      },
    });

    if (!oferta) {
      throw new NotFoundException('Oferta presentada no encontrada');
    }

    return oferta;
  }

  /**
   * Actualizar oferta.
   */
  async update(id: string, dto: UpdateOfertaPresentadaDto, userId: string, enteId: string) {
    const ofertaActual = await this.findOne(id, enteId);

    const updateData: any = {
      updatedBy: userId,
    };

    if (dto.rifProveedorOferente !== undefined)
      updateData.rifProveedorOferente = dto.rifProveedorOferente;
    if (dto.nombreProveedorOferente !== undefined)
      updateData.nombreProveedorOferente = dto.nombreProveedorOferente;
    if (dto.nombreRepLegalOferente !== undefined)
      updateData.nombreRepLegalOferente = dto.nombreRepLegalOferente;
    if (dto.cedulaRepLegalOferente !== undefined)
      updateData.cedulaRepLegalOferente = dto.cedulaRepLegalOferente;
    if (dto.datosRegistroMercantilProveedorOferente !== undefined)
      updateData.datosRegistroMercantilProveedorOferente =
        dto.datosRegistroMercantilProveedorOferente;
    if (dto.correoProveedorOferente !== undefined)
      updateData.correoProveedorOferente = dto.correoProveedorOferente;
    if (dto.numeroSobresEntregados !== undefined)
      updateData.numeroSobresEntregados = dto.numeroSobresEntregados;
    if (dto.montoOfertaBs !== undefined) updateData.montoOfertaBs = dto.montoOfertaBs;

    // 1.5. Verificar unicidad del RIF si se está intentando cambiar
    if (
      dto.rifProveedorOferente &&
      dto.rifProveedorOferente !== ofertaActual.rifProveedorOferente
    ) {
      const existeOtro = await this.prisma.ofertaPresentada.findFirst({
        where: {
          expedienteId: ofertaActual.expedienteId,
          rifProveedorOferente: dto.rifProveedorOferente,
          deletedAt: null,
          NOT: { id: id },
        },
      });

      if (existeOtro) {
        throw new ConflictException(
          `Ya existe otra oferta con el RIF ${dto.rifProveedorOferente} para este expediente.`,
        );
      }
    }

    if (dto.proveedorId) {
      const proveedor = await this.prisma.proveedor.findFirst({
        where: { id: dto.proveedorId, enteId, deletedAt: null },
      });
      if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
      updateData.proveedorId = dto.proveedorId;
    }

    const result = await this.prisma.ofertaPresentada.update({
      where: { id: ofertaActual.id },
      data: updateData,
      include: {
        proveedor: { select: { nombre: true, rif: true } },
      },
    });

    // Sincronizar los cambios con la Evaluación de la Fase 3 (Si ya fue iniciada)
    if (
      dto.nombreProveedorOferente !== undefined ||
      dto.rifProveedorOferente !== undefined ||
      dto.nombreRepLegalOferente !== undefined ||
      dto.cedulaRepLegalOferente !== undefined
    ) {
      const evaluacionAsociada = await this.prisma.evaluacionResultados.findUnique({
        where: { ofertaId: result.id },
      });

      if (evaluacionAsociada) {
        await this.prisma.evaluacionResultados.update({
          where: { ofertaId: result.id },
          data: {
            nombreProveedorEvaluado:
              dto.nombreProveedorOferente ?? evaluacionAsociada.nombreProveedorEvaluado,
            rifProveedorEvaluado:
              dto.rifProveedorOferente ?? evaluacionAsociada.rifProveedorEvaluado,
            nombreRepLegalEvaluado:
              dto.nombreRepLegalOferente ?? evaluacionAsociada.nombreRepLegalEvaluado,
            cedulaRepLegalEvaluado:
              dto.cedulaRepLegalOferente ?? evaluacionAsociada.cedulaRepLegalEvaluado,
          },
        });
      }
    }

    await this.invalidarDocumentos(result.expedienteId);
    if (ofertaActual.expedienteId !== result.expedienteId) {
      await this.invalidarDocumentos(ofertaActual.expedienteId);
    }

    return result;
  }

  /**
   * Eliminar oferta (soft delete).
   */
  async remove(id: string, userId: string, enteId: string) {
    const oferta = await this.findOne(id, enteId);

    await this.prisma.ofertaPresentada.update({
      where: { id: oferta.id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    await this.invalidarDocumentos(oferta.expedienteId);

    return { message: 'Oferta eliminada exitosamente' };
  }
}
