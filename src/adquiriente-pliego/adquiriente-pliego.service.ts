/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import axios from 'axios';
import ImageModule from 'docxtemplater-image-module-free';
import { PrismaService } from '../database/prisma.service';

import { EmailService } from '../email/email.service';
import { CreateAdquirentePliegoDto } from './dto/create-adquiriente-pliego.dto';
import { UpdateAdquirentePliegoDto } from './dto/update-adquiriente-pliego.dto';

@Injectable()
export class AdquirentePliegoService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Inject('IStorageService') private storage: any,
  ) {}

  // =========================================================================
  // CRUD
  // =========================================================================

  /**
   * Crear un registro de adquiriente pliego.
   */
  async create(dto: CreateAdquirentePliegoDto, userId: string, enteId: string) {
    // Verificar que el expediente exista y pertenezca al ente
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: dto.expedienteId, enteId, deletedAt: null },
    });

    if (!expediente) {
      throw new NotFoundException(
        'Expediente de contratación no encontrado o no pertenece a este ente',
      );
    }

    // Verificar que el proveedor exista
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: dto.proveedorId, enteId, deletedAt: null },
    });

    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado o no pertenece a este ente');
    }

    return this.prisma.adquirentePliego.create({
      data: {
        expedienteId: dto.expedienteId,
        proveedorId: dto.proveedorId,
        fechaAdquisicion: new Date(dto.fechaAdquisicion),
        nombreProveedorAdquiriente: dto.nombreProveedorAdquiriente,
        direccionFiscalProveedorAdquirente: dto.direccionFiscalProveedorAdquirente,
        telefonoProveedorAdquirente: dto.telefonoProveedorAdquirente,
        correoProveedorAdquirente: dto.correoProveedorAdquirente,
        datosPagoPliego: dto.datosPagoPliego,
        createdBy: userId,
      },
      include: {
        expediente: { select: { descripcionObjeto: true, codigoNomenclatura: true } },
        proveedor: { select: { nombre: true, rif: true } },
      },
    });
  }

  /**
   * Listar todos los adquirientes de un expediente.
   */
  async findAllByExpediente(expedienteId: string, enteId: string) {
    // Verificar que el expediente pertenezca al ente
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, enteId, deletedAt: null },
    });

    if (!expediente) {
      throw new NotFoundException(
        'Expediente de contratación no encontrado o no pertenece a este ente',
      );
    }

    return this.prisma.adquirentePliego.findMany({
      where: { expedienteId, deletedAt: null },
      include: {
        proveedor: { select: { nombre: true, rif: true, correo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener un adquiriente pliego por ID.
   */
  async findOne(id: string, enteId: string) {
    const adquiriente = await this.prisma.adquirentePliego.findFirst({
      where: {
        id,
        deletedAt: null,
        expediente: { enteId, deletedAt: null },
      },
      include: {
        expediente: { select: { id: true, descripcionObjeto: true, codigoNomenclatura: true } },
        proveedor: { select: { id: true, nombre: true, rif: true, correo: true } },
      },
    });

    if (!adquiriente) {
      throw new NotFoundException('Registro de adquiriente pliego no encontrado');
    }

    return adquiriente;
  }

  /**
   * Actualizar un registro de adquiriente pliego.
   */
  async update(id: string, dto: UpdateAdquirentePliegoDto, userId: string, enteId: string) {
    // Verificar que exista
    await this.findOne(id, enteId);

    const updateData: any = { updatedBy: userId };

    if (dto.fechaAdquisicion) updateData.fechaAdquisicion = new Date(dto.fechaAdquisicion);
    if (dto.nombreProveedorAdquiriente !== undefined)
      updateData.nombreProveedorAdquiriente = dto.nombreProveedorAdquiriente;
    if (dto.direccionFiscalProveedorAdquirente !== undefined)
      updateData.direccionFiscalProveedorAdquirente = dto.direccionFiscalProveedorAdquirente;
    if (dto.telefonoProveedorAdquirente !== undefined)
      updateData.telefonoProveedorAdquirente = dto.telefonoProveedorAdquirente;
    if (dto.correoProveedorAdquirente !== undefined)
      updateData.correoProveedorAdquirente = dto.correoProveedorAdquirente;
    if (dto.datosPagoPliego !== undefined) updateData.datosPagoPliego = dto.datosPagoPliego;

    // Si cambian expedienteId o proveedorId, validarlos
    if (dto.expedienteId) {
      const expediente = await this.prisma.expedienteContratacion.findFirst({
        where: { id: dto.expedienteId, enteId, deletedAt: null },
      });
      if (!expediente) {
        throw new NotFoundException('Expediente de contratación no encontrado');
      }
      updateData.expedienteId = dto.expedienteId;
    }

    if (dto.proveedorId) {
      const proveedor = await this.prisma.proveedor.findFirst({
        where: { id: dto.proveedorId, enteId, deletedAt: null },
      });
      if (!proveedor) {
        throw new NotFoundException('Proveedor no encontrado');
      }
      updateData.proveedorId = dto.proveedorId;
    }

    return this.prisma.adquirentePliego.update({
      where: { id },
      data: updateData,
      include: {
        expediente: { select: { descripcionObjeto: true, codigoNomenclatura: true } },
        proveedor: { select: { nombre: true, rif: true } },
      },
    });
  }

  /**
   * Eliminar un adquiriente pliego (soft delete).
   */
  async remove(id: string, userId: string, enteId: string) {
    await this.findOne(id, enteId);

    await this.prisma.adquirentePliego.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return { message: 'Registro de adquiriente pliego eliminado exitosamente' };
  }

  // =========================================================================
  // GENERACIÓN DE PLIEGO
  // =========================================================================

  /**
   * Genera un documento DOCX de pliego de condiciones, lo sube a Cloudinary
   * y lo registra en PliegoGenerado.
   */
  async generarPliego(
    enteId: string,
    expedienteId: string,
    descripcion: string | undefined,
    userId: string,
  ) {
    // 1. Obtener datos del Ente
    const ente = await this.prisma.entePublico.findUnique({
      where: { id: enteId, deletedAt: null },
    });

    if (!ente) {
      throw new NotFoundException('Ente no encontrado');
    }

    // 2. Obtener datos del expediente con relaciones
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, enteId, deletedAt: null },
      include: {
        modalidad: true,
        comision: { include: { miembros: { where: { deletedAt: null } } } },
        unidadUsuaria: true,
        autoridad: true,
        fasePreparatoria: true,
        cronograma: true,
        adquirientesPliego: {
          where: { deletedAt: null },
          include: { proveedor: true },
        },
      },
    });

    if (!expediente) {
      throw new NotFoundException(
        'Expediente de contratación no encontrado o no pertenece a este ente',
      );
    }

    // 3. Eliminar pliego anterior si existe para este expediente
    const pliegoAnterior = await this.prisma.pliegoGenerado.findFirst({
      where: { expedienteId, enteId, deletedAt: null },
    });

    if (pliegoAnterior) {
      try {
        const publicId = this.extractCloudinaryPublicId(pliegoAnterior.urlArchivo);
        if (publicId) {
          await this.storage.deleteFile(publicId);
          console.log('🗑️ Pliego anterior eliminado de Cloudinary:', publicId);
        }
      } catch (deleteError: any) {
        console.warn(
          '⚠️ No se pudo eliminar el pliego anterior de Cloudinary:',
          deleteError.message,
        );
      }

      await this.prisma.pliegoGenerado.delete({
        where: { id: pliegoAnterior.id },
      });
      console.log('🗑️ Registro de pliego anterior eliminado de BD:', pliegoAnterior.id);
    }

    // 4. Cargar plantilla base
    const templatePath = path.join(__dirname, 'templates', 'pliego-base.docx');

    if (!fs.existsSync(templatePath)) {
      throw new BadRequestException(
        `Plantilla no encontrada en: ${templatePath}. Por favor, coloque el archivo pliego-base.docx en la carpeta templates.`,
      );
    }

    const content = fs.readFileSync(templatePath, 'binary');

    let zip: any;
    try {
      zip = new PizZip(content);
    } catch (zipError: any) {
      throw new BadRequestException(`Error al procesar la plantilla: ${zipError.message}`);
    }

    // 5. Preparar datos para reemplazo
    const now = new Date();
    const data = {
      // Datos del ente
      nom_ente_contratante: ente.nombre,
      siglas_ente: ente.siglas || 'N/A',
      direccion_fiscal_ente: ente.direccionFiscal || 'N/A',
      rif_ente: ente.rif || 'N/A',
      estado_ente: ente.estado || 'N/A',
      municipio_ente: ente.municipio || 'N/A',
      ciudad_ente: ente.ciudad || 'N/A',
      nom_unidad_contratante: ente.nombreUnidadContratante || 'N/A',
      nom_unidad_admin_financiera: ente.nombreUnidadAdminFinanciera || 'N/A',
      organo_adscripcion: ente.organoAdscripcion || 'N/A',

      // Datos del expediente (nombres que coinciden con la plantilla DOCX)
      cod_nomenclatura_proceso: expediente.codigoNomenclatura,
      desc_objeto_contratacion: expediente.descripcionObjeto,
      // Aliases adicionales para compatibilidad
      codigo_nomenclatura: expediente.codigoNomenclatura,
      descripcion_objeto: expediente.descripcionObjeto,
      estatus_proceso: expediente.estatusProceso,
      total_presupuesto: expediente.totalPresupuesto?.toString() || 'N/A',

      // Modalidad
      tipo_contratacion: expediente.modalidad?.tipoContratacion || 'N/A',
      modalidad_seleccion: expediente.modalidad?.modalidadSeleccion || 'N/A',
      monto_estimado_bs: expediente.modalidad?.montoEstimadoBs?.toString() || 'N/A',
      monto_estimado_dolar: expediente.modalidad?.montoEstimadoDolar?.toString() || 'N/A',

      // Autoridad
      nombre_autoridad: expediente.autoridad?.nombreCompletoAutoridad || 'N/A',
      cedula_autoridad: expediente.autoridad?.cedulaAutoridad || 'N/A',
      cargo_autoridad: expediente.autoridad?.cargoOficialAutoridad || 'N/A',

      // Comisión
      denominacion_comision: expediente.comision?.denominacionComision || 'N/A',

      // Unidad Usuaria
      nombre_unidad_usuaria: expediente.unidadUsuaria?.nombreUnidadUsuaria || 'N/A',
      responsable_unidad_usuaria: expediente.unidadUsuaria?.nombreResponsableUnidadUsuaria || 'N/A',

      // Fase preparatoria
      detalles_tecnicos: expediente.fasePreparatoria?.detallesTecnicosCalidad || 'N/A',
      direccion_retiro_pliego: expediente.fasePreparatoria?.direccionRetiroPliego || 'N/A',
      horario_retiro_pliego: expediente.fasePreparatoria?.horarioRetiroPliego || 'N/A',
      costo_pliego_bs: expediente.fasePreparatoria?.costoPliegoBs?.toString() || 'N/A',
      dias_validez_oferta: expediente.fasePreparatoria?.diasValidezOferta?.toString() || 'N/A',

      // Cronograma
      fecha_llamado: expediente.cronograma?.fechaLlamadoParticipar
        ? new Date(expediente.cronograma.fechaLlamadoParticipar).toLocaleDateString('es-VE')
        : 'N/A',
      fecha_inicio_pliego: expediente.cronograma?.fechaInicioDisponibilidadPliego
        ? new Date(expediente.cronograma.fechaInicioDisponibilidadPliego).toLocaleDateString(
            'es-VE',
          )
        : 'N/A',
      fecha_fin_pliego: expediente.cronograma?.fechaFinDisponibilidadPliego
        ? new Date(expediente.cronograma.fechaFinDisponibilidadPliego).toLocaleDateString('es-VE')
        : 'N/A',
      fecha_apertura_sobres: expediente.cronograma?.fechaActoRecepcionAperturaSobres
        ? new Date(expediente.cronograma.fechaActoRecepcionAperturaSobres).toLocaleDateString(
            'es-VE',
          )
        : 'N/A',

      // Criterios de evaluación condicional según tipo de contratación
      // En la plantilla DOCX usar:
      //   {#es_bienes} ... tablas de Bienes/Suministros ... {/es_bienes}
      //   {#es_servicios} ... tablas de Servicios ... {/es_servicios}
      //   {#es_obras} ... tablas de Obras ... {/es_obras}
      tipo_objeto_contratacion: expediente.modalidad?.tipoContratacion || 'N/A',
      es_bienes:
        expediente.modalidad?.tipoContratacion === 'BIENES' ||
        expediente.modalidad?.tipoContratacion === 'MIXTO',
      es_servicios: expediente.modalidad?.tipoContratacion === 'SERVICIOS',
      es_obras: expediente.modalidad?.tipoContratacion === 'OBRAS',

      // Metadatos
      fecha_generacion: now.toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      anio: now.getFullYear().toString(),

      // Lista de adquirientes para el loop de la tabla en la plantilla
      // En la plantilla DOCX usar: {#adquirientes}...{/adquirientes}
      adquirientes: expediente.adquirientesPliego.map((adq: any, index: number) => ({
        numero: index + 1,
        fec_adquisicion_pliego_au_au: new Date(adq.fechaAdquisicion).toLocaleDateString('es-VE'),
        nombre_proveedor_adquiriente_au_au:
          adq.nombreProveedorAdquiriente || adq.proveedor?.nombre || 'N/A',
        direccion_fiscal_proveedor_adquirente_au_au:
          adq.direccionFiscalProveedorAdquirente || adq.proveedor?.direccionFiscal || 'N/A',
        telefono_proveedor_adquirente_au_au:
          adq.telefonoProveedorAdquirente || adq.proveedor?.telefono || 'N/A',
        correo_proveedor_adquirente_au_au:
          adq.correoProveedorAdquirente || adq.proveedor?.correo || 'N/A',
        datos_pago_pliego_au_au: adq.datosPagoPliego || 'N/A',
      })),
    };

    // 6. Descargar logo del ente
    let logoBuffer: Buffer;
    try {
      if (ente.logoUrl) {
        const response = await axios.get(ente.logoUrl, { responseType: 'arraybuffer' });
        logoBuffer = Buffer.from(response.data);
      } else {
        throw new Error('No logo URL');
      }
    } catch {
      const placeholderPath = path.join(__dirname, 'templates', 'placeholder_logo.png');
      logoBuffer = fs.existsSync(placeholderPath)
        ? fs.readFileSync(placeholderPath)
        : Buffer.alloc(0);
    }

    // 7. Configurar módulo de imagen
    const imageModule = new ImageModule({
      centered: false,
      getImage: () => logoBuffer,
      getSize: () => [150, 150],
    });

    // 8. Inicializar Docxtemplater
    let doc: Docxtemplater;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        modules: [imageModule],
      });
    } catch (docError: any) {
      throw new BadRequestException(
        `Error al inicializar el procesador de documentos: ${docError.message}`,
      );
    }

    // 9. Renderizar documento
    try {
      doc.render({
        ...data,
        logo_ente: 'logo_placeholder',
      });
    } catch (error: any) {
      throw new BadRequestException(
        `Error al generar documento: ${error.message}. Verifique que los marcadores en la plantilla estén correctos.`,
      );
    }

    // 10. Generar buffer del DOCX
    let buffer: Buffer;
    try {
      buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
    } catch (genError: any) {
      throw new BadRequestException(`Error al generar buffer del documento: ${genError.message}`);
    }

    // 11. Subir a Cloudinary
    const fileName = `pliego-${expediente.codigoNomenclatura.replace(/\//g, '-')}-${Date.now()}.docx`;
    const filePath = `pliegos/${enteId}/${expedienteId}/${fileName}`;

    let fileUrl: string;
    try {
      fileUrl = await this.storage.uploadFile(buffer, filePath);
    } catch (uploadError: any) {
      throw new BadRequestException(`Error al subir archivo: ${uploadError.message}`);
    }

    // 12. Registrar en BD
    const pliego = await this.prisma.pliegoGenerado.create({
      data: {
        enteId,
        expedienteId,
        urlArchivo: fileUrl,
        tituloPliego: `Pliego de Condiciones - ${expediente.codigoNomenclatura}`,
        descripcion:
          descripcion ||
          `Pliego de condiciones generado automáticamente para el expediente ${expediente.codigoNomenclatura}`,
        versionDocumento: 1,
        createdBy: userId,
      },
    });

    return {
      id: pliego.id,
      url: fileUrl,
      fileName,
      generatedAt: pliego.createdAt,
      titulo: pliego.tituloPliego,
      expedienteId,
    };
  }

  // =========================================================================
  // PREVISUALIZACIÓN, DESCARGA Y ENVÍO
  // =========================================================================

  /**
   * Genera URL de previsualización usando Google Docs Viewer.
   */
  async getPreviewUrl(pliegoId: string, enteId: string) {
    const pliego = await this.findPliego(pliegoId, enteId);

    const previewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pliego.urlArchivo)}&embedded=true`;

    return {
      previewUrl,
      tituloPliego: pliego.tituloPliego,
      urlArchivo: pliego.urlArchivo,
    };
  }

  /**
   * Retorna la URL y nombre del archivo para descarga.
   */
  async downloadPliego(pliegoId: string, enteId: string) {
    const pliego = await this.findPliego(pliegoId, enteId);

    return {
      url: pliego.urlArchivo,
      fileName: `${pliego.tituloPliego.replace(/\s+/g, '-')}.docx`,
    };
  }

  /**
   * Envía el pliego por correo electrónico como archivo adjunto.
   */
  async sendPliegoByEmail(pliegoId: string, enteId: string, emailDestino: string) {
    const result = await this.downloadPliego(pliegoId, enteId);

    // Descargar el archivo desde Cloudinary
    const response = await axios.get(result.url, {
      responseType: 'arraybuffer',
    });
    const fileBuffer = Buffer.from(response.data);

    // Obtener nombre del destinatario
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailDestino, deletedAt: null },
    });
    const nombre = usuario ? usuario.nombre : emailDestino;

    // Enviar por email
    await this.emailService.sendPliegoByEmail(emailDestino, nombre, fileBuffer, result.fileName);

    return {
      message: `Pliego enviado exitosamente a ${emailDestino}`,
      fileName: result.fileName,
    };
  }

  // =========================================================================
  // MÉTODOS INTERNOS
  // =========================================================================

  /**
   * Busca un PliegoGenerado por ID y enteId.
   */
  private async findPliego(pliegoId: string, enteId: string) {
    const pliego = await this.prisma.pliegoGenerado.findFirst({
      where: { id: pliegoId, enteId, deletedAt: null },
    });

    if (!pliego) {
      throw new NotFoundException('Pliego generado no encontrado');
    }

    return pliego;
  }

  /**
   * Extrae el publicId de Cloudinary desde una URL segura.
   */
  private extractCloudinaryPublicId(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
