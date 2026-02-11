import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import type { IStorageService } from '../common/interfaces/storage-service.interface';

// Mapeo de nombres de campo de archivo al enum TipoDocumentoProveedor
const FILE_FIELD_TO_TIPO: Record<string, string> = {
  doc_rif: 'RIF',
  doc_registro_mercantil: 'REGISTRO_MERCANTIL',
  doc_estados_financieros: 'ESTADOS_FINANCIEROS',
  doc_referencias_bancarias: 'REFERENCIAS_BANCARIAS',
  doc_solvencia_laboral: 'CERTIFICADO_SOLVENCIA_LABORAL',
  doc_licencia_municipal: 'LICENCIA_MUNICIPAL',
  doc_rnc: 'RNC',
};

@Injectable()
export class ProveedoresService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {}

  /**
   * Crear proveedor con documentos PDF en una transacción
   */
  async create(
    createDto: CreateProveedorDto,
    files: Record<string, Express.Multer.File[]>,
    observaciones: Record<string, string>,
    userId: string,
    enteId: string,
  ) {
    // 1. Verificar que no exista un proveedor con el mismo RIF en el Ente
    const existente = await this.prisma.proveedor.findFirst({
      where: {
        rif: createDto.rif,
        enteId: enteId,
        deletedAt: null,
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe un proveedor con RIF ${createDto.rif} registrado en este Ente`,
      );
    }

    // 2. Crear proveedor y documentos en una transacción
    return this.prisma.$transaction(async (tx) => {
      // Paso A: Crear el proveedor
      const proveedor = await tx.proveedor.create({
        data: {
          enteId,
          correo: createDto.correo,
          nombre: createDto.nombre,
          rif: createDto.rif,
          tipoPersona: createDto.tipoPersona as 'NATURAL' | 'JURIDICA',
          tipoEntidadJuridica: createDto.tipoEntidadJuridica as
            | 'EMPRESA_PRIVADA'
            | 'COOPERATIVA'
            | 'FUNDACION'
            | 'ASOCIACION_CIVIL'
            | 'CONSORCIO'
            | undefined,
          estado: createDto.estado,
          municipio: createDto.municipio,
          parroquia: createDto.parroquia,
          direccionFiscal: createDto.direccionFiscal,
          telefono: createDto.telefono,
          nombreRepLegal: createDto.nombreRepLegal,
          cedulaRepLegal: createDto.cedulaRepLegal,
          registroRnc: createDto.registroRnc ?? false,
          solvenciaLaboral: createDto.solvenciaLaboral ?? false,
          licenciaFuncionamientoMunicipal: createDto.licenciaFuncionamientoMunicipal ?? false,
          actividadComercial: createDto.actividadComercial,
          areaEspecialidad: createDto.areaEspecialidad as
            | 'OBRAS'
            | 'BIENES'
            | 'SERVICIOS'
            | 'CONSULTORIA'
            | undefined,
          anosExperiencia: createDto.anosExperiencia,
          fechaEstadoFinanciero: createDto.fechaEstadoFinanciero
            ? new Date(createDto.fechaEstadoFinanciero)
            : undefined,
          patrimonioReportado: createDto.patrimonioReportado,
          nivelContratacion: createDto.nivelContratacion as
            | 'BASICO'
            | 'INTERMEDIO'
            | 'AVANZADO'
            | 'EXPERTO'
            | undefined,
          createdBy: userId,
        },
      });

      // Paso B: Subir archivos a Cloudinary y crear registros DocumentoProveedor
      const documentosCreados: Awaited<ReturnType<typeof tx.documentoProveedor.create>>[] = [];

      for (const [fieldName, fileArray] of Object.entries(files)) {
        const tipoDocumento = FILE_FIELD_TO_TIPO[fieldName];
        if (!tipoDocumento || !fileArray || fileArray.length === 0) continue;

        const file = fileArray[0];

        // Subir a Cloudinary: universitas/proveedores/{rif}/{tipo}.pdf
        const folder = `universitas/proveedores/${createDto.rif}`;
        const filename = tipoDocumento;
        const secureUrl = await this.storageService.uploadFile(file.buffer, folder, filename);

        // Leer observación correspondiente (obs_doc_rif, obs_doc_registro_mercantil, etc.)
        const obsKey = `obs_${fieldName}`;
        const observacion = observaciones[obsKey] || null;

        // Crear registro en DocumentoProveedor
        const documento = await tx.documentoProveedor.create({
          data: {
            proveedorId: proveedor.id,
            tipoDocumento: tipoDocumento as
              | 'RIF'
              | 'REGISTRO_MERCANTIL'
              | 'ESTADOS_FINANCIEROS'
              | 'REFERENCIAS_BANCARIAS'
              | 'CERTIFICADO_SOLVENCIA_LABORAL'
              | 'LICENCIA_MUNICIPAL'
              | 'RNC',
            urlArchivo: secureUrl,
            observaciones: observacion,
          },
        });

        documentosCreados.push(documento);
      }

      // Retornar proveedor con sus documentos
      return {
        message: 'Proveedor registrado exitosamente',
        proveedor: {
          ...proveedor,
          documentos: documentosCreados,
        },
      };
    });
  }

  /**
   * Listar todos los proveedores del Ente
   */
  async findAll(enteId: string) {
    return this.prisma.proveedor.findMany({
      where: {
        enteId,
        deletedAt: null,
      },
      include: {
        documentos: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener un proveedor por ID
   */
  async findOne(id: string, enteId: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: {
        id,
        enteId,
        deletedAt: null,
      },
      include: {
        documentos: {
          where: { deletedAt: null },
        },
      },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return proveedor;
  }

  /**
   * Eliminar proveedor (soft delete)
   */
  async remove(id: string, enteId: string, userId: string) {
    const proveedor = await this.findOne(id, enteId);

    await this.prisma.proveedor.update({
      where: { id: proveedor.id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return { message: 'Proveedor eliminado exitosamente' };
  }
}
