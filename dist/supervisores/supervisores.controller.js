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
exports.SupervisoresController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const supervisores_service_1 = require("./supervisores.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_supervisor_dto_1 = require("./dto/create-supervisor.dto");
const asignar_entes_dto_1 = require("./dto/asignar-entes.dto");
let SupervisoresController = class SupervisoresController {
    supervisoresService;
    constructor(supervisoresService) {
        this.supervisoresService = supervisoresService;
    }
    create(createDto, user) {
        return this.supervisoresService.create(createDto, user.id);
    }
    findAll() {
        return this.supervisoresService.findAll();
    }
    findOne(id) {
        return this.supervisoresService.findOne(id);
    }
    async asignarEntes(id, dto, user) {
        return this.supervisoresService.asignarEntes(id, dto, user.id);
    }
    remove(id, user) {
        return this.supervisoresService.remove(id, user.id);
    }
};
exports.SupervisoresController = SupervisoresController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Crear supervisor', description: 'Crea un nuevo usuario con rol SUPERVISOR y le asigna Entes' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Supervisor creado exitosamente' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email ya registrado' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_supervisor_dto_1.CreateSupervisorDto, Object]),
    __metadata("design:returntype", void 0)
], SupervisoresController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar supervisores', description: 'Obtiene la lista de todos los supervisores del sistema' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista de supervisores' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SupervisoresController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver supervisor', description: 'Obtiene los detalles de un supervisor específico incluyendo sus Entes asignados' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID del supervisor' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Detalles del supervisor' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Supervisor no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SupervisoresController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/asignar-entes'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Asignar/Remover Entes', description: 'Modifica dinámicamente los Entes asignados a un supervisor' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID del supervisor' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Asignación actualizada' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Supervisor no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, asignar_entes_dto_1.AsignarEntesDto, Object]),
    __metadata("design:returntype", Promise)
], SupervisoresController.prototype, "asignarEntes", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar supervisor', description: 'Elimina un supervisor (soft delete)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID del supervisor' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Supervisor eliminado' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Supervisor no encontrado' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SupervisoresController.prototype, "remove", null);
exports.SupervisoresController = SupervisoresController = __decorate([
    (0, swagger_1.ApiTags)('👨‍💼 Supervisores'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('supervisores'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('UNIVERSITAS'),
    __metadata("design:paramtypes", [supervisores_service_1.SupervisoresService])
], SupervisoresController);
//# sourceMappingURL=supervisores.controller.js.map