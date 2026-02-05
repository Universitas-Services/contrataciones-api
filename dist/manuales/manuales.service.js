"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualesService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pizzip_1 = __importDefault(require("pizzip"));
const docxtemplater_1 = __importDefault(require("docxtemplater"));
const prisma_service_1 = require("../database/prisma.service");
const storage_service_1 = require("../storage/storage.service");
let ManualesService = class ManualesService {
    prisma;
    storage;
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async generarManual(enteId, tipoManual = 'GENERAL', descripcion, userId) {
        const ente = await this.prisma.entePublico.findUnique({
            where: { id: enteId, deletedAt: null },
        });
        if (!ente) {
            throw new common_1.NotFoundException('Ente no encontrado');
        }
        this.validarDatosCompletos(ente);
        const templatePath = path.join(__dirname, 'templates', 'manual-ente-base.docx');
        if (!fs.existsSync(templatePath)) {
            throw new common_1.BadRequestException(`Plantilla no encontrada en: ${templatePath}. Por favor, coloque el archivo manual-ente-base.docx en la carpeta templates.`);
        }
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new pizzip_1.default(content);
        const doc = new docxtemplater_1.default(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' },
        });
        const now = new Date();
        const data = {
            nom_ente_contratante: ente.nombre,
            siglas_ente: ente.siglas || 'N/A',
            nom_unidad_admin_financiera: ente.nombreUnidadAdminFinanciera || 'Dirección de Administración',
            nom_unidad_contratante: ente.nombreUnidadContratante || 'Unidad de Contrataciones',
            nom_unidad_tecnologia: ente.nombreUnidadTecnologia || 'Dirección de Tecnología',
            fecha_generacion: now.toLocaleDateString('es-VE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            anio: now.getFullYear().toString(),
        };
        doc.setData(data);
        try {
            doc.render();
        }
        catch (error) {
            throw new common_1.BadRequestException(`Error al generar documento: ${error.message}. Verifique que los marcadores en la plantilla estén correctos.`);
        }
        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        });
        const fileName = `manual-${tipoManual.toLowerCase()}-${Date.now()}.docx`;
        const filePath = `manuales/${enteId}/${fileName}`;
        const fileUrl = await this.storage.uploadFile(buffer, filePath);
        const nextVersion = await this.getNextVersion(enteId, tipoManual);
        const manual = await this.prisma.manualGenerado.create({
            data: {
                enteId,
                tipoManual,
                urlArchivo: fileUrl,
                tituloManual: `Manual ${tipoManual} - ${ente.siglas || ente.nombre}`,
                descripcion: descripcion || `Manual ${tipoManual} generado automáticamente para ${ente.nombre}`,
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
    validarDatosCompletos(ente) {
        const camposFaltantes = [];
        if (!ente.nombre)
            camposFaltantes.push('Nombre del Ente');
        if (!ente.nombreUnidadAdminFinanciera)
            camposFaltantes.push('Nombre de Unidad Administrativa y Financiera');
        if (!ente.nombreUnidadContratante)
            camposFaltantes.push('Nombre de Unidad Contratante');
        if (!ente.nombreUnidadTecnologia)
            camposFaltantes.push('Nombre de Unidad de Tecnología');
        if (camposFaltantes.length > 0) {
            throw new common_1.BadRequestException(`El Ente no tiene configurados los siguientes campos obligatorios: ${camposFaltantes.join(', ')}. ` +
                'Por favor, actualice la configuración del Ente antes de generar el manual.');
        }
    }
    async getNextVersion(enteId, tipoManual) {
        const lastManual = await this.prisma.manualGenerado.findFirst({
            where: { enteId, tipoManual, deletedAt: null },
            orderBy: { versionDocumento: 'desc' },
        });
        return lastManual ? lastManual.versionDocumento + 1 : 1;
    }
    async findAll(enteId) {
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
    async findOne(id, enteId) {
        const manual = await this.prisma.manualGenerado.findFirst({
            where: { id, enteId, deletedAt: null },
        });
        if (!manual) {
            throw new common_1.NotFoundException('Manual no encontrado');
        }
        return manual;
    }
    async download(id, enteId) {
        const manual = await this.findOne(id, enteId);
        return {
            url: manual.urlArchivo,
            fileName: `${manual.tituloManual.replace(/\s+/g, '-')}-v${manual.versionDocumento}.docx`,
        };
    }
};
exports.ManualesService = ManualesService;
exports.ManualesService = ManualesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_service_1.StorageService])
], ManualesService);
//# sourceMappingURL=manuales.service.js.map