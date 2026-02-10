import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import axios from 'axios';
// @ts-ignore
import ImageModule from 'docxtemplater-image-module-free';
import { PrismaService } from '../database/prisma.service';
import { IStorageService } from '../common/interfaces/storage-service.interface';

@Injectable()
export class ManualesService {
  constructor(
    private prisma: PrismaService,
    @Inject('IStorageService') private storage: any, // Usar any o interfaz compatible para evitar problemas de metadata
  ) { }

  async generarManual(
    enteId: string,
    tipoManual: string = 'GENERAL',
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

    // 2. Validar que el Ente tenga todos los campos requeridos
    this.validarDatosCompletos(ente);

    // 3. Cargar plantilla base - EXACT PATTERN from working test script
    const templatePath = path.join(process.cwd(), 'src', 'manuales', 'templates', 'manual-ente-base.docx');

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
    console.log('  - First 4 chars code:', content.charCodeAt(0), content.charCodeAt(1), content.charCodeAt(2), content.charCodeAt(3));

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
    const data = {
      nom_ente_contratante: ente.nombre,
      siglas_ente: ente.siglas || 'N/A',
      logo_ente: ente.logoUrl || 'N/A', // Marcador para la imagen
      nom_unidad_admin_financiera:
        ente.nombreUnidadAdminFinanciera || 'Dirección de Administración',
      nom_unidad_contratante: ente.nombreUnidadContratante || 'Unidad de Contrataciones',
      nom_unidad_tecnologia: ente.nombreUnidadTecnologia || 'Dirección de Tecnología',

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
      logoBuffer = fs.existsSync(placeholderPath) ? fs.readFileSync(placeholderPath) : Buffer.alloc(0);
    }

    // 6. Configurar Modulo de Imagen (Síncrono)
    const imageModule = new ImageModule({
      centered: false,
      getImage: (tagValue: string, tagName: string) => {
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
      throw new BadRequestException(`SPECIFIC ERROR at Docxtemplater creation: ${docError.message}`);
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

    // 11. Obtener siguiente versión
    console.log('🔢 Getting next version...');
    const nextVersion = await this.getNextVersion(enteId, tipoManual);
    console.log('✅ Next version:', nextVersion);

    // 12. Registrar en BD
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
          versionDocumento: nextVersion,
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
      version: nextVersion,
      generatedAt: manual.createdAt,
      tipoManual: manual.tipoManual,
      titulo: manual.tituloManual,
    };
  }

  private validarDatosCompletos(ente: any) {
    const camposFaltantes: string[] = [];

    if (!ente.nombre) camposFaltantes.push('Nombre del Ente');
    if (!ente.nombreUnidadAdminFinanciera)
      camposFaltantes.push('Nombre de Unidad Administrativa y Financiera');
    if (!ente.nombreUnidadContratante) camposFaltantes.push('Nombre de Unidad Contratante');
    if (!ente.nombreUnidadTecnologia) camposFaltantes.push('Nombre de Unidad de Tecnología');

    if (camposFaltantes.length > 0) {
      throw new BadRequestException(
        `El Ente no tiene configurados los siguientes campos obligatorios: ${camposFaltantes.join(', ')}. ` +
        'Por favor, actualice la configuración del Ente antes de generar el manual.',
      );
    }
  }

  private async getNextVersion(enteId: string, tipoManual: string): Promise<number> {
    const lastManual = await this.prisma.manualGenerado.findFirst({
      where: { enteId, tipoManual, deletedAt: null },
      orderBy: { versionDocumento: 'desc' },
    });

    return lastManual ? lastManual.versionDocumento + 1 : 1;
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

  async download(id: string, enteId: string) {
    const manual = await this.findOne(id, enteId);

    return {
      url: manual.urlArchivo,
      fileName: `${manual.tituloManual.replace(/\s+/g, '-')}-v${manual.versionDocumento}.docx`,
    };
  }
}
