import { PrismaService } from '../database/prisma.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { AsignarEntesDto } from './dto/asignar-entes.dto';
export declare class SupervisoresService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createDto: CreateSupervisorDto, createdBy: string): Promise<{
        email: string;
        id: string;
        enteId: string | null;
        supervisorId: string | null;
        passwordHash: string;
        nombre: string;
        apellido: string;
        rol: import(".prisma/client").$Enums.RolUsuario;
        activo: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findAll(): Promise<{
        id: string;
        nombre: string;
        email: string;
        activo: boolean;
        cantidadEntesAsignados: number;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        nombre: string;
        email: string;
        activo: boolean;
        rol: import(".prisma/client").$Enums.RolUsuario;
        entesAsignados: {
            asignadoEn: Date;
            id: string;
            nombre: string;
            rif: string | null;
            siglas: string | null;
        }[];
    }>;
    asignarEntes(supervisorId: string, dto: AsignarEntesDto, updatedBy: string): Promise<{
        id: string;
        nombre: string;
        email: string;
        activo: boolean;
        rol: import(".prisma/client").$Enums.RolUsuario;
        entesAsignados: {
            asignadoEn: Date;
            id: string;
            nombre: string;
            rif: string | null;
            siglas: string | null;
        }[];
    }>;
    remove(id: string, deletedBy: string): Promise<{
        message: string;
        id: string;
    }>;
    tieneAccesoAEnte(supervisorId: string, enteId: string): Promise<boolean>;
    getEntesAsignados(supervisorId: string): Promise<string[]>;
}
