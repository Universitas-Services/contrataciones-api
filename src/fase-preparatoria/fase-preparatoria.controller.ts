import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FasePreparatoriaService } from './fase-preparatoria.service';
import { CreateFasePreparatoriaDto } from './dto/create-fase-preparatoria.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Fase Preparatoria')
@ApiBearerAuth('JWT-auth')
@Controller('fase-preparatoria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FasePreparatoriaController {
  constructor(private readonly fasePreparatoriaService: FasePreparatoriaService) {}

  @Get(':expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  findByExpediente(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { enteId: string; rol: RolUsuario },
  ) {
    return this.fasePreparatoriaService.findByExpedienteId(expedienteId, user.enteId, user.rol);
  }

  // Permite inicializar O actualizar usando el mismo endpoint (upsert)
  @Post(':expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Crear o actualizar Fase Preparatoria' })
  @ApiBody({ type: CreateFasePreparatoriaDto })
  upsertFase(
    @Param('expedienteId') expedienteId: string,
    @Body() createFasePreparatoriaDto: CreateFasePreparatoriaDto,
    @CurrentUser() user: { id: string; enteId: string; rol: RolUsuario },
  ) {
    return this.fasePreparatoriaService.upsertByExpedienteId(
      expedienteId,
      createFasePreparatoriaDto,
      user.id,
      user.enteId,
      user.rol,
    );
  }

  // Alias para convención REST (muchos frontends envían PATCH para actualizaciones)
  @Patch(':expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar Fase Preparatoria' })
  @ApiBody({ type: CreateFasePreparatoriaDto })
  updateFase(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CreateFasePreparatoriaDto,
    @CurrentUser() user: { id: string; enteId: string; rol: RolUsuario },
  ) {
    return this.fasePreparatoriaService.upsertByExpedienteId(
      expedienteId,
      dto,
      user.id,
      user.enteId,
      user.rol,
    );
  }
}
