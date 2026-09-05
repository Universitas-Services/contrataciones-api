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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClausulasEnteService } from './clausulas-ente.service';
import { CreateClausulaDto, UpdateClausulaDto, QueryClausulaDto } from './dto/clausula.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@ApiTags('📜 Biblioteca — Cláusulas del Ente')
@ApiBearerAuth('JWT-auth')
@Controller('entes/:enteId/clausulas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClausulasEnteController {
  constructor(private readonly service: ClausulasEnteService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Listar las cláusulas guardadas por el ente',
    description:
      'Biblioteca propia del ente, que se combina con las cláusulas genéricas al armar el ' +
      'micromódulo "Modelo de Contrato" de la Fase 1.',
  })
  @ApiResponse({ status: 200, description: 'Listado obtenido exitosamente' })
  findAll(
    @Param('enteId') enteId: string,
    @Query() query: QueryClausulaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.findAll(enteId, query, user);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar una cláusula del ente por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Guardar una cláusula en la biblioteca del ente' })
  @ApiResponse({ status: 201, description: 'Cláusula creada exitosamente' })
  create(
    @Param('enteId') enteId: string,
    @Body() dto: CreateClausulaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.create(enteId, dto, user);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar una cláusula del ente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClausulaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar una cláusula del ente (borrado lógico)' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.service.remove(id, user);
  }
}
