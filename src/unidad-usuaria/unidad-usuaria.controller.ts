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
import { UnidadUsuariaService } from './unidad-usuaria.service';
import { CreateUnidadUsuariaDto } from './dto/create-unidad-usuaria.dto';
import { UpdateUnidadUsuariaDto } from './dto/update-unidad-usuaria.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('👥 Unidad Usuaria')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('unidad-usuaria')
export class UnidadUsuariaController {
  constructor(private readonly unidadUsuariaService: UnidadUsuariaService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Registrar Unidad Usuaria',
    description: 'Crea una nueva Unidad Usuaria para el Ente actual.',
  })
  @ApiResponse({ status: 201, description: 'Unidad creada exitosamente.' })
  create(@Body() createDto: CreateUnidadUsuariaDto, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') {
      throw new ForbiddenException('Usuario no asociado a un Ente');
    }
    return this.unidadUsuariaService.create(createDto, enteId, user.id);
  }

  @Get()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Listar Unidades Usuarias',
    description: 'Obtiene el listado de unidades usuarias del Ente.',
  })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    if (!enteId && user.rol !== 'UNIVERSITAS') return [];
    return this.unidadUsuariaService.findAll(enteId);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener Unidad Usuaria',
    description: 'Obtiene detalles de una unidad específica.',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.unidadUsuariaService.findOne(id, enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Actualizar Unidad Usuaria',
    description: 'Actualiza los datos de una unidad usuaria.',
  })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateUnidadUsuariaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    return this.unidadUsuariaService.update(id, updateDto, enteId, user.id);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Activar/Desactivar Unidad Usuaria',
    description: 'Alterna el estado activo/inactivo de una unidad usuaria.',
  })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.unidadUsuariaService.remove(id, enteId, user.id);
  }
}
