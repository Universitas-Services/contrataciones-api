import {
  Controller,
  Post,
  Body,
  UseGuards,
  Put,
  Patch,
  Param,
  Get,
  Query,
  Delete,
} from '@nestjs/common';
import { ExpedienteContratacionService } from './expediente-contratacion.service';
import { CreateProcesoCompletoDto } from './dto/create-proceso-completo.dto';
import { CalcularModalidadDto } from './dto/calcular-modalidad.dto';
import { CreateExpedienteDraftDto } from './dto/create-expediente-draft.dto';
import { UpdateExpedienteGeneralDto } from './dto/update-expediente-general.dto';
import { QueryExpedienteDto } from './dto/query-expedientes.dto';
import { GenerarCronogramaDto } from './dto/generar-cronograma.dto';
import { UpdateCronogramaExpedienteDto } from './dto/update-cronograma.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

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

  @Post('calcular-modalidad')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Paso 2: Calcular modalidad sugerida según UCAU' })
  @ApiResponse({ status: 200, description: 'Cálculo exitoso con modalidad sugerida' })
  calcularModalidad(@Body() dto: CalcularModalidadDto) {
    return this.expedienteService.calcularModalidadSugerida(dto);
  }

  @Post('borrador')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Paso 2 Final: Crear Expediente en estado Borrador sin Actores/Cronograma',
  })
  @ApiResponse({ status: 201, description: 'Borrador creado exitosamente' })
  createBorrador(
    @Body() dto: CreateExpedienteDraftDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.createBorrador(dto, user.id, user.enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Edición General: Editar Datos Básicos, Actores o Fecha Base' })
  @ApiResponse({ status: 200, description: 'Expediente actualizado exitosamente' })
  updateGeneral(
    @Param('id') id: string,
    @Body() dto: UpdateExpedienteGeneralDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.updateGeneral(id, dto, user.id, user.enteId);
  }

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Obtener listado de expedientes con paginación y filtros' })
  @ApiResponse({ status: 200, description: 'Listado obtenido exitosamente' })
  findAll(
    @Query() query: QueryExpedienteDto,
    @CurrentUser() user: { id: string; enteId: string; rol: RolUsuario },
  ) {
    return this.expedienteService.findAll(query, user.enteId, user.rol);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Consultar un Expediente por ID' })
  @ApiResponse({ status: 200, description: 'Expediente consultado exitosamente' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; enteId: string; rol: RolUsuario },
  ) {
    return this.expedienteService.findOne(id, user.enteId, user.rol);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Anular un Expediente Borrador o en Proceso' })
  @ApiResponse({ status: 200, description: 'Expediente anulado exitosamente' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; enteId: string }) {
    return this.expedienteService.remove(id, user.id, user.enteId);
  }

  @Post('generar-cronograma')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Calcular fechas sugeridas para el cronograma (No guarda en DB)' })
  @ApiResponse({ status: 200, description: 'Fechas generadas exitosamente' })
  calcularCronograma(
    @Body() dto: GenerarCronogramaDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.generarCronogramaLegal(dto, user.enteId);
  }

  @Put(':id/cronograma')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Paso 4: Guardar o actualizar cronograma de fechas del expediente' })
  @ApiResponse({ status: 200, description: 'Cronograma guardado exitosamente' })
  updateCronograma(
    @Param('id') id: string,
    @Body() dto: UpdateCronogramaExpedienteDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.updateCronograma(id, dto, user.id, user.enteId);
  }
}
