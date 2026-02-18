import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ExpedienteContratacionService } from './expediente-contratacion.service';
import { CreateProcesoCompletoDto } from './dto/create-proceso-completo.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('📂 Expedientes de Contratación')
@ApiBearerAuth('JWT-auth')
@Controller('expedientes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExpedienteContratacionController {
  constructor(private readonly expedienteService: ExpedienteContratacionService) {}

  @Post('crear-completo')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Crear Proceso Completo (Modalidad + Expediente + Cronograma)' })
  @ApiResponse({ status: 201, description: 'Proceso creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createFull(
    @Body() dto: CreateProcesoCompletoDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.createFullProcess(dto, user.id, user.enteId);
  }
}
