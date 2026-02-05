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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisoresService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../database/prisma.service");
let SupervisoresService = class SupervisoresService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createDto, createdBy) {
        const existingUser = await this.prisma.usuario.findUnique({
            where: { email: createDto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('El email ya está registrado');
        }
        const entes = await this.prisma.entePublico.findMany({
            where: { id: { in: createDto.entesIds } },
        });
        if (entes.length !== createDto.entesIds.length) {
            throw new common_1.BadRequestException('Algunos Entes especificados no existen');
        }
        const passwordHash = await bcrypt.hash(createDto.password, 10);
        const supervisor = await this.prisma.$transaction(async (tx) => {
            const newSupervisor = await tx.usuario.create({
                data: {
                    nombre: createDto.nombre,
                    apellido: createDto.apellido,
                    email: createDto.email,
                    passwordHash,
                    rol: 'SUPERVISOR',
                    activo: true,
                },
            });
            const asignaciones = createDto.entesIds.map((enteId) => ({
                supervisorId: newSupervisor.id,
                enteId,
                createdBy,
            }));
            await tx.supervisorAsignacion.createMany({
                data: asignaciones,
            });
            return newSupervisor;
        });
        return this.findOne(supervisor.id);
    }
    async findAll() {
        const supervisores = await this.prisma.usuario.findMany({
            where: {
                rol: 'SUPERVISOR',
                deletedAt: null,
            },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
                activo: true,
                createdAt: true,
                _count: {
                    select: {
                        entesAsignados: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return supervisores.map((s) => ({
            id: s.id,
            nombre: `${s.nombre} ${s.apellido}`,
            email: s.email,
            activo: s.activo,
            cantidadEntesAsignados: s._count.entesAsignados,
            createdAt: s.createdAt,
        }));
    }
    async findOne(id) {
        const supervisor = await this.prisma.usuario.findFirst({
            where: {
                id,
                rol: 'SUPERVISOR',
                deletedAt: null,
            },
            include: {
                entesAsignados: {
                    include: {
                        ente: {
                            select: {
                                id: true,
                                nombre: true,
                                siglas: true,
                                rif: true,
                            },
                        },
                    },
                },
            },
        });
        if (!supervisor) {
            throw new common_1.NotFoundException('Supervisor no encontrado');
        }
        return {
            id: supervisor.id,
            nombre: `${supervisor.nombre} ${supervisor.apellido}`,
            email: supervisor.email,
            activo: supervisor.activo,
            rol: supervisor.rol,
            entesAsignados: supervisor.entesAsignados.map((asignacion) => ({
                ...asignacion.ente,
                asignadoEn: asignacion.createdAt,
            })),
        };
    }
    async asignarEntes(supervisorId, dto, updatedBy) {
        const supervisor = await this.prisma.usuario.findFirst({
            where: {
                id: supervisorId,
                rol: 'SUPERVISOR',
                deletedAt: null,
            },
        });
        if (!supervisor) {
            throw new common_1.NotFoundException('Supervisor no encontrado');
        }
        await this.prisma.$transaction(async (tx) => {
            if (dto.removerEntes && dto.removerEntes.length > 0) {
                await tx.supervisorAsignacion.deleteMany({
                    where: {
                        supervisorId,
                        enteId: { in: dto.removerEntes },
                    },
                });
            }
            if (dto.agregarEntes && dto.agregarEntes.length > 0) {
                const entes = await tx.entePublico.findMany({
                    where: { id: { in: dto.agregarEntes } },
                });
                if (entes.length !== dto.agregarEntes.length) {
                    throw new common_1.BadRequestException('Algunos Entes especificados no existen');
                }
                for (const enteId of dto.agregarEntes) {
                    await tx.supervisorAsignacion.upsert({
                        where: {
                            supervisorId_enteId: {
                                supervisorId,
                                enteId,
                            },
                        },
                        create: {
                            supervisorId,
                            enteId,
                            createdBy: updatedBy,
                        },
                        update: {
                            updatedBy,
                            updatedAt: new Date(),
                        },
                    });
                }
            }
        });
        return this.findOne(supervisorId);
    }
    async remove(id, deletedBy) {
        const supervisor = await this.prisma.usuario.findFirst({
            where: {
                id,
                rol: 'SUPERVISOR',
                deletedAt: null,
            },
        });
        if (!supervisor) {
            throw new common_1.NotFoundException('Supervisor no encontrado');
        }
        await this.prisma.usuario.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                activo: false,
            },
        });
        return {
            message: 'Supervisor eliminado correctamente',
            id,
        };
    }
    async tieneAccesoAEnte(supervisorId, enteId) {
        const asignacion = await this.prisma.supervisorAsignacion.findUnique({
            where: {
                supervisorId_enteId: {
                    supervisorId,
                    enteId,
                },
            },
        });
        return !!asignacion;
    }
    async getEntesAsignados(supervisorId) {
        const asignaciones = await this.prisma.supervisorAsignacion.findMany({
            where: { supervisorId },
            select: { enteId: true },
        });
        return asignaciones.map((a) => a.enteId);
    }
};
exports.SupervisoresService = SupervisoresService;
exports.SupervisoresService = SupervisoresService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupervisoresService);
//# sourceMappingURL=supervisores.service.js.map