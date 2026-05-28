import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CronogramaEnteService } from './cronograma-ente.service';
import { CreateDiaNoLaborableDto } from './dto/create-dia-no-laborable.dto';
import { CreateDiaNoLaborableBulkDto } from './dto/create-dia-no-laborable-bulk.dto';
import { UpdateDiaNoLaborableDto } from './dto/update-dia-no-laborable.dto';
import { QueryDiaNoLaborableDto } from './dto/query-dia-no-laborable.dto';
import { QueryDiasNoLaborablesRangoDto } from './dto/query-dias-no-laborables-rango.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('cronograma-ente')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CronogramaEnteController {
  constructor(private readonly service: CronogramaEnteService) {}

  // === CRUD ===

  @Post()
  @Roles('ADMIN_ENTE')
  async create(@Body() dto: CreateDiaNoLaborableDto, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const enteId = user.enteId;
    return this.service.create(dto, userId, enteId);
  }

  @Post('bulk')
  @Roles('ADMIN_ENTE')
  async createBulk(
    @Body() dto: CreateDiaNoLaborableBulkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userId = user.id;
    const enteId = user.enteId;
    return this.service.createBulk(dto, userId, enteId);
  }

  @Get()
  @Roles('ADMIN_ENTE')
  async findAll(@Query() query: QueryDiaNoLaborableDto, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.service.findAll(enteId, query);
  }

  @Get('dias-no-laborables')
  async getDiasNoLaborables(
    @Query() query: QueryDiasNoLaborablesRangoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const enteId = user.enteId;
    return this.service.getDiasNoLaborables(enteId, query.desde, query.hasta);
  }

  @Get('alertas')
  @Roles('ADMIN_ENTE')
  async getAlertas(@CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.service.getAlertas(enteId);
  }

  @Patch('alertas/:id/resolver')
  @Roles('ADMIN_ENTE')
  async resolverAlerta(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const enteId = user.enteId;
    return this.service.resolverAlerta(id, userId, enteId);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const enteId = user.enteId;
    return this.service.findOne(id, enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDiaNoLaborableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userId = user.id;
    const enteId = user.enteId;
    return this.service.update(id, dto, userId, enteId);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userId = user.id;
    const enteId = user.enteId;
    return this.service.remove(id, userId, enteId);
  }
}
