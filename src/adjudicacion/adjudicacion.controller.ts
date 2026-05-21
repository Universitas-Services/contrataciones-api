import { Controller, Post, Body, Param, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdjudicacionService } from './adjudicacion.service';
import { CreateAdjudicacionDto } from './dto/create-adjudicacion.dto';
import { UpdateAdjudicacionDto } from './dto/update-adjudicacion.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('⚖️ Adjudicación (Fase 4)')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('expedientes/:expedienteId/adjudicacion')
export class AdjudicacionController {
  constructor(private readonly adjudicacionService: AdjudicacionService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Crear acta de adjudicación' })
  create(
    @Param('expedienteId') expedienteId: string,
    @Body() createDto: CreateAdjudicacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adjudicacionService.create(expedienteId, createDto, user.id);
  }

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Obtener datos de adjudicación del expediente' })
  findOne(@Param('expedienteId') expedienteId: string) {
    return this.adjudicacionService.findByExpediente(expedienteId);
  }

  @Patch()
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Actualizar datos de la adjudicación' })
  update(
    @Param('expedienteId') expedienteId: string,
    @Body() updateDto: UpdateAdjudicacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.adjudicacionService.update(expedienteId, updateDto, user.id);
  }
}
