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
import { ClausulasGenericasService } from './clausulas-genericas.service';
import { CreateClausulaDto, UpdateClausulaDto, QueryClausulaDto } from './dto/clausula.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@ApiTags('📜 Biblioteca — Cláusulas Genéricas')
@ApiBearerAuth('JWT-auth')
@Controller('biblioteca/clausulas-genericas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClausulasGenericasController {
  constructor(private readonly service: ClausulasGenericasService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Listar las cláusulas genéricas',
    description:
      'Cláusulas modelo que administra UNIVERSITAS y quedan disponibles para todos los entes ' +
      'al armar el micromódulo "Modelo de Contrato" de la Fase 1.',
  })
  @ApiResponse({ status: 200, description: 'Listado obtenido exitosamente' })
  findAll(@Query() query: QueryClausulaDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar una cláusula genérica por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Crear una cláusula genérica' })
  @ApiResponse({ status: 201, description: 'Cláusula creada exitosamente' })
  create(@Body() dto: CreateClausulaDto, @CurrentUser() user: UsuarioActual) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar una cláusula genérica' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClausulaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar una cláusula genérica (borrado lógico)' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.service.remove(id, user);
  }
}
