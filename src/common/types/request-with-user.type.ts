import { Request } from 'express';

export interface RequestWithUser extends Request {
    user: {
        id: string;
        email: string;
        rol: string;
        enteId?: string;
    };
    tenantId?: string;
}
