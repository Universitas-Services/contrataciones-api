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
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const prisma_service_1 = require("../../database/prisma.service");
let AuditInterceptor = class AuditInterceptor {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { user, method, url, body } = request;
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle();
        }
        return next.handle().pipe((0, operators_1.tap)(async (data) => {
            try {
                await this.prisma.auditLog.create({
                    data: {
                        usuarioId: user?.id,
                        enteId: user?.enteId,
                        tabla: this.extractTableName(url),
                        registroId: data?.id || 'BULK',
                        accion: this.mapMethodToAction(method),
                        cambios: { body, result: data },
                        ipAddress: request.ip,
                        userAgent: request.headers['user-agent'],
                    },
                });
            }
            catch (error) {
                console.error('Error en audit log:', error);
            }
        }));
    }
    extractTableName(url) {
        const parts = url.split('/').filter((p) => p);
        return parts[parts.length - 2] || 'unknown';
    }
    mapMethodToAction(method) {
        const mapping = {
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
        };
        return mapping[method] || 'CREATE';
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map