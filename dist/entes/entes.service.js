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
exports.EntesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let EntesService = class EntesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createEnteDto, universitasId) {
        return this.prisma.entePublico.create({
            data: {
                ...createEnteDto,
                universitasId,
                createdBy: universitasId,
            },
        });
    }
    async findAll(user) {
        let whereClause = { deletedAt: null };
        if (user) {
            if (user.rol === 'SUPERVISOR' && user.id) {
                const asignaciones = await this.prisma.supervisorAsignacion.findMany({
                    where: { supervisorId: user.id },
                    select: { enteId: true },
                });
                const entesIds = asignaciones.map(a => a.enteId);
                whereClause.id = { in: entesIds };
            }
            else if (user.rol !== 'UNIVERSITAS' && user.enteId) {
                whereClause.id = user.enteId;
            }
        }
        return this.prisma.entePublico.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: {
                        usuarios: true,
                        expedientes: true,
                        proveedores: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const ente = await this.prisma.entePublico.findFirst({
            where: { id, deletedAt: null },
            include: {
                usuarios: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        nombre: true,
                        apellido: true,
                        email: true,
                        rol: true,
                        activo: true,
                    },
                },
                maximasAutoridades: {
                    where: { vigente: true, deletedAt: null },
                },
                comisiones: {
                    where: { deletedAt: null },
                    include: { miembros: true },
                },
            },
        });
        if (!ente) {
            throw new common_1.NotFoundException(`Ente con ID ${id} no encontrado`);
        }
        return ente;
    }
    async remove(id, userId) {
        return this.prisma.entePublico.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                updatedBy: userId,
            },
        });
    }
};
exports.EntesService = EntesService;
exports.EntesService = EntesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntesService);
//# sourceMappingURL=entes.service.js.map