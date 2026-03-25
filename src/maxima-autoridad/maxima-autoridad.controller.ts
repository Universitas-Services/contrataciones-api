import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MaximaAutoridadService } from './maxima-autoridad.service';
import { CreateMaximaAutoridadDto } from './dto/create-maxima-autoridad.dto';
import { UpdateMaximaAutoridadDto } from './dto/update-maxima-autoridad.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('🏛️ Máxima Autoridad')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('maxima-autoridad')
export class MaximaAutoridadController {
  constructor(private readonly maximaAutoridadService: MaximaAutoridadService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Registrar Máxima Autoridad',
    description: 'Crea un nuevo registro de máxima autoridad para el Ente del usuario actual.',
  })
  @ApiResponse({ status: 201, description: 'Autoridad creada exitosamente.' })
  @ApiResponse({ status: 403, description: 'No autorizado.' })
  create(
    @Body() createMaximaAutoridadDto: CreateMaximaAutoridadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') {
      throw new ForbiddenException('Usuario no asociado a un Ente');
    }
    // Nota: Si es UNIVERSITAS creando para un Ente específico, se debería manejar ese caso.
    // Asumimos flujo principal: ADMIN_ENTE creando para su propio Ente.
    return this.maximaAutoridadService.create(createMaximaAutoridadDto, enteId, user.id);
  }

  @Get()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Listar Autoridades',
    description: 'Obtiene el historial de autoridades del Ente del usuario.',
  })
  @ApiResponse({ status: 200, description: 'Lista de autoridades.' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    // TODO: Manejar lógica para SUPERVISOR/UNIVERSITAS si necesitan ver de otros entes (posiblemente vía query param o params)
    // Por ahora, se mantiene simple para el alcance del requerimiento: el Admin Ente ve las suyas.
    if (!enteId && user.rol !== 'UNIVERSITAS') {
      // Si es supervisor, quizás necesite pasar el ID del ente.
      // Para MVP asumimos contexto del Ente del usuario logueado.
      return [];
    }
    return this.maximaAutoridadService.findAll(enteId);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener Autoridad Específica',
    description: 'Obtiene los detalles de una autoridad por su ID.',
  })
  @ApiResponse({ status: 200, description: 'Detalles de la autoridad.' })
  @ApiResponse({ status: 404, description: 'No encontrado.' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.maximaAutoridadService.findOne(id, enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Actualizar Autoridad',
    description: 'Actualiza los datos de una autoridad existente.',
  })
  @ApiResponse({ status: 200, description: 'Autoridad actualizada.' })
  update(
    @Param('id') id: string,
    @Body() updateMaximaAutoridadDto: UpdateMaximaAutoridadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    return this.maximaAutoridadService.update(id, updateMaximaAutoridadDto, enteId, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Eliminar Autoridad',
    description: 'Elimina lógicamente un registro de autoridad.',
  })
  @ApiResponse({ status: 200, description: 'Autoridad eliminada.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.maximaAutoridadService.remove(id, enteId, user.id);
  }

  @Patch(':id/activar')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Activar Autoridad',
    description: 'Activa una máxima autoridad. Retorna error si ya existe otra activa.',
  })
  @ApiResponse({ status: 200, description: 'Autoridad activada.' })
  @ApiResponse({
    status: 400,
    description: 'Ya existe una Máxima Autoridad activa. Debe desactivarla manualmente primero.',
  })
  activar(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.maximaAutoridadService.activar(id, enteId, user.id);
  }

  @Patch(':id/desactivar')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Desactivar Autoridad',
    description: 'Desactiva una máxima autoridad.',
  })
  @ApiResponse({ status: 200, description: 'Autoridad desactivada.' })
  desactivar(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.maximaAutoridadService.desactivar(id, enteId, user.id);
  }
}
