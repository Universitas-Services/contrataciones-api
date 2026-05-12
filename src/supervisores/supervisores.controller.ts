import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SupervisoresService } from './supervisores.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSupervisorDto } from './dto/create-supervisor.dto';
import { AsignarEntesDto } from './dto/asignar-entes.dto';
import { EntesService } from '../entes/entes.service';

@ApiTags('👨‍💼 Supervisores')
@ApiBearerAuth('JWT-auth')
@Controller('supervisores')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('UNIVERSITAS', 'SUPERVISOR')
export class SupervisoresController {
  constructor(
    private readonly supervisoresService: SupervisoresService,
    private readonly entesService: EntesService,
  ) {}

  // ---------------------------------------------------------
  // ENDPOINTS PARA ROL SUPERVISOR
  // ---------------------------------------------------------

  @Get('mis-entes')
  @Roles('SUPERVISOR')
  @ApiOperation({
    summary: 'Listar mis Entes asignados',
    description: 'Permite a un supervisor ver la lista de Entes que tiene bajo su supervisión',
  })
  @ApiResponse({ status: 200, description: 'Lista de Entes asignados' })
  getMisEntes(@CurrentUser() user: { id: string }) {
    return this.supervisoresService.getMisEntes(user.id);
  }

  @Get('mis-entes/:enteId/metrics')
  @Roles('SUPERVISOR')
  @ApiOperation({
    summary: 'Ver métricas de un Ente asignado',
    description: 'Obtiene las métricas operativas de un Ente específico supervisado',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Métricas del Ente' })
  @ApiResponse({ status: 403, description: 'No tiene acceso a este Ente' })
  async getEnteMetrics(@Param('enteId') enteId: string, @CurrentUser() user: { id: string }) {
    // Validar acceso
    const tieneAcceso = await this.supervisoresService.tieneAccesoAEnte(user.id, enteId);
    if (!tieneAcceso) {
      throw new ForbiddenException('No tiene permisos para supervisar este Ente');
    }

    return this.entesService.getEnteOperationalMetrics(enteId);
  }

  // ---------------------------------------------------------
  // ENDPOINTS ADMINISTRATIVOS (Solo UNIVERSITAS)
  // ---------------------------------------------------------

  @Post()
  @Roles('UNIVERSITAS')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear supervisor',
    description: 'Crea un nuevo usuario con rol SUPERVISOR y le asigna Entes',
  })
  @ApiResponse({ status: 201, description: 'Supervisor creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  create(@Body() createDto: CreateSupervisorDto, @CurrentUser() user: { id: string }) {
    return this.supervisoresService.create(createDto, user.id);
  }

  @Get()
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Listar supervisores',
    description: 'Obtiene la lista de todos los supervisores del sistema',
  })
  @ApiResponse({ status: 200, description: 'Lista de supervisores' })
  findAll() {
    return this.supervisoresService.findAll();
  }

  @Get(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Ver supervisor',
    description: 'Obtiene los detalles de un supervisor específico incluyendo sus Entes asignados',
  })
  @ApiParam({ name: 'id', description: 'ID del supervisor' })
  @ApiResponse({ status: 200, description: 'Detalles del supervisor' })
  @ApiResponse({ status: 404, description: 'Supervisor no encontrado' })
  findOne(@Param('id') id: string) {
    return this.supervisoresService.findOne(id);
  }

  @Put(':id/asignar-entes')
  @Roles('UNIVERSITAS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asignar/Remover Entes',
    description: 'Modifica dinámicamente los Entes asignados a un supervisor',
  })
  @ApiParam({ name: 'id', description: 'ID del supervisor' })
  @ApiResponse({ status: 200, description: 'Asignación actualizada' })
  @ApiResponse({ status: 404, description: 'Supervisor no encontrado' })
  async asignarEntes(
    @Param('id') id: string,
    @Body() dto: AsignarEntesDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.supervisoresService.asignarEntes(id, dto, user.id);
  }

  @Delete(':id')
  @Roles('UNIVERSITAS')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar supervisor',
    description: 'Elimina un supervisor (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID del supervisor' })
  @ApiResponse({ status: 200, description: 'Supervisor eliminado' })
  @ApiResponse({ status: 404, description: 'Supervisor no encontrado' })
  remove(@Param('id') id: string) {
    return this.supervisoresService.remove(id);
  }
}
