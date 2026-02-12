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
import { UnidadContratanteService } from './unidad-contratante.service';
import { CreateUnidadContratanteDto } from './dto/create-unidad-contratante.dto';
import { UpdateUnidadContratanteDto } from './dto/update-unidad-contratante.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('🏢 Unidad Contratante')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('unidad-contratante')
export class UnidadContratanteController {
  constructor(private readonly unidadContratanteService: UnidadContratanteService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Registrar Unidad Contratante',
    description: 'Crea una nueva Unidad Contratante para el Ente actual.',
  })
  @ApiResponse({ status: 201, description: 'Unidad creada exitosamente.' })
  create(@Body() createDto: CreateUnidadContratanteDto, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') {
      throw new ForbiddenException('Usuario no asociado a un Ente');
    }
    return this.unidadContratanteService.create(createDto, enteId, user.id);
  }

  @Get()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Listar Unidades Contratantes',
    description: 'Obtiene el listado de unidades contratantes del Ente.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') return [];
    return this.unidadContratanteService.findAll(enteId);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener Unidad Contratante',
    description: 'Obtiene detalles de una unidad específica.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.unidadContratanteService.findOne(id, enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Actualizar Unidad Contratante',
    description: 'Actualiza los datos de una unidad contratante.',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUnidadContratanteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    return this.unidadContratanteService.update(id, updateDto, enteId, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Eliminar Unidad Contratante',
    description: 'Elimina lógicamente una unidad contratante.',
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.unidadContratanteService.remove(id, enteId, user.id);
  }
}
