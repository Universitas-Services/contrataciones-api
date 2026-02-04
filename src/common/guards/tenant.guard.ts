import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestWithUser } from '../types/request-with-user.type';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Universitas tiene acceso global
    if (user.rol === 'UNIVERSITAS') {
      return true;
    }

    // Obtener enteId del parámetro, body o query
    const enteId =
      request.params?.enteId || request.body?.enteId || request.query?.enteId;

    // Si no se especifica enteId, usar el del usuario
    if (!enteId) {
      request.tenantId = user.enteId;
      return true;
    }

    // SUPERVISOR: Verificar si tiene acceso al Ente solicitado
    if (user.rol === 'SUPERVISOR') {
      const tieneAcceso = await this.prisma.supervisorAsignacion.findUnique({
        where: {
          supervisorId_enteId: {
            supervisorId: user.id,
            enteId,
          },
        },
      });

      if (!tieneAcceso) {
        throw new ForbiddenException('No tienes acceso a este Ente');
      }

      request.tenantId = enteId;
      return true;
    }

    // Otros roles: Verificar que pertenezcan al ente
    if (user.enteId !== enteId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este Ente',
      );
    }

    request.tenantId = enteId;
    return true;
  }
}
