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
import { NormativaEnteService } from './normativa-ente.service';
import { CreateNormativaDto, UpdateNormativaDto, QueryNormativaDto } from './dto/normativa.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@ApiTags('📚 Biblioteca — Normativa del Ente')
@ApiBearerAuth('JWT-auth')
@Controller('entes/:enteId/normativa')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NormativaEnteController {
  constructor(private readonly service: NormativaEnteService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Listar la normativa propia del ente',
    description: 'Admite paginación y búsqueda dentro del texto de la normativa.',
  })
  @ApiResponse({ status: 200, description: 'Listado obtenido exitosamente' })
  findAll(
    @Param('enteId') enteId: string,
    @Query() query: QueryNormativaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.findAll(enteId, query, user);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar una normativa del ente por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Agregar normativa a la biblioteca del ente' })
  @ApiResponse({ status: 201, description: 'Normativa creada exitosamente' })
  create(
    @Param('enteId') enteId: string,
    @Body() dto: CreateNormativaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.create(enteId, dto, user);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar normativa del ente' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNormativaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar normativa del ente (borrado lógico)' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.service.remove(id, user);
  }
}
