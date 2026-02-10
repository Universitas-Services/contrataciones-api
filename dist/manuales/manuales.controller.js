"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const manuales_service_1 = require("./manuales.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const generar_manual_dto_1 = require("./dto/generar-manual.dto");
let ManualesController = class ManualesController {
    manualesService;
    constructor(manualesService) {
        this.manualesService = manualesService;
    }
    async generar(dto, user) {
        return this.manualesService.generarManual(user.enteId, dto.tipoManual || 'GENERAL', dto.descripcion, user.id);
    }
    findAll(user) {
        return this.manualesService.findAll(user.enteId);
    }
    findOne(id, user) {
        return this.manualesService.findOne(id, user.enteId);
    }
    async download(id, user, res) {
        const result = await this.manualesService.download(id, user.enteId);
        try {
            const axios = require('axios');
            const response = await axios.get(result.url, {
                responseType: 'arraybuffer',
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            });
            const fileBuffer = Buffer.from(response.data);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
            res.setHeader('Content-Length', fileBuffer.length.toString());
            res.setHeader('Cache-Control', 'no-cache');
            res.end(fileBuffer);
        }
        catch (error) {
            res.status(500).json({
                statusCode: 500,
                message: 'Error al descargar el archivo desde Cloudinary',
                error: error.message,
            });
        }
    }
};
exports.ManualesController = ManualesController;
__decorate([
    (0, common_1.Post)('generar'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('ADMIN_ENTE', 'EJECUTOR'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generar manual',
        description: 'Genera un manual DOCX para el Ente del usuario autenticado',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Manual generado exitosamente' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'No autorizado (solo ADMIN_ENTE y EJECUTOR)',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generar_manual_dto_1.GenerarManualDto, Object]),
    __metadata("design:returntype", Promise)
], ManualesController.prototype, "generar", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar manuales',
        description: 'Obtiene todos los manuales del Ente o de los Entes asignados (SUPERVISOR)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de manuales' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ManualesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver manual',
        description: 'Obtiene los detalles de un manual específico',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID del manual' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Detalles del manual' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Manual no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ManualesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    (0, swagger_1.ApiOperation)({
        summary: 'Descargar manual',
        description: 'Descarga directamente el archivo DOCX del manual',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID del manual' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Archivo DOCX descargado' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Manual no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ManualesController.prototype, "download", null);
exports.ManualesController = ManualesController = __decorate([
    (0, swagger_1.ApiTags)('📄 Manuales'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('manuales'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard, tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [manuales_service_1.ManualesService])
], ManualesController);
//# sourceMappingURL=manuales.controller.js.map