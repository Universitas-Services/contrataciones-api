import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ManualesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
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
    });

    if (!ente) {
      throw new NotFoundException('Ente no encontrado');
    }

    // 2. Validar que el Ente tenga todos los campos requeridos
    this.validarDatosCompletos(ente);

    // 3. Cargar plantilla base
    const templatePath = path.join(__dirname, 'templates', 'manual-ente-base.docx');

    if (!fs.existsSync(templatePath)) {
      throw new BadRequestException(
        `Plantilla no encontrada en: ${templatePath}. Por favor, coloque el archivo manual-ente-base.docx en la carpeta templates.`,
      );
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // 4. Inicializar docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    });

    // 5. Preparar datos para reemplazo
    const now = new Date();
    const data = {
      nom_ente_contratante: ente.nombre,
      siglas_ente: ente.siglas || 'N/A',
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

    // 6. Reemplazar marcadores
    doc.setData(data);

    try {
      doc.render();
    } catch (error: any) {
      throw new BadRequestException(
        `Error al generar documento: ${error.message}. Verifique que los marcadores en la plantilla estén correctos.`,
      );
    }

    // 7. Generar buffer del DOCX
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // 8. Guardar archivo en storage
    const fileName = `manual-${tipoManual.toLowerCase()}-${Date.now()}.docx`;
    const filePath = `manuales/${enteId}/${fileName}`;

    const fileUrl = await this.storage.uploadFile(buffer, filePath);

    // 9. Obtener siguiente versión
    const nextVersion = await this.getNextVersion(enteId, tipoManual);

    // 10. Registrar en BD
    const manual = await this.prisma.manualGenerado.create({
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
