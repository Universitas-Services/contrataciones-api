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
exports.EntesService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../database/prisma.service");
let EntesService = class EntesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createEnteDto, universitasId) {
        const { emailContacto, password, nombreAdmin, apellidoAdmin, ...enteData } = createEnteDto;
        const existingUser = await this.prisma.usuario.findUnique({
            where: { email: emailContacto },
        });
        if (existingUser) {
            throw new common_1.ConflictException('El email del administrador ya está registrado');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.prisma.$transaction(async (tx) => {
            const createData = {
                nombre: enteData.nombre,
                universitasId,
                createdBy: universitasId,
            };
            if (enteData.rif !== undefined)
                createData.rif = enteData.rif;
            if (enteData.siglas !== undefined)
                createData.siglas = enteData.siglas;
            if (enteData.logoUrl !== undefined)
                createData.logoUrl = enteData.logoUrl;
            if (enteData.direccionFiscal !== undefined)
                createData.direccionFiscal = enteData.direccionFiscal;
            if (enteData.estado !== undefined)
                createData.estado = enteData.estado;
            if (enteData.municipio !== undefined)
                createData.municipio = enteData.municipio;
            if (enteData.parroquia !== undefined)
                createData.parroquia = enteData.parroquia;
            const ente = await tx.entePublico.create({
                data: createData,
            });
            await tx.usuario.create({
                data: {
                    enteId: ente.id,
                    email: emailContacto,
                    passwordHash: hashedPassword,
                    nombre: nombreAdmin,
                    apellido: apellidoAdmin,
                    rol: 'ADMIN_ENTE',
                    activo: true,
                },
            });
            return ente;
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
                const entesIds = asignaciones.map((a) => a.enteId);
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
    async updateLogo(id, logoUrl, userId) {
        await this.findOne(id);
        return this.prisma.entePublico.update({
            where: { id },
            data: {
                logoUrl,
                updatedBy: userId,
            },
        });
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
    async restore(id, userId) {
        return this.prisma.entePublico.update({
            where: { id },
            data: {
                deletedAt: null,
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