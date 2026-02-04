import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';
import { RequestWithUser } from '../types/request-with-user.type';
import { AccionAuditoria } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private prisma: PrismaService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const { user, method, url, body } = request;

        // Solo auditar operaciones de modificación
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle();
        }

        return next.handle().pipe(
            tap(async (data) => {
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
                } catch (error) {
                    // No fallar la request si falla el audit
                    console.error('Error en audit log:', error);
                }
            }),
        );
    }

    private extractTableName(url: string): string {
        const parts = url.split('/').filter((p) => p);
        return parts[parts.length - 2] || 'unknown';
    }

    private mapMethodToAction(method: string): AccionAuditoria {
        const mapping = {
            POST: 'CREATE',
            PUT: 'UPDATE',
            PATCH: 'UPDATE',
            DELETE: 'DELETE',
        };
        return mapping[method] as AccionAuditoria || 'CREATE';
    }
}
