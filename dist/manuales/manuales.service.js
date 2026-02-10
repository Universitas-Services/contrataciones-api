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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
const axios_1 = __importDefault(require("axios"));
const docxtemplater_image_module_free_1 = __importDefault(require("docxtemplater-image-module-free"));
const prisma_service_1 = require("../database/prisma.service");
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
        const templatePath = path.join(process.cwd(), 'src', 'manuales', 'templates', 'manual-ente-base.docx');
        if (!fs.existsSync(templatePath)) {
            throw new common_1.BadRequestException(`Plantilla no encontrada en: ${templatePath}. Por favor, coloque el archivo manual-ente-base.docx en la carpeta templates.`);
        }
        const content = fs.readFileSync(templatePath, 'binary');
        console.log('🔍 About to create PizZip instance...');
        console.log('  - Content type:', typeof content);
        console.log('  - Content length:', content.length);
        console.log('  - First 4 chars code:', content.charCodeAt(0), content.charCodeAt(1), content.charCodeAt(2), content.charCodeAt(3));
        let zip;
        try {
            zip = new pizzip_1.default(content);
            console.log('✅ PizZip instance created successfully!');
        }
        catch (zipError) {
            console.error('❌ FAILED at new PizZip(content):', {
                message: zipError.message,
                name: zipError.name,
                stack: zipError.stack,
            });
            throw new common_1.BadRequestException(`SPECIFIC ERROR at PizZip creation: ${zipError.message}`);
        }
        const now = new Date();
        const data = {
            nom_ente_contratante: ente.nombre,
            siglas_ente: ente.siglas || 'N/A',
            logo_ente: ente.logoUrl || 'N/A',
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
        let logoBuffer;
        try {
            if (ente.logoUrl) {
                const response = await axios_1.default.get(ente.logoUrl, { responseType: 'arraybuffer' });
                logoBuffer = Buffer.from(response.data);
            }
            else {
                throw new Error('No logo URL');
            }
        }
        catch (e) {
            const placeholderPath = path.join(__dirname, 'templates', 'placeholder_logo.png');
            logoBuffer = fs.existsSync(placeholderPath) ? fs.readFileSync(placeholderPath) : Buffer.alloc(0);
        }
        const imageModule = new docxtemplater_image_module_free_1.default({
            centered: false,
            getImage: (tagValue, tagName) => {
                return logoBuffer;
            },
            getSize: () => [150, 150],
        });
        console.log('🔧 About to create Docxtemplater instance...');
        let doc;
        try {
            doc = new docxtemplater_1.default(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '{', end: '}' },
                modules: [imageModule],
            });
            console.log('✅ Docxtemplater instance created successfully!');
        }
        catch (docError) {
            console.error('❌ FAILED at new Docxtemplater(zip):', {
                message: docError.message,
                name: docError.name,
                stack: docError.stack,
            });
            throw new common_1.BadRequestException(`SPECIFIC ERROR at Docxtemplater creation: ${docError.message}`);
        }
        console.log('📝 About to render document...');
        try {
            doc.render({
                ...data,
                logo_ente: 'logo_placeholder',
            });
            console.log('✅ Document rendered successfully!');
        }
        catch (error) {
            console.error('❌ FAILED at doc.render():', {
                message: error.message,
                name: error.name,
                stack: error.stack,
            });
            throw new common_1.BadRequestException(`Error al generar documento: ${error.message}. Verifique que los marcadores en la plantilla estén correctos.`);
        }
        console.log('📦 About to generate buffer...');
        let buffer;
        try {
            buffer = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });
            console.log('✅ Buffer generated successfully!');
        }
        catch (genError) {
            console.error('❌ FAILED at doc.getZip().generate():', {
                message: genError.message,
                name: genError.name,
                stack: genError.stack,
            });
            throw new common_1.BadRequestException(`Error al generar buffer ZIP: ${genError.message}`);
        }
        const fileName = `manual-${tipoManual.toLowerCase()}-${Date.now()}.docx`;
        const filePath = `manuales/${enteId}/${fileName}`;
        console.log('☁️ About to upload to storage...');
        let fileUrl;
        try {
            fileUrl = await this.storage.uploadFile(buffer, filePath);
            console.log('✅ File uploaded successfully to:', fileUrl);
        }
        catch (uploadError) {
            console.error('❌ FAILED at this.storage.uploadFile():', {
                message: uploadError.message,
                name: uploadError.name,
                stack: uploadError.stack,
            });
            throw new common_1.BadRequestException(`Error al subir archivo: ${uploadError.message}`);
        }
        console.log('🔢 Getting next version...');
        const nextVersion = await this.getNextVersion(enteId, tipoManual);
        console.log('✅ Next version:', nextVersion);
        console.log('💾 About to save to database...');
        let manual;
        try {
            manual = await this.prisma.manualGenerado.create({
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
            console.log('✅ Manual saved to database successfully!');
        }
        catch (dbError) {
            console.error('❌ FAILED at prisma.manualGenerado.create():', {
                message: dbError.message,
                name: dbError.name,
                stack: dbError.stack,
            });
            throw new common_1.BadRequestException(`Error al guardar en base de datos: ${dbError.message}`);
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
    __param(1, (0, common_1.Inject)('IStorageService')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], ManualesService);
//# sourceMappingURL=manuales.service.js.map