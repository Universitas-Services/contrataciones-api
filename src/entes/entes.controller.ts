import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EntesService } from './entes.service';
import { CreateEnteDto } from './dto/create-ente.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('🏛️ Entes')
@ApiBearerAuth('JWT-auth')
@Controller('entes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EntesController {
  constructor(private readonly entesService: EntesService) {}

  @Post()
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Crear Ente',
    description: 'Crea un nuevo Ente Público con su usuario administrador',
  })
  @ApiResponse({ status: 201, description: 'Ente creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo UNIVERSITAS)' })
  create(@Body() createEnteDto: CreateEnteDto, @CurrentUser() user: any) {
    return this.entesService.create(createEnteDto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar Entes',
    description: 'UNIVERSITAS ve todos, SUPERVISOR ve asignados, otros ven solo el suyo',
  })
  @ApiResponse({ status: 200, description: 'Lista de Entes según permisos' })
  findAll(@CurrentUser() user: any) {
    return this.entesService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver Ente',
    description: 'Obtiene detalles de un Ente específico',
  })
  @ApiParam({ name: 'id', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Detalles del Ente' })
  @ApiResponse({ status: 404, description: 'Ente no encontrado' })
  findOne(@Param('id') id: string) {
    return this.entesService.findOne(id);
  }

  @Delete(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Eliminar Ente',
    description: 'Elimina un Ente (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Ente eliminado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo UNIVERSITAS)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.entesService.remove(id, user.id);
  }
}
