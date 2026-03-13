import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { QueryProveedoresDto } from './dto/query-proveedores.dto';
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

    // Timeout extendido porque las subidas a Cloudinary ocurren dentro de la transacción
    return this.prisma.$transaction(
      async (tx) => {
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
      },
      { timeout: 30000 },
    );
  }
  /**
   * Estadísticas generales de proveedores del Ente
   */
  async getEstadisticas(enteId: string) {
    const baseWhere = { enteId, deletedAt: null };

    // Inicio del mes actual
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    // Ejecutar todas las consultas en paralelo
    const [
      totalRegistrados,
      totalAprobados,
      totalRechazados,
      totalPendientes,
      totalEnRevision,
      registradosEsteMes,
      aprobadosEsteMes,
      rechazadosEsteMes,
      distribucionArea,
      distribucionTipoPersona,
    ] = await Promise.all([
      // Totales por estatus
      this.prisma.proveedor.count({ where: baseWhere }),
      this.prisma.proveedor.count({
        where: { ...baseWhere, estatusValidacion: 'APROBADO' },
      }),
      this.prisma.proveedor.count({
        where: { ...baseWhere, estatusValidacion: 'RECHAZADO' },
      }),
      this.prisma.proveedor.count({
        where: { ...baseWhere, estatusValidacion: 'PENDIENTE' },
      }),
      this.prisma.proveedor.count({
        where: { ...baseWhere, estatusValidacion: 'EN_REVISION' },
      }),

      // Crecimiento mensual
      this.prisma.proveedor.count({
        where: { ...baseWhere, createdAt: { gte: inicioMes } },
      }),
      this.prisma.proveedor.count({
        where: {
          ...baseWhere,
          estatusValidacion: 'APROBADO',
          createdAt: { gte: inicioMes },
        },
      }),
      this.prisma.proveedor.count({
        where: {
          ...baseWhere,
          estatusValidacion: 'RECHAZADO',
          createdAt: { gte: inicioMes },
        },
      }),

      // Distribución por área de especialidad
      this.prisma.proveedor.groupBy({
        by: ['areaEspecialidad'],
        where: baseWhere,
        _count: { id: true },
      }),

      // Distribución por tipo de persona
      this.prisma.proveedor.groupBy({
        by: ['tipoPersona'],
        where: baseWhere,
        _count: { id: true },
      }),
    ]);

    // Calcular porcentajes mensuales (evitar división por cero)
    const calcPorcentaje = (parcial: number, total: number): number =>
      total > 0 ? Math.round((parcial / total) * 1000) / 10 : 0;

    // Mapear distribución por área
    const areas: Record<string, number> = {
      OBRAS: 0,
      BIENES: 0,
      SERVICIOS: 0,
      CONSULTORIA: 0,
      SIN_ASIGNAR: 0,
    };
    for (const item of distribucionArea) {
      const key = item.areaEspecialidad || 'SIN_ASIGNAR';
      areas[key] = item._count.id;
    }

    // Mapear distribución por tipo persona
    const tiposPersona: Record<string, number> = {
      NATURAL: 0,
      JURIDICA: 0,
    };
    for (const item of distribucionTipoPersona) {
      tiposPersona[item.tipoPersona] = item._count.id;
    }

    return {
      resumen: {
        totalRegistrados,
        totalAprobados,
        totalRechazados,
        totalPendientes,
        totalEnRevision,
      },
      crecimientoMensual: {
        registradosEsteMes,
        porcentajeRegistrados: calcPorcentaje(registradosEsteMes, totalRegistrados),
        aprobadosEsteMes,
        porcentajeAprobados: calcPorcentaje(aprobadosEsteMes, totalAprobados),
        rechazadosEsteMes,
        porcentajeRechazados: calcPorcentaje(rechazadosEsteMes, totalRechazados),
      },
      distribucionPorArea: areas,
      distribucionPorTipoPersona: tiposPersona,
    };
  }

  /**
   * Listar todos los proveedores del Ente con paginación y filtros
   */
  async findAll(enteId: string, query: QueryProveedoresDto) {
    const { page = 1, limit = 10, estatusValidacion, rif, nombre } = query;
    const skip = (page - 1) * limit;

    // Construir filtro dinámico
    const where: Record<string, unknown> = {
      enteId,
      deletedAt: null,
    };

    if (estatusValidacion) {
      where.estatusValidacion = estatusValidacion;
    }

    if (rif) {
      where.rif = { contains: rif, mode: 'insensitive' };
    }

    if (nombre) {
      where.nombre = { contains: nombre, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.proveedor.findMany({
        where,
        include: {
          documentos: {
            where: { deletedAt: null },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.proveedor.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Actualizar o subir nuevos documentos para un proveedor existente
   */
  async updateDocumentos(
    id: string,
    enteId: string,
    userId: string,
    files: Record<string, Express.Multer.File[]>,
    observaciones: Record<string, string>,
  ) {
    const proveedor = await this.findOne(id, enteId);

    // Si no hay archivos nuevos, retornar inmediatamente
    if (!files || Object.keys(files).length === 0) {
      return { message: 'No se enviaron documentos para actualizar', proveedor };
    }

    const documentosCreados: any[] = [];
    const esPendiente = proveedor.estatusValidacion === 'PENDIENTE';

    // Usar una función normal en lugar de transacción interactiva pesada
    // ya que las eliminaciones/subidas a Cloudinary pueden fallar o tardar
    for (const [fieldName, fileArray] of Object.entries(files)) {
      const tipoDocumento = FILE_FIELD_TO_TIPO[fieldName] as
        | 'RIF'
        | 'REGISTRO_MERCANTIL'
        | 'ESTADOS_FINANCIEROS'
        | 'REFERENCIAS_BANCARIAS'
        | 'CERTIFICADO_SOLVENCIA_LABORAL'
        | 'LICENCIA_MUNICIPAL'
        | 'RNC'
        | undefined;
      if (!tipoDocumento || !fileArray || fileArray.length === 0) continue;

      const file = fileArray[0];
      const folder = `universitas/proveedores/${proveedor.rif}`;
      const filename = tipoDocumento;

      const obsKey = `obs_${fieldName}`;
      const observacion = observaciones[obsKey] || null;

      // Buscar si ya existe un documento activo de este tipo
      const documentoExistente = proveedor.documentos.find(
        (doc) => doc.tipoDocumento === tipoDocumento && doc.deletedAt === null,
      );

      // 1. Manejar el documento existente si lo hay
      if (documentoExistente) {
        if (esPendiente) {
          // Si nunca fue aprobado, reemplazar físicamente para ahorrar espacio
          try {
            // Extraer publicId de la URL de Cloudinary
            const urlParts = documentoExistente.urlArchivo.split('/');
            const uploadIndex = urlParts.findIndex((p) => p === 'upload');
            if (uploadIndex !== -1) {
              // Reconstruir publicId: universitas/proveedores/{rif}/{tipo_sin_ext}
              const pathPart = urlParts.slice(uploadIndex + 2).join('/'); // saltar 'upload' y 'v1234'
              const publicId = pathPart.substring(0, pathPart.lastIndexOf('.'));
              if (publicId) {
                await this.storageService.deleteFile(publicId);
              }
            }
          } catch (error) {
            console.error(`Error borrando archivo anterior en Cloudinary: ${error}`);
            // Continuar aunque falle el borrado
          }

          // Hard delete del registro en BD viejo
          await this.prisma.documentoProveedor.delete({
            where: { id: documentoExistente.id },
          });
        } else {
          // Si ya hubo aprobación, mantener historial mediante Soft Delete
          await this.prisma.documentoProveedor.update({
            where: { id: documentoExistente.id },
            data: { deletedAt: new Date() },
          });
        }
      }

      const secureUrl = await this.storageService.uploadFile(file.buffer, folder, filename);

      // 3. Crear el nuevo registro de documento
      const nuevoDocumento = await this.prisma.documentoProveedor.create({
        data: {
          proveedorId: proveedor.id,
          tipoDocumento: tipoDocumento as NonNullable<typeof tipoDocumento>,
          urlArchivo: secureUrl,
          observaciones: observacion,
        },
      });

      documentosCreados.push(nuevoDocumento);
    }

    // Retornar el proveedor actualizado
    const proveedorActualizado = await this.findOne(id, enteId);

    return {
      message: 'Documentos actualizados exitosamente',
      proveedor: proveedorActualizado,
    };
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
   * Aprobar o rechazar un proveedor
   */
  async aprobar(id: string, enteId: string, userId: string, estatusValidacion: string) {
    const proveedor = await this.findOne(id, enteId);

    if (proveedor.estatusValidacion === estatusValidacion) {
      throw new BadRequestException(`El proveedor ya tiene el estatus ${estatusValidacion}`);
    }

    // Validar que tenga todos los documentos antes de aprobar
    if (estatusValidacion === 'APROBADO') {
      const documentosRequeridos = [
        'RIF',
        'REGISTRO_MERCANTIL',
        'ESTADOS_FINANCIEROS',
        'REFERENCIAS_BANCARIAS',
        'CERTIFICADO_SOLVENCIA_LABORAL',
        'LICENCIA_MUNICIPAL',
        'RNC',
      ];

      const documentosExistentes = proveedor.documentos
        .filter((doc) => !doc.deletedAt)
        .map((doc) => doc.tipoDocumento);

      const documentosFaltantes = documentosRequeridos.filter(
        (tipo) => !documentosExistentes.includes(tipo as any),
      );

      if (documentosFaltantes.length > 0) {
        throw new BadRequestException(
          `No se puede aprobar el proveedor. Faltan los siguientes documentos: ${documentosFaltantes.join(', ')}`,
        );
      }
    }

    const actualizado = await this.prisma.proveedor.update({
      where: { id: proveedor.id },
      data: {
        estatusValidacion: estatusValidacion as 'APROBADO' | 'RECHAZADO',
        updatedBy: userId,
      },
      include: {
        documentos: {
          where: { deletedAt: null },
        },
      },
    });

    const accion = estatusValidacion === 'APROBADO' ? 'aprobado' : 'rechazado';
    return {
      message: `Proveedor ${accion} exitosamente`,
      proveedor: actualizado,
    };
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
