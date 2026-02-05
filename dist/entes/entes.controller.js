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
exports.EntesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const entes_service_1 = require("./entes.service");
const create_ente_dto_1 = require("./dto/create-ente.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let EntesController = class EntesController {
    entesService;
    constructor(entesService) {
        this.entesService = entesService;
    }
    create(createEnteDto, user) {
        return this.entesService.create(createEnteDto, user.id);
    }
    findAll(user) {
        return this.entesService.findAll(user);
    }
    findOne(id) {
        return this.entesService.findOne(id);
    }
    remove(id, user) {
        return this.entesService.remove(id, user.id);
    }
};
exports.EntesController = EntesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('UNIVERSITAS'),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear Ente',
        description: 'Crea un nuevo Ente Público con su usuario administrador',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Ente creado exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'No autorizado (solo UNIVERSITAS)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ente_dto_1.CreateEnteDto, Object]),
    __metadata("design:returntype", void 0)
], EntesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar Entes',
        description: 'UNIVERSITAS ve todos, SUPERVISOR ve asignados, otros ven solo el suyo',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de Entes según permisos' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EntesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Ver Ente',
        description: 'Obtiene detalles de un Ente específico',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID del Ente' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Detalles del Ente' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Ente no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EntesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('UNIVERSITAS'),
    (0, swagger_1.ApiOperation)({
        summary: 'Eliminar Ente',
        description: 'Elimina un Ente (soft delete)',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID del Ente' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ente eliminado' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'No autorizado (solo UNIVERSITAS)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EntesController.prototype, "remove", null);
exports.EntesController = EntesController = __decorate([
    (0, swagger_1.ApiTags)('🏛️ Entes'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('entes'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [entes_service_1.EntesService])
], EntesController);
//# sourceMappingURL=entes.controller.js.map