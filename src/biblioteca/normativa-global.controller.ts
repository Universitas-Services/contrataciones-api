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
import { NormativaGlobalService } from './normativa-global.service';
import {
  CreateNormativaGlobalDto,
  UpdateNormativaGlobalDto,
  QueryNormativaGlobalDto,
} from './dto/normativa.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

@ApiTags('📚 Biblioteca — Normativa Global')
@ApiBearerAuth('JWT-auth')
@Controller('biblioteca/normativa-global')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NormativaGlobalController {
  constructor(private readonly service: NormativaGlobalService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Listar la normativa global',
    description:
      'Normativa que administra UNIVERSITAS y está disponible para todos los entes. ' +
      'Admite paginación, búsqueda dentro del texto y filtro por estado activo.',
  })
  @ApiResponse({ status: 200, description: 'Listado obtenido exitosamente' })
  findAll(@Query() query: QueryNormativaGlobalDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar una normativa global por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Crear normativa global' })
  @ApiResponse({ status: 201, description: 'Normativa creada exitosamente' })
  create(@Body() dto: CreateNormativaGlobalDto, @CurrentUser() user: UsuarioActual) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar normativa global' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNormativaGlobalDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar normativa global (borrado lógico)' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.service.remove(id, user);
  }
}
