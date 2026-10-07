import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../../common/types/usuario-actual.type';
import { GestionAdjudicacionService } from './gestion-adjudicacion.service';
import { SetCaracterAdjudicacionDto } from './dto/set-caracter.dto';
import { DictamenTotalDto } from './dto/dictamen-total.dto';
import { DictamenParcialDto } from './dto/dictamen-parcial.dto';

@ApiTags('📊 Fase 3 — Gestión Adjudicación')
@ApiBearerAuth('JWT-auth')
@Controller('evaluacion-fase3/expediente/:expedienteId')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
export class GestionAdjudicacionController {
  constructor(private readonly gestion: GestionAdjudicacionService) {}

  @Get('gestion-adjudicacion')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Estado del hub Gestión Fase 3 (carácter, gates, oferentes calificados)',
  })
  @ApiParam({ name: 'expedienteId' })
  getGestion(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.gestion.getGestion(expedienteId, user);
  }

  @Put('gestion-adjudicacion/caracter')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Definir carácter TOTAL | PARCIAL',
    description:
      '409 si ya hay dictámenes o informe. Legacy POST /expedientes/:id/adjudicacion no usa esto.',
  })
  setCaracter(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: SetCaracterAdjudicacionDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.gestion.setCaracter(expedienteId, dto, user);
  }

  @Get('dictamenes')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({ summary: 'Listar dictámenes del expediente' })
  listarDictamenes(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.gestion.listarDictamenes(expedienteId, user);
  }

  @Put('dictamenes/:evaluacionId/total')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Upsert dictamen TOTAL (solo Primera Opción de evaluación)' })
  upsertTotal(
    @Param('expedienteId') expedienteId: string,
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: DictamenTotalDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.gestion.upsertDictamenTotal(expedienteId, evaluacionId, dto, user);
  }

  @Put('dictamenes/:evaluacionId/parcial')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Upsert dictamen PARCIAL',
    description:
      'Si adjudicado=true → posicionPrelacionAdjudicacion = "Primera Opción" (sin borrar ranking Fase 2).',
  })
  upsertParcial(
    @Param('expedienteId') expedienteId: string,
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: DictamenParcialDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.gestion.upsertDictamenParcial(expedienteId, evaluacionId, dto, user);
  }
}
