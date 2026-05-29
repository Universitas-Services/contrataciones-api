import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios from 'axios';
import { TipoDocumentoProveedor } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedoresDto } from './dto/query-proveedores.dto';
import { RegistroRapidoProveedorDto } from './dto/registro-rapido-proveedor.dto';
import type { IStorageService } from '../common/interfaces/storage-service.interface';

// Mapeo de nombres de campo de archivo al enum TipoDocumentoProveedor
const FILE_FIELD_TO_TIPO: Record<string, string> = {
  doc_rif: 'RIF',
  doc_registro_mercantil: 'ACTA_CONSTITUTIVA',
  doc_solvencia_laboral: 'CERTIFICADO_SOLVENCIA_LABORAL',
  doc_licencia_municipal: 'LICENCIA_MUNICIPAL',
  doc_rnc: 'RNC',
  doc_cedula: 'CEDULA',
  doc_islr: 'ISLR',
  doc_curriculum: 'CURRICULUM',
  doc_titulo: 'TITULO_UNIVERSITARIO',
  doc_resolucion: 'RESOLUCION_DESIGNACION',
  doc_gaceta: 'GACETA_CREACION',
};

@Injectable()
export class ProveedoresService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {}

  private async invalidarDocumentosExpedientes(expedienteIds: string[]) {
    if (!expedienteIds || expedienteIds.length === 0) return;
    await this.prisma.documentoGenerado.updateMany({
      where: { expedienteId: { in: expedienteIds }, deletedAt: null },
      data: { estaDesactualizado: true },
    });
    await this.prisma.pliegoGenerado.updateMany({
      where: { expedienteId: { in: expedienteIds }, deletedAt: null },
      data: { estaDesactualizado: true },
    });
  }

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
            tipoPersona: createDto.tipoPersona as any,
            tipoEntidadJuridica: createDto.tipoEntidadJuridica as any,
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
            datosRegistroMercantil: createDto.datosRegistroMercantil,
            actividadComercial: createDto.actividadComercial,
            areaEspecialidad: createDto.areaEspecialidad as any,
            anosExperiencia: createDto.anosExperiencia,
            islrProveedor: createDto.islrProveedor,
            cedulaNaturalProveedor: createDto.cedulaNaturalProveedor,
            nombreAutoridadProveedor: createDto.nombreAutoridadProveedor,
            cedulaAutoridadProveedor: createDto.cedulaAutoridadProveedor,
            datosDesignacionAutoridadProveedor: createDto.datosDesignacionAutoridadProveedor,
            fechaEstadoFinanciero: createDto.fechaEstadoFinanciero
              ? new Date(createDto.fechaEstadoFinanciero)
              : undefined,
            patrimonioReportado: createDto.patrimonioReportado,
            nivelContratacion: createDto.nivelContratacion as any,
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
                | 'ACTA_CONSTITUTIVA'
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
   * Registro rápido (mínimo) de proveedor durante el acto de adquisición/oferta.
   *
   * - Si el proveedor ya existe por RIF en el Ente → retorna sus datos con `yaExistia: true`.
   * - Si no existe → lo crea con los datos básicos disponibles y `estatusValidacion: PENDIENTE`.
   *
   * El correo se genera como placeholder único basado en el RIF para cumplir el NOT NULL
   * sin riesgo de colisión entre proveedores. El ejecutor puede completar luego todos los
   * datos desde el módulo de Proveedores.
   */
  async registroRapido(dto: RegistroRapidoProveedorDto, userId: string, enteId: string) {
    // 1. Buscar si ya existe un proveedor con ese RIF en el Ente
    const existente = await this.prisma.proveedor.findFirst({
      where: {
        rif: { equals: dto.rif, mode: 'insensitive' },
        enteId,
        deletedAt: null,
      },
    });

    if (existente) {
      return {
        id: existente.id,
        yaExistia: true,
        message: `El proveedor con RIF ${dto.rif} ya está registrado en este Ente.`,
        proveedor: existente,
      };
    }

    // 2. Generar correo placeholder único derivado del RIF (evita colisiones)
    const rifSanitizado = dto.rif.toLowerCase().replace(/\s/g, '');
    const correoPendiente = `sin-correo.${rifSanitizado}@pendiente.ve`;

    // 3. Crear el proveedor con datos mínimos
    const nuevo = await this.prisma.proveedor.create({
      data: {
        enteId,
        rif: dto.rif,
        nombre: dto.nombre,
        correo: correoPendiente,
        tipoPersona: 'JURIDICA', // Default para licitaciones; el ejecutor puede ajustarlo luego
        nombreRepLegal: dto.nombreRepLegal,
        cedulaRepLegal: dto.cedulaRepLegal,
        datosRegistroMercantil: dto.datosRegistroMercantil,
        estatusValidacion: 'PENDIENTE',
        createdBy: userId,
      },
    });

    return {
      id: nuevo.id,
      yaExistia: false,
      message: `Proveedor registrado exitosamente. Complete la información pendiente desde el módulo de Proveedores.`,
      proveedor: nuevo,
    };
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
      BIENES: 0,
      OBRAS: 0,
      SERVICIOS: 0,
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
    const {
      page = 1,
      limit = 10,
      estatusValidacion,
      rif,
      nombre,
      estadoVigencia,
      areaEspecialidad,
    } = query;
    const skip = (page - 1) * limit;

    // Construir filtro dinámico
    const where: Record<string, unknown> = {
      enteId,
      deletedAt: null,
    };

    if (estatusValidacion) {
      where.estatusValidacion = estatusValidacion;
    }

    if (areaEspecialidad) {
      where.areaEspecialidad = areaEspecialidad;
    }

    if (estadoVigencia) {
      const now = new Date();
      const hace11Meses = new Date();
      hace11Meses.setMonth(now.getMonth() - 11);

      const hace12Meses = new Date();
      hace12Meses.setMonth(now.getMonth() - 12);

      switch (estadoVigencia) {
        case 'POR_APROBAR':
          where.estatusValidacion = { in: ['PENDIENTE', 'RECHAZADO'] };
          break;
        case 'ACTIVO':
          where.estatusValidacion = 'APROBADO';
          where.fechaUltimaAprobacion = { gte: hace11Meses };
          break;
        case 'POR_VENCER':
          where.estatusValidacion = 'APROBADO';
          where.fechaUltimaAprobacion = {
            lt: hace11Meses,
            gte: hace12Meses,
          };
          break;
        case 'VENCIDO':
          where.estatusValidacion = 'APROBADO';
          where.fechaUltimaAprobacion = { lt: hace12Meses };
          break;
      }
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
   * Actualizar datos generales y/o subir nuevos documentos para un proveedor existente
   */
  async update(
    id: string,
    enteId: string,
    userId: string,
    updateDto: UpdateProveedorDto,
    files: Record<string, Express.Multer.File[]>,
  ) {
    const proveedor = await this.findOne(id, enteId);

    // 1. Verificar unicidad del RIF si se está intentando cambiar
    if (updateDto.rif && updateDto.rif !== proveedor.rif) {
      const existente = await this.prisma.proveedor.findFirst({
        where: {
          rif: updateDto.rif,
          enteId: enteId,
          deletedAt: null,
          NOT: { id: id },
        },
      });

      if (existente) {
        throw new ConflictException(
          `Ya existe otro proveedor con RIF ${updateDto.rif} registrado en este Ente`,
        );
      }
    }

    let requiereInvalidacion = false;
    const criticos = [
      'nombre',
      'rif',
      'nombreRepLegal',
      'cedulaRepLegal',
      'datosRegistroMercantil',
      'direccionFiscal',
      'telefono',
      'correo',
    ] as const;

    for (const key of criticos) {
      if (updateDto[key] !== undefined && updateDto[key] !== (proveedor as any)[key]) {
        requiereInvalidacion = true;
        break;
      }
    }

    // 2. Extraer observaciones de documentos del DTO
    const observaciones: Record<string, string> = {};
    const dataToUpdate: Record<string, string | number | boolean | Date> = { ...updateDto } as any;

    for (const key of Object.keys(dataToUpdate)) {
      if (key.startsWith('obs_doc_')) {
        observaciones[key] = String(dataToUpdate[key]);
        delete dataToUpdate[key];
      }
    }

    // 3. Actualizar campos generales en la BD
    // Convertir fechas y asegurar tipos antes de actualizar
    if (dataToUpdate.fechaEstadoFinanciero) {
      dataToUpdate.fechaEstadoFinanciero = new Date(dataToUpdate.fechaEstadoFinanciero as string);
    }

    await this.prisma.proveedor.update({
      where: { id: proveedor.id },
      data: {
        ...dataToUpdate,
        updatedBy: userId,
      },
    });

    // 4. Procesar actualización de documentos si se enviaron archivos
    const documentosCreados: any[] = [];
    const esConfirmado = proveedor.estatusValidacion === 'APROBADO';

    if (files && Object.keys(files).length > 0) {
      for (const [fieldName, fileArray] of Object.entries(files)) {
        const tipoDocumento = FILE_FIELD_TO_TIPO[fieldName] as
          | 'RIF'
          | 'ACTA_CONSTITUTIVA'
          | 'CERTIFICADO_SOLVENCIA_LABORAL'
          | 'LICENCIA_MUNICIPAL'
          | 'RNC'
          | undefined;

        if (!tipoDocumento || !fileArray || fileArray.length === 0) continue;

        const file = fileArray[0];
        const folder = `universitas/proveedores/${updateDto.rif || proveedor.rif}`;
        const filename = tipoDocumento;

        const obsKey = `obs_${fieldName}`;
        const observacion = observaciones[obsKey] || null;

        // Buscar si ya existe un documento activo de este tipo
        const documentoExistente = proveedor.documentos.find(
          (doc) => doc.tipoDocumento === tipoDocumento && doc.deletedAt === null,
        );

        // Manejar el documento existente
        if (documentoExistente) {
          if (!esConfirmado) {
            // BORRADO FÍSICO en Cloudinary para PENDIENTE o RECHAZADO
            try {
              const urlParts = documentoExistente.urlArchivo.split('/');
              const uploadIndex = urlParts.findIndex((p) => p === 'upload');
              if (uploadIndex !== -1) {
                const pathPart = urlParts.slice(uploadIndex + 2).join('/');
                const publicId = pathPart.substring(0, pathPart.lastIndexOf('.'));
                if (publicId) {
                  await this.storageService.deleteFile(publicId);
                }
              }
            } catch (error) {
              console.error(`Error borrando archivo anterior en Cloudinary: ${error}`);
            }

            // Hard delete del registro en BD viejo
            await this.prisma.documentoProveedor.delete({
              where: { id: documentoExistente.id },
            });
          } else {
            // SOFT DELETE para proveedores APROBADOS
            await this.prisma.documentoProveedor.update({
              where: { id: documentoExistente.id },
              data: { deletedAt: new Date() },
            });
          }
        }

        const secureUrl = await this.storageService.uploadFile(file.buffer, folder, filename);

        // Crear el nuevo registro de documento
        const nuevoDocumento = await this.prisma.documentoProveedor.create({
          data: {
            proveedorId: proveedor.id,
            tipoDocumento: tipoDocumento as any,
            urlArchivo: secureUrl,
            observaciones: observacion,
          },
        });

        documentosCreados.push(nuevoDocumento);
      }
    }

    if (requiereInvalidacion) {
      const ofertas = await this.prisma.ofertaPresentada.findMany({
        where: { proveedorId: proveedor.id, deletedAt: null },
        select: { expedienteId: true },
      });
      const adquirentes = await this.prisma.adquirentePliego.findMany({
        where: { proveedorId: proveedor.id, deletedAt: null },
        select: { expedienteId: true },
      });
      const expIds = [
        ...new Set([
          ...ofertas.map((o) => o.expedienteId),
          ...adquirentes.map((a) => a.expedienteId),
        ]),
      ];
      await this.invalidarDocumentosExpedientes(expIds);
    }

    // Retornar el proveedor actualizado con todos sus campos y documentos vigentes
    return this.findOne(id, enteId);
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
        'ACTA_CONSTITUTIVA',
        'CERTIFICADO_SOLVENCIA_LABORAL',
        'LICENCIA_MUNICIPAL',
        'RNC',
      ];

      const documentosExistentes = proveedor.documentos
        .filter((doc) => !doc.deletedAt)
        .map((doc) => doc.tipoDocumento);

      const documentosFaltantes = documentosRequeridos.filter(
        (tipo) => !documentosExistentes.includes(tipo as TipoDocumentoProveedor),
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
        estatusValidacion: estatusValidacion as any,
        fechaUltimaAprobacion: estatusValidacion === 'APROBADO' ? new Date() : undefined,
        updatedBy: userId,
      } as any,
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

  /**
   * Buscar proveedor por RIF en el Ente
   */
  async findByRif(rif: string, enteId: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: {
        rif: { equals: rif, mode: 'insensitive' },
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
      throw new NotFoundException(`No se encontró un proveedor con RIF ${rif}`);
    }

    return proveedor;
  }

  /**
   * Obtener un documento activo por proveedor y tipo
   */
  async getDocumentoActivo(proveedorId: string, tipo: string, enteId: string) {
    // Validar que el proveedor exista y pertenezca al ente
    const proveedor = await this.findOne(proveedorId, enteId);

    const documento = await this.prisma.documentoProveedor.findFirst({
      where: {
        proveedorId: proveedor.id,
        tipoDocumento: tipo as any,
        deletedAt: null,
      },
    });

    if (!documento) {
      throw new NotFoundException(
        `No se encontró un documento activo del tipo ${tipo} para este proveedor`,
      );
    }

    return { documento, proveedor };
  }

  /**
   * Obtener el stream de datos de un archivo desde su URL
   */
  async downloadFileStream(url: string) {
    try {
      let finalUrl = url;
      // Cloudinary often requires the file extension to serve raw/pdf files correctly.
      if (
        !finalUrl.toLowerCase().endsWith('.pdf') &&
        !finalUrl.toLowerCase().endsWith('.jpg') &&
        !finalUrl.toLowerCase().endsWith('.png')
      ) {
        finalUrl += '.pdf';
      }

      const response = await axios({
        method: 'GET',
        url: finalUrl,
        responseType: 'stream',
      });
      return response.data;
    } catch (error: any) {
      console.error('Error in downloadFileStream:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      throw new InternalServerErrorException(
        `Error al obtener el archivo desde el almacenamiento: ${error.message}`,
      );
    }
  }
}
