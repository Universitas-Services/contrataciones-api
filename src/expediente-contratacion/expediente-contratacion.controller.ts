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
import { CreateExpedienteDraftDto } from './dto/create-expediente-draft.dto';
import { DeclaracionDesiertoDto } from './dto/declarar-desierto.dto';
import { CreateExpedienteConcursoCerradoDto } from './dto/create-expediente-concurso-cerrado.dto';
import { CreateExpedienteConsultaPreciosDto } from './dto/create-expediente-consulta-precios.dto';
import { CreateExpedienteContratacionDirectaDto } from './dto/create-expediente-contratacion-directa.dto';
import { CreateExpedienteModalidadExcluidaDto } from './dto/create-expediente-modalidad-excluida.dto';
import { UpdateExpedienteGeneralDto } from './dto/update-expediente-general.dto';
import { QueryExpedienteDto } from './dto/query-expedientes.dto';
import { GenerarCronogramaDto } from './dto/generar-cronograma.dto';
import { GenerarCronogramaCCDto } from './dto/generar-cronograma-cc.dto';
import { GenerarCronogramaCPDto } from './dto/generar-cronograma-cp.dto';
import { GenerarCronogramaCDDto } from './dto/generar-cronograma-cd.dto';
import { GenerarCronogramaMEDto } from './dto/generar-cronograma-me.dto';
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

  @Patch(':id/declarar-desierto')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Declarar desierto un expediente (Art. 113 LCP)' })
  @ApiResponse({ status: 200, description: 'Expediente declarado desierto exitosamente' })
  declararDesierto(
    @Param('id') id: string,
    @Body() dto: DeclaracionDesiertoDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.declararDesierto(id, dto, user.id, user.enteId);
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

  // =====================================================================
  // BORRADORES POR MODALIDAD
  // =====================================================================

  @Post('borrador/concurso-cerrado')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Crear Borrador — Concurso Cerrado' })
  @ApiResponse({ status: 201, description: 'Borrador CC creado exitosamente' })
  createBorradorCC(
    @Body() dto: CreateExpedienteConcursoCerradoDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.createBorradorCC(dto, user.id, user.enteId);
  }

  @Post('borrador/consulta-precios')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Crear Borrador — Consulta de Precios' })
  @ApiResponse({ status: 201, description: 'Borrador CP creado exitosamente' })
  createBorradorCP(
    @Body() dto: CreateExpedienteConsultaPreciosDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.createBorradorCP(dto, user.id, user.enteId);
  }

  @Post('borrador/contratacion-directa')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Crear Borrador — Contratación Directa (Art. 101 LCP)' })
  @ApiResponse({ status: 201, description: 'Borrador CD creado exitosamente' })
  createBorradorCD(
    @Body() dto: CreateExpedienteContratacionDirectaDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.createBorradorCD(dto, user.id, user.enteId);
  }

  @Post('borrador/modalidad-excluida')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Crear Borrador — Modalidades Excluidas' })
  @ApiResponse({ status: 201, description: 'Borrador ME creado exitosamente' })
  createBorradorME(
    @Body() dto: CreateExpedienteModalidadExcluidaDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.createBorradorME(dto, user.id, user.enteId);
  }

  // =====================================================================
  // CRONOGRAMAS POR MODALIDAD
  // =====================================================================

  @Post('generar-cronograma/concurso-cerrado')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Calcular cronograma — Concurso Cerrado (Art. 85 y 87 LCP)' })
  @ApiResponse({ status: 200, description: 'Cronograma CC calculado exitosamente' })
  calcularCronogramaCC(
    @Body() dto: GenerarCronogramaCCDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.generarCronogramaConcursoCerrado(dto, user.enteId);
  }

  @Post('generar-cronograma/consulta-precios')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Calcular cronograma — Consulta de Precios (Art. 96 LCP)' })
  @ApiResponse({ status: 200, description: 'Cronograma CP calculado exitosamente' })
  calcularCronogramaCP(
    @Body() dto: GenerarCronogramaCPDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.generarCronogramaConsultaPrecios(dto, user.enteId);
  }

  @Post('generar-cronograma/contratacion-directa')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Calcular cronograma — Contratación Directa (Art. 101 LCP)' })
  @ApiResponse({ status: 200, description: 'Cronograma CD calculado exitosamente' })
  calcularCronogramaCD(
    @Body() dto: GenerarCronogramaCDDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.generarCronogramaContratacionDirecta(dto, user.enteId);
  }

  @Post('generar-cronograma/modalidad-excluida')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Calcular cronograma — Modalidades Excluidas' })
  @ApiResponse({ status: 200, description: 'Cronograma ME calculado exitosamente' })
  calcularCronogramaME(
    @Body() dto: GenerarCronogramaMEDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.expedienteService.generarCronogramaModalidadExcluida(dto, user.enteId);
  }
}
