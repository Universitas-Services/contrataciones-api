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
import { ComisionContratacionesService } from './comision-contrataciones.service';
import { CreateComisionContratacionesDto } from './dto/create-comision-contrataciones.dto';
import { UpdateComisionContratacionesDto } from './dto/update-comision-contrataciones.dto';
import { CreateMiembroComisionDto } from './dto/create-miembro-comision.dto';
import { UpdateMiembroComisionDto } from './dto/update-miembro-comision.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('📋 Comisión de Contrataciones')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('comision-contrataciones')
export class ComisionContratacionesController {
  constructor(private readonly comisionService: ComisionContratacionesService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Registrar Comisión',
    description: 'Crea una comisión y opcionalmente registra sus miembros iniciales.',
  })
  @ApiResponse({ status: 201, description: 'Comisión creada exitosamente.' })
  create(
    @Body() createDto: CreateComisionContratacionesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') {
      throw new ForbiddenException('Usuario no asociado a un Ente');
    }
    return this.comisionService.create(createDto, enteId, user.id);
  }

  @Get()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Listar Comisiones',
    description: 'Obtiene el listado de comisiones y sus miembros.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') return [];
    return this.comisionService.findAll(enteId);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener Comisión',
    description: 'Obtiene detalles de una comisión específica.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.comisionService.findOne(id, enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Actualizar Comisión',
    description: 'Actualiza los datos básicos de la comisión.',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateComisionContratacionesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    return this.comisionService.update(id, updateDto, enteId, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Eliminar Comisión',
    description: 'Elimina lógicamente una comisión.',
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.comisionService.remove(id, enteId, user.id);
  }

  // --- Endpoints para Miembros ---

  @Post(':id/miembros')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Agregar Miembro',
    description: 'Agrega un nuevo miembro a una comisión existente.',
  })
  addMiembro(
    @Param('id') comisionId: string,
    @Body() createMiembroDto: CreateMiembroComisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    return this.comisionService.addMiembro(comisionId, createMiembroDto, enteId);
  }

  @Patch('miembros/:miembroId')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Actualizar Miembro',
    description: 'Actualiza los datos de un miembro de la comisión.',
  })
  updateMiembro(
    @Param('miembroId') miembroId: string,
    @Body() updateMiembroDto: UpdateMiembroComisionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    return this.comisionService.updateMiembro(miembroId, updateMiembroDto, enteId);
  }

  @Delete('miembros/:miembroId')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Eliminar Miembro',
    description: 'Elimina de forma física un miembro de la comisión.',
  })
  removeMiembro(@Param('miembroId') miembroId: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.comisionService.removeMiembro(miembroId, enteId);
  }
}
