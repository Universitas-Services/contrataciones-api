import { PrismaService } from '../database/prisma.service';
export declare class ManualesService {
    private prisma;
    private storage;
    constructor(prisma: PrismaService, storage: any);
    generarManual(enteId: string, tipoManual: string | undefined, descripcion: string | undefined, userId: string): Promise<{
        id: any;
        url: string;
        fileName: string;
        version: number;
        generatedAt: any;
        tipoManual: any;
        titulo: any;
    }>;
    private validarDatosCompletos;
    private getNextVersion;
    findAll(enteId: string): Promise<{
        id: string;
        createdAt: Date;
        createdBy: string | null;
        tipoManual: string;
        tituloManual: string;
        descripcion: string | null;
        urlArchivo: string;
        versionDocumento: number;
    }[]>;
    findOne(id: string, enteId: string): Promise<{
        id: string;
        enteId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        createdBy: string | null;
        updatedBy: string | null;
        tipoManual: string;
        tituloManual: string;
        descripcion: string | null;
        urlArchivo: string;
        versionDocumento: number;
    }>;
    download(id: string, enteId: string): Promise<{
        url: string;
        fileName: string;
    }>;
}
