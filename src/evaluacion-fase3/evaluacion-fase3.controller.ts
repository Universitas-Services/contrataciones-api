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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EvaluacionFase3Service } from './evaluacion-fase3.service';
import { CreateEvaluacionDto } from './dto/create-evaluacion.dto';
import { UpdateSobre1Dto } from './dto/update-sobre1.dto';
import { UpdateSobre2Dto } from './dto/update-sobre2.dto';
import { UpdateCalificacionDto } from './dto/update-calificacion.dto';
import { CreateInformeDto } from './dto/create-informe.dto';
import { ListarEvaluacionesQueryDto } from './dto/listar-evaluaciones-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@ApiTags('📊 Fase 3 — Análisis y Recomendaciones')
@ApiBearerAuth('JWT-auth')
@Controller('evaluacion-fase3')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
export class EvaluacionFase3Controller {
  constructor(private readonly evaluacionFase3Service: EvaluacionFase3Service) {}

  // =====================================================================
  // EVALUACIÓN PRINCIPAL
  // =====================================================================

  @Post('iniciar')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar evaluación de un oferente',
    description:
      'Crea el registro de evaluación para una oferta presentada, copiando los datos del oferente (nombre_proveedor_evaluado_au_au, rif_proveedor_evaluado_au_au, etc.) desde tb_oferta_presentada.',
  })
  @ApiResponse({ status: 201, description: 'Evaluación iniciada exitosamente' })
  async iniciarEvaluacion(
    @Body() dto: CreateEvaluacionDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.evaluacionFase3Service.iniciarEvaluacion(dto, user.id, user.enteId);
  }

  @Get('expediente/:expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Listar evaluaciones de un expediente (Paginado y Filtrado)',
    description:
      'Retorna evaluaciones con Sobre1 y Sobre2, soportando paginación, búsqueda por RIF y filtro por estatus.',
  })
  @ApiParam({ name: 'expedienteId', description: 'ID del expediente de contratación' })
  async findAllByExpediente(
    @Param('expedienteId') expedienteId: string,
    @Query() query: ListarEvaluacionesQueryDto,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.evaluacionFase3Service.findAllByExpediente(expedienteId, user.enteId, query);
  }

  @Get('expediente/:expedienteId/stats')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener estadísticas de evaluación del expediente',
    description:
      'Retorna contadores de ofertas recibidas, evaluadas, descalificadas y por evaluar.',
  })
  @ApiParam({ name: 'expedienteId', description: 'ID del expediente' })
  async getStats(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.evaluacionFase3Service.getStatsByExpediente(expedienteId, user.enteId);
  }

  @Get(':evaluacionId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener detalle de una evaluación',
    description: 'Retorna la evaluación con Sobre1, Sobre2 y datos del oferente.',
  })
  @ApiParam({ name: 'evaluacionId', description: 'ID de la evaluación' })
  async findOne(
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.evaluacionFase3Service.findOne(evaluacionId, user.enteId);
  }

  // =====================================================================
  // SOBRE 1 — Sección A: Recaudos legales y financieros
  // =====================================================================

  @Patch(':evaluacionId/sobre1')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Guardar/actualizar Sección A (Sobre Nº1 — recaudos legales)',
    description:
      'Guarda los 11 ítems booleanos del Sobre Nº1 con sus observaciones opcionales. Crea el registro si no existe (upsert).',
  })
  @ApiParam({ name: 'evaluacionId', description: 'ID de la evaluación' })
  async updateSobre1(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: UpdateSobre1Dto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.evaluacionFase3Service.updateSobre1(evaluacionId, dto, user.id, user.enteId);
  }

  // =====================================================================
  // SOBRE 2 — Sección B + Matriz de Evaluación
  // =====================================================================

  @Patch(':evaluacionId/sobre2')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Guardar/actualizar Sección B + Matriz de Evaluación (Sobre Nº2)',
    description:
      'Guarda los 11 ítems del Sobre Nº2 (incluyendo cartaNotificaciones, garantiaFielCumpl, cartaCompromiso, fianzaLaboral, experienciaPersonalTecnico), los 4 criterios técnicos con sus puntajes, la evaluación económica (monto y VAN). Recalcula automáticamente los totales y el ranking económico del expediente.',
  })
  @ApiParam({ name: 'evaluacionId', description: 'ID de la evaluación' })
  async updateSobre2(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: UpdateSobre2Dto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.evaluacionFase3Service.updateSobre2(evaluacionId, dto, user.id, user.enteId);
  }

  // =====================================================================
  // CALIFICACIÓN DEL OFERENTE (legal, financiera, técnica + global)
  // =====================================================================

  @Patch(':evaluacionId/calificacion')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Guardar calificación del oferente',
    description:
      'Guarda la calificación legal, financiera (con índices de liquidez y solvencia) y técnica (actividad comercial, relación de suministros, referencias). Calcula automáticamente el total_calif_tecnica. Registra la descalificación global (si aplica), la evaluación técnica de la Matriz y la posición de prelación del oferente.',
  })
  @ApiParam({ name: 'evaluacionId', description: 'ID de la evaluación' })
  @ApiResponse({ status: 200, description: 'Calificación guardada exitosamente' })
  async updateCalificacion(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: UpdateCalificacionDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.evaluacionFase3Service.updateCalificacion(evaluacionId, dto, user.id, user.enteId);
  }

  // =====================================================================
  // CALCULAR TOTALES (recálculo manual)
  // =====================================================================

  @Get(':evaluacionId/calcular-totales')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Recalcular totales de una evaluación',
    description:
      'Fuerza el recálculo de total_tecnica_au_au, total_economica_au_au, total_van_au_au y total_evaluacion_oferente_au_au. El ranking económico se recalcula contra TODOS los demás oferentes del expediente.',
  })
  @ApiParam({ name: 'evaluacionId', description: 'ID de la evaluación' })
  async calcularTotales(
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.evaluacionFase3Service.calcularTotales(evaluacionId, user.enteId);
  }

  // =====================================================================
  // ELIMINAR EVALUACIÓN
  // =====================================================================

  @Delete(':evaluacionId')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Eliminar evaluación de un oferente (soft delete)' })
  @ApiParam({ name: 'evaluacionId', description: 'ID de la evaluación' })
  async remove(
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.evaluacionFase3Service.remove(evaluacionId, user.id, user.enteId);
  }

  // =====================================================================
  // INFORME DE RECOMENDACIÓN
  // =====================================================================

  @Post('informe/:expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear o actualizar el Informe de Recomendación',
    description:
      'Guarda los datos finales del análisis: actualización de presupuesto, verificación de garantías, formalidades y plazo de ejecución de la oferta recomendada.',
  })
  @ApiParam({ name: 'expedienteId', description: 'ID del expediente' })
  async upsertInforme(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CreateInformeDto,
    @CurrentUser() user: { id: string; enteId: string },
  ) {
    return this.evaluacionFase3Service.upsertInforme(expedienteId, dto, user.id, user.enteId);
  }

  @Get('informe/:expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({ summary: 'Obtener el Informe de Recomendación de un expediente' })
  @ApiParam({ name: 'expedienteId', description: 'ID del expediente' })
  async getInforme(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.evaluacionFase3Service.getInforme(expedienteId, user.enteId);
  }
}
