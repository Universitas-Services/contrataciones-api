import { ManualesService } from './manuales.service';
import { GenerarManualDto } from './dto/generar-manual.dto';
export declare class ManualesController {
    private readonly manualesService;
    constructor(manualesService: ManualesService);
    generar(dto: GenerarManualDto, user: any): Promise<{
        id: any;
        url: string;
        fileName: string;
        version: number;
        generatedAt: any;
        tipoManual: any;
        titulo: any;
    }>;
    findAll(user: any): Promise<{
        id: string;
        createdAt: Date;
        createdBy: string | null;
        tipoManual: string;
        tituloManual: string;
        descripcion: string | null;
        urlArchivo: string;
        versionDocumento: number;
    }[]>;
    findOne(id: string, user: any): Promise<{
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
    download(id: string, user: any, res: any): Promise<void>;
}
