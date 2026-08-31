import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PresupuestoItemService } from './presupuesto-item.service';
import { CreatePresupuestoItemDto } from './dto/create-presupuesto-item.dto';
import { UpdatePresupuestoItemDto } from './dto/update-presupuesto-item.dto';
import { QueryPresupuestoItemDto } from './dto/query-presupuesto-item.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@ApiTags('Presupuesto Items')
@ApiBearerAuth('JWT-auth')
@Controller('expedientes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PresupuestoItemController {
  constructor(private readonly presupuestoItemService: PresupuestoItemService) {}

  @Post(':expedienteId/presupuesto-items')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Crear ítem de presupuesto para el expediente' })
  @ApiBody({ type: CreatePresupuestoItemDto })
  create(
    @Param('expedienteId') expedienteId: string,
    @Body() createPresupuestoItemDto: CreatePresupuestoItemDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.presupuestoItemService.create(expedienteId, createPresupuestoItemDto, user);
  }

  @Get('presupuesto-items')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({ summary: 'Listar todos los ítems de presupuesto con paginación y filtros' })
  findAll(@Query() query: QueryPresupuestoItemDto) {
    return this.presupuestoItemService.findAll(query);
  }

  @Get(':expedienteId/presupuesto-items')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Listar ítems de presupuesto por expediente con paginación y filtros' })
  findAllByExpediente(
    @Param('expedienteId') expedienteId: string,
    @Query() query: QueryPresupuestoItemDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.presupuestoItemService.findAllByExpedienteId(expedienteId, query, user);
  }

  @Patch('presupuesto-items/:itemId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar un ítem de presupuesto' })
  @ApiBody({ type: UpdatePresupuestoItemDto })
  update(
    @Param('itemId') itemId: string,
    @Body() updatePresupuestoItemDto: UpdatePresupuestoItemDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.presupuestoItemService.update(itemId, updatePresupuestoItemDto, user);
  }

  @Delete('presupuesto-items/:itemId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar (soft-delete) un ítem de presupuesto' })
  remove(@Param('itemId') itemId: string, @CurrentUser() user: UsuarioActual) {
    return this.presupuestoItemService.remove(itemId, user);
  }
}
