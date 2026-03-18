import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { DirectorioActoresService } from './directorio-actores.service';
import { GetActoresDto } from './dto/get-actores.dto';

@ApiTags('👥 Directorio de Actores')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('directorio-actores')
export class DirectorioActoresController {
  constructor(private readonly directorioActoresService: DirectorioActoresService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR', 'EJECUTOR')
  @ApiOperation({
    summary: 'Listar Actores del Ente',
    description:
      'Obtiene el listado unificado de Unidades Contratantes, Unidades Usuarias, Máxima Autoridad y Comisiones de Contrataciones del Ente, con paginación y filtros.',
  })
  @ApiResponse({ status: 200, description: 'Listado unificado de actores devuelto exitosamente.' })
  findAll(@Query() query: GetActoresDto, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') {
      throw new ForbiddenException(
        'Debe pertenecer a un Ente para consultar el directorio de actores.',
      );
    }

    // Si es UNIVERSITAS y no tiene enteId asociado a su sesión, podríamos necesitar enviarlo como query o throw
    // Asumiremos que está consultando el de su Ente asociado actual
    if (!enteId) {
      return {
        data: [],
        meta: { total: 0, page: query.page || 1, lastPage: 1, limit: query.limit || 10 },
      };
    }

    return this.directorioActoresService.findAll(enteId, query);
  }
}
