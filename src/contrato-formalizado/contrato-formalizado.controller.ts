import { Controller, Post, Body, Param, Get, UseGuards, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContratoFormalizadoService } from './contrato-formalizado.service';
import { SaveContratoDto } from './dto/save-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('📝 Contrato Formalizado (Fase 4)')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('expedientes/:expedienteId/contrato-formalizado')
export class ContratoFormalizadoController {
  constructor(private readonly contratoService: ContratoFormalizadoService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Guardar datos del contrato formalizado' })
  create(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: SaveContratoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contratoService.create(expedienteId, dto, user.id);
  }

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Obtener contrato formalizado del expediente' })
  findOne(@Param('expedienteId') expedienteId: string) {
    return this.contratoService.findByExpediente(expedienteId);
  }

  @Patch()
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Actualizar datos del contrato formalizado' })
  update(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: UpdateContratoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.contratoService.update(expedienteId, dto, user.id);
  }
}
