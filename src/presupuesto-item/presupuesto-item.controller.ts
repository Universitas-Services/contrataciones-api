import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';
import { PresupuestoItemService } from './presupuesto-item.service';
import { CreatePresupuestoItemDto } from './dto/create-presupuesto-item.dto';
import { UpdatePresupuestoItemDto } from './dto/update-presupuesto-item.dto';
import { QueryPresupuestoItemDto } from './dto/query-presupuesto-item.dto';

@ApiTags('Presupuesto Items')
@Controller('expedientes')
export class PresupuestoItemController {
  constructor(private readonly presupuestoItemService: PresupuestoItemService) {}

  @Post(':expedienteId/presupuesto-items')
  @ApiOperation({ summary: 'Crear ítem de presupuesto para el expediente' })
  @ApiBody({ type: CreatePresupuestoItemDto })
  create(
    @Param('expedienteId') expedienteId: string,
    @Body() createPresupuestoItemDto: CreatePresupuestoItemDto,
  ) {
    return this.presupuestoItemService.create(expedienteId, createPresupuestoItemDto);
  }

  @Get('presupuesto-items')
  @ApiOperation({ summary: 'Listar todos los ítems de presupuesto con paginación y filtros' })
  findAll(@Query() query: QueryPresupuestoItemDto) {
    return this.presupuestoItemService.findAll(query);
  }

  @Get(':expedienteId/presupuesto-items')
  findAllByExpediente(@Param('expedienteId') expedienteId: string) {
    return this.presupuestoItemService.findAllByExpedienteId(expedienteId);
  }

  @Patch('presupuesto-items/:itemId')
  @ApiOperation({ summary: 'Actualizar un ítem de presupuesto' })
  @ApiBody({ type: UpdatePresupuestoItemDto })
  update(
    @Param('itemId') itemId: string,
    @Body() updatePresupuestoItemDto: UpdatePresupuestoItemDto,
  ) {
    return this.presupuestoItemService.update(itemId, updatePresupuestoItemDto);
  }

  @Delete('presupuesto-items/:itemId')
  remove(@Param('itemId') itemId: string) {
    return this.presupuestoItemService.remove(itemId);
  }
}
