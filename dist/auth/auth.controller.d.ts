import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            nombre: string;
            email: string;
            rol: string;
            apellido?: undefined;
            ente?: undefined;
        };
    } | {
        access_token: string;
        user: {
            id: string;
            nombre: string;
            apellido: string;
            email: string;
            rol: import(".prisma/client").$Enums.RolUsuario;
            ente: {
                id: string;
                nombre: string;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                universitasId: string;
                rif: string | null;
                siglas: string | null;
                logoUrl: string | null;
                direccionFiscal: string | null;
                estado: string | null;
                municipio: string | null;
                parroquia: string | null;
                nombreUnidadAdminFinanciera: string | null;
                nombreUnidadTecnologia: string | null;
                nombreUnidadContratante: string | null;
                organoAdscripcion: string | null;
                createdBy: string | null;
                updatedBy: string | null;
            } | null;
        };
    }>;
}
