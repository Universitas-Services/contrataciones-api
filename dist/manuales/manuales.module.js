"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManualesModule = void 0;
const common_1 = require("@nestjs/common");
const manuales_controller_1 = require("./manuales.controller");
const manuales_service_1 = require("./manuales.service");
let ManualesModule = class ManualesModule {
};
exports.ManualesModule = ManualesModule;
exports.ManualesModule = ManualesModule = __decorate([
    (0, common_1.Module)({
        controllers: [manuales_controller_1.ManualesController],
        providers: [manuales_service_1.ManualesService],
        exports: [manuales_service_1.ManualesService],
    })
], ManualesModule);
//# sourceMappingURL=manuales.module.js.map