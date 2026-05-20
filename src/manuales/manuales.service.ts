/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import axios from 'axios';
import ImageModule from 'docxtemplater-image-module-free';
import { PrismaService } from '../database/prisma.service';
import { IStorageService } from '../common/interfaces/storage-service.interface';
import { EmailService } from '../email/email.service';

@Injectable()
export class ManualesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,

    @Inject('IStorageService') private storage: any, // Usar any o interfaz compatible para evitar problemas de metadata
  ) {}

  async generarManual(
    enteId: string,
    tipoManual: string = 'GENERAL',
    descripcion: string | undefined,
    userId: string,
  ) {
    // 1. Obtener datos del Ente
    const ente = await this.prisma.entePublico.findUnique({
      where: { id: enteId, deletedAt: null },
      include: {
        comisiones: { where: { activa: true, deletedAt: null }, take: 1 },
        maximasAutoridades: { where: { vigente: true, deletedAt: null }, take: 1 },
        unidadesContratantes: { where: { activa: true, deletedAt: null }, take: 1 },
      },
    });

    if (!ente) {
      throw new NotFoundException('Ente no encontrado');
    }

    // 2. Eliminar manual anterior si existe (un ente solo tiene UN manual)
    const manualAnterior = await this.prisma.manualGenerado.findFirst({
      where: { enteId, deletedAt: null },
    });

    if (manualAnterior) {
      // Eliminar archivo de Cloudinary
      try {
        const publicId = this.extractCloudinaryPublicId(manualAnterior.urlArchivo);
        if (publicId) {
          await this.storage.deleteFile(publicId);
          console.log('🗑️ Manual anterior eliminado de Cloudinary:', publicId);
        }
      } catch (deleteError: any) {
        console.warn(
          '⚠️ No se pudo eliminar el manual anterior de Cloudinary:',
          deleteError.message,
        );
      }

      // Eliminar registro de BD
      await this.prisma.manualGenerado.delete({
        where: { id: manualAnterior.id },
      });
      console.log('🗑️ Registro anterior eliminado de BD:', manualAnterior.id);
    }

    // 3. Validar que el Ente tenga todos los campos requeridos
    this.validarDatosCompletos(ente);

    // 3. Cargar plantilla base - usar __dirname para que funcione en dev (src/) y prod (dist/)
    const templatePath = path.join(__dirname, 'templates', 'manual-ente-base.docx');

    if (!fs.existsSync(templatePath)) {
      throw new BadRequestException(
        `Plantilla no encontrada en: ${templatePath}. Por favor, coloque el archivo manual-ente-base.docx en la carpeta templates.`,
      );
    }

    // EXACT MATCH: read as 'binary' like test script
    const content = fs.readFileSync(templatePath, 'binary');

    // EXACT MATCH: create PizZip immediately with content
    console.log('🔍 About to create PizZip instance...');
    console.log('  - Content type:', typeof content);
    console.log('  - Content length:', content.length);
    console.log(
      '  - First 4 chars code:',
      content.charCodeAt(0),
      content.charCodeAt(1),
      content.charCodeAt(2),
      content.charCodeAt(3),
    );

    let zip: any;
    try {
      zip = new PizZip(content);
      console.log('✅ PizZip instance created successfully!');
    } catch (zipError: any) {
      console.error('❌ FAILED at new PizZip(content):', {
        message: zipError.message,
        name: zipError.name,
        stack: zipError.stack,
      });

      throw new BadRequestException(`SPECIFIC ERROR at PizZip creation: ${zipError.message}`);
    }

    // 4. Preparar datos para reemplazo
    const now = new Date();

    // Extraer valores de las relaciones o usar valores por defecto
    const denominacion_comision =
      ente.comisiones?.[0]?.denominacionComision || 'Comisión de Contrataciones';
    const cargo_oficial_autoridad =
      ente.maximasAutoridades?.[0]?.cargoOficialAutoridad || 'Máxima Autoridad';
    const nom_unidad_contratante =
      ente.unidadesContratantes?.[0]?.nombreUnidadContratante ||
      ente.nombreUnidadContratante ||
      'Unidad de Contrataciones';

    const data = {
      nom_ente_contratante: ente.nombre,
      siglas_ente: ente.siglas || 'N/A',
      logo_ente: ente.logoUrl || 'N/A', // Marcador para la imagen
      nom_unidad_admin_financiera:
        ente.nombreUnidadAdminFinanciera || 'Dirección de Administración',
      nom_unidad_contratante,
      nom_unidad_tecnologia: ente.nombreUnidadTecnologia || 'Dirección de Tecnología',

      denominacion_comision,
      cargo_oficial_autoridad,

      // Datos adicionales
      fecha_generacion: now.toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      anio: now.getFullYear().toString(),
    };

    // 5. Descargar imagen (Logo)
    let logoBuffer: Buffer;
    try {
      if (ente.logoUrl) {
        const response = await axios.get(ente.logoUrl, { responseType: 'arraybuffer' });

        logoBuffer = Buffer.from(response.data);
      } else {
        throw new Error('No logo URL');
      }
    } catch (e) {
      // Fallback
      const placeholderPath = path.join(__dirname, 'templates', 'placeholder_logo.png');
      logoBuffer = fs.existsSync(placeholderPath)
        ? fs.readFileSync(placeholderPath)
        : Buffer.alloc(0);
    }

    // 6. Configurar Modulo de Imagen (Síncrono)
    const imageModule = new ImageModule({
      centered: false,
      getImage: (_tagValue: string, _tagName: string) => {
        // tagValue será 'logo_ente_img' (el valor del string en data)
        // Pero aquí devolvemos directamente el buffer preparado
        return logoBuffer;
      },
      getSize: () => [150, 150],
    });

    // 7. Inicializar Docxtemplater - EXACT PATTERN from test script
    console.log('🔧 About to create Docxtemplater instance...');
    let doc: Docxtemplater;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        modules: [imageModule],
      });
      console.log('✅ Docxtemplater instance created successfully!');
    } catch (docError: any) {
      console.error('❌ FAILED at new Docxtemplater(zip):', {
        message: docError.message,

        name: docError.name,

        stack: docError.stack,
      });

      throw new BadRequestException(
        `SPECIFIC ERROR at Docxtemplater creation: ${docError.message}`,
      );
    }

    // 8. Renderizar documento
    console.log('📝 About to render document...');
    try {
      doc.render({
        ...data,
        logo_ente: 'logo_placeholder', // El valor string activa el modulo si coincide con el tag
      });
      console.log('✅ Document rendered successfully!');
    } catch (error: any) {
      console.error('❌ FAILED at doc.render():', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      throw new BadRequestException(
        `Error al generar documento: ${error.message}. Verifique que los marcadores en la plantilla estén correctos.`,
      );
    }

    // 9. Generar buffer del DOCX - EXACT PATTERN from test script
    console.log('📦 About to generate buffer...');
    let buffer: Buffer;
    try {
      buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      console.log('✅ Buffer generated successfully!');
    } catch (genError: any) {
      console.error('❌ FAILED at doc.getZip().generate():', {
        message: genError.message,
        name: genError.name,
        stack: genError.stack,
      });

      throw new BadRequestException(`Error al generar buffer ZIP: ${genError.message}`);
    }

    // 10. Guardar archivo en storage
    const fileName = `manual-${tipoManual.toLowerCase()}-${Date.now()}.docx`;
    const filePath = `manuales/${enteId}/${fileName}`;

    console.log('☁️ About to upload to storage...');
    let fileUrl: string;
    try {
      fileUrl = await this.storage.uploadFile(buffer, filePath);
      console.log('✅ File uploaded successfully to:', fileUrl);
    } catch (uploadError: any) {
      console.error('❌ FAILED at this.storage.uploadFile():', {
        message: uploadError.message,
        name: uploadError.name,
        stack: uploadError.stack,
      });

      throw new BadRequestException(`Error al subir archivo: ${uploadError.message}`);
    }

    // 11. Registrar en BD
    console.log('💾 About to save to database...');
    let manual: any;
    try {
      manual = await this.prisma.manualGenerado.create({
        data: {
          enteId,
          tipoManual,
          urlArchivo: fileUrl,
          tituloManual: `Manual ${tipoManual} - ${ente.siglas || ente.nombre}`,
          descripcion:
            descripcion || `Manual ${tipoManual} generado automáticamente para ${ente.nombre}`,
          versionDocumento: 1,
          createdBy: userId,
        },
      });
      console.log('✅ Manual saved to database successfully!');
    } catch (dbError: any) {
      console.error('❌ FAILED at prisma.manualGenerado.create():', {
        message: dbError.message,
        name: dbError.name,
        stack: dbError.stack,
      });

      throw new BadRequestException(`Error al guardar en base de datos: ${dbError.message}`);
    }

    return {
      id: manual.id,
      url: fileUrl,
      fileName,
      generatedAt: manual.createdAt,
      tipoManual: manual.tipoManual,
      titulo: manual.tituloManual,
    };
  }

  private validarDatosCompletos(ente: any) {
    const requisitos = this.evaluarRequisitosInterno(ente);

    if (!requisitos.puedeGenerarManual) {
      throw new BadRequestException(
        `El Ente no cumple con los requisitos para generar el manual: ${requisitos.requisitosFaltantes.join(' ')} ` +
          'Por favor, actualice la configuración del Ente antes de generar el manual.',
      );
    }
  }

  /**
   * Endpoint-ready function para verificar los requisitos faltantes.
   * Busca al ente de nuevo con relaciones, ya que podría llamarse desde el controller directo.
   */
  async verificarRequisitosManual(enteId: string) {
    const ente = await this.prisma.entePublico.findUnique({
      where: { id: enteId, deletedAt: null },
      include: {
        comisiones: { where: { activa: true, deletedAt: null }, take: 1 },
        maximasAutoridades: { where: { vigente: true, deletedAt: null }, take: 1 },
        unidadesContratantes: { where: { activa: true, deletedAt: null }, take: 1 },
      },
    });

    if (!ente) {
      throw new NotFoundException('Ente no encontrado');
    }

    return this.evaluarRequisitosInterno(ente);
  }

  private evaluarRequisitosInterno(ente: any) {
    const camposFaltantes: string[] = [];

    if (!ente.nombre) camposFaltantes.push('Nombre del Ente.');
    if (!ente.nombreUnidadAdminFinanciera)
      camposFaltantes.push('Nombre de Unidad Administrativa y Financiera.');
    if (!ente.nombreUnidadTecnologia) camposFaltantes.push('Nombre de Unidad de Tecnología.');

    // Verificar arreglos relacionales (los incluimos en el findUnique previo)
    if (!ente.maximasAutoridades || ente.maximasAutoridades.length === 0) {
      camposFaltantes.push('No se ha configurado una Máxima Autoridad vigente.');
    }
    if (!ente.comisiones || ente.comisiones.length === 0) {
      camposFaltantes.push('Falta registrar al menos una Comisión de Contrataciones activa.');
    }
    if (!ente.unidadesContratantes || ente.unidadesContratantes.length === 0) {
      // También podríamos perdonarlo si tiene el nombre básico: ente.nombreUnidadContratante
      if (!ente.nombreUnidadContratante) {
        camposFaltantes.push('Falta registrar al menos una Unidad Contratante activa.');
      }
    }

    return {
      puedeGenerarManual: camposFaltantes.length === 0,
      requisitosFaltantes: camposFaltantes,
    };
  }

  /**
   * Extrae el publicId de Cloudinary desde una URL segura.
   */
  private extractCloudinaryPublicId(url: string): string | null {
    try {
      // URL formato: https://res.cloudinary.com/xxx/raw/upload/v123/manuales/enteId/archivo.docx
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Genera una URL de previsualización usando Google Docs Viewer.
   * El frontend la usa en un iframe dentro de un modal/popup.
   */
  async getPreviewUrl(enteId: string) {
    const manual = await this.findByEnte(enteId);

    const previewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(manual.urlArchivo)}&embedded=true`;

    return {
      previewUrl,
      tituloManual: manual.tituloManual,
      urlArchivo: manual.urlArchivo,
    };
  }

  /**
   * Busca el único manual de un ente.
   */
  async findByEnte(enteId: string) {
    const manual = await this.prisma.manualGenerado.findFirst({
      where: { enteId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!manual) {
      throw new NotFoundException('Este ente no tiene un manual generado');
    }

    return manual;
  }

  async findAll(enteId: string) {
    return this.prisma.manualGenerado.findMany({
      where: { enteId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tipoManual: true,
        tituloManual: true,
        descripcion: true,
        versionDocumento: true,
        urlArchivo: true,
        createdAt: true,
        createdBy: true,
      },
    });
  }

  async findOne(id: string, enteId: string) {
    const manual = await this.prisma.manualGenerado.findFirst({
      where: { id, enteId, deletedAt: null },
    });

    if (!manual) {
      throw new NotFoundException('Manual no encontrado');
    }

    return manual;
  }

  /**
   * Descarga el manual de un ente por su enteId (sin necesitar ID del manual).
   */
  async downloadByEnte(enteId: string) {
    const manual = await this.findByEnte(enteId);

    return {
      url: manual.urlArchivo,
      fileName: `${manual.tituloManual.replace(/\s+/g, '-')}.docx`,
    };
  }

  async download(id: string, enteId: string) {
    const manual = await this.findOne(id, enteId);

    return {
      url: manual.urlArchivo,
      fileName: `${manual.tituloManual.replace(/\s+/g, '-')}.docx`,
    };
  }

  /**
   * Envía el manual de un ente por correo electrónico como archivo adjunto.
   * Busca el manual por enteId (sin necesitar ID del manual).
   */
  async sendManualByEmailByEnte(enteId: string, emailDestino: string) {
    const result = await this.downloadByEnte(enteId);

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
    await this.emailService.sendManualByEmail(emailDestino, nombre, fileBuffer, result.fileName);

    return {
      message: `Manual enviado exitosamente a ${emailDestino}`,
      fileName: result.fileName,
    };
  }
}
