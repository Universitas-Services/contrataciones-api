import { SupervisoresService } from './supervisores.service';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { AsignarEntesDto } from './dto/asignar-entes.dto';
export declare class SupervisoresController {
    private readonly supervisoresService;
    constructor(supervisoresService: SupervisoresService);
    create(createDto: CreateSupervisorDto, user: any): Promise<{
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
    asignarEntes(id: string, dto: AsignarEntesDto, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
        message: string;
        id: string;
    }>;
}
