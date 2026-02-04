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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSupervisorDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateSupervisorDto {
    nombre;
    apellido;
    email;
    password;
    entesIds;
}
exports.CreateSupervisorDto = CreateSupervisorDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Carlos', description: 'Nombre del supervisor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupervisorDto.prototype, "nombre", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ramírez', description: 'Apellido del supervisor' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupervisorDto.prototype, "apellido", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'carlos.ramirez@supervision.gob.ve', description: 'Email único del supervisor' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateSupervisorDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'supervisor123', description: 'Contraseña (mínimo 6 caracteres)', minLength: 6 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(6),
    __metadata("design:type", String)
], CreateSupervisorDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: ['ente-uuid-1', 'ente-uuid-2'],
        description: 'Lista de IDs de Entes a asignar al supervisor',
        type: [String]
    }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1, { message: 'Debe asignar al menos un Ente al supervisor' }),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateSupervisorDto.prototype, "entesIds", void 0);
//# sourceMappingURL=create-supervisor.dto.js.map