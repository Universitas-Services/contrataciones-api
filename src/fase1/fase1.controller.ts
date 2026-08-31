import { Controller, Get, Put, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Fase1Service } from './fase1.service';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActividadesPreviasDto } from './dto/actividades-previas.dto';
import { LlamadoDto } from './dto/llamado.dto';
import { AspectosGeneralesDto } from './dto/aspectos-generales.dto';
import {
  ModeloContratoDto,
  CalificacionLegalDto,
  CalificacionFinancieraDto,
  CalificacionTecnicaDto,
  EvaluacionTecnicaEconomicaDto,
} from './dto/modulo-json.dto';

const ROLES_LECTURA = [
  'ADMIN_ENTE',
  'EJECUTOR',
  'UNIVERSITAS',
  'VISUALIZADOR',
  'SUPERVISOR',
] as const;
const ROLES_ESCRITURA = ['ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS'] as const;

@ApiTags('📋 Fase 1 — Preparatoria')
@ApiBearerAuth('JWT-auth')
@Controller('expedientes/:expedienteId/fase-preparatoria')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class Fase1Controller {
  constructor(private readonly fase1Service: Fase1Service) {}

  @Get('progreso')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({
    summary: 'Progreso de la Fase 1: estado de cada micromódulo y de los documentos maestros',
  })
  @ApiResponse({ status: 200, description: 'Progreso obtenido exitosamente' })
  progreso(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.fase1Service.progreso(expedienteId, user);
  }

  // ---------------------------------------------------------------------------
  // Actividades Previas
  // ---------------------------------------------------------------------------

  @Get('actividades-previas')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Actividades Previas' })
  leerActividadesPrevias(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.leerModulo(expedienteId, 'actividades-previas', user);
  }

  @Put('actividades-previas')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador de Actividades Previas' })
  guardarActividadesPrevias(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: ActividadesPreviasDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(expedienteId, 'actividades-previas', dto, user);
  }

  @Post('actividades-previas/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Completar Actividades Previas (desbloquea el resto de la fase)' })
  completarActividadesPrevias(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: ActividadesPreviasDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'actividades-previas', dto, user);
  }

  @Post('actividades-previas/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir Actividades Previas' })
  reabrirActividadesPrevias(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.reabrir(expedienteId, 'actividades-previas', user);
  }

  // ---------------------------------------------------------------------------
  // Llamado
  // ---------------------------------------------------------------------------

  @Get('llamado')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Llamado' })
  leerLlamado(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.fase1Service.leerModulo(expedienteId, 'llamado', user);
  }

  @Put('llamado')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador del Llamado' })
  guardarLlamado(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: LlamadoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(expedienteId, 'llamado', dto, user);
  }

  @Post('llamado/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Completar el Llamado' })
  completarLlamado(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: LlamadoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'llamado', dto, user);
  }

  @Post('llamado/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir el Llamado' })
  reabrirLlamado(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.fase1Service.reabrir(expedienteId, 'llamado', user);
  }

  // ---------------------------------------------------------------------------
  // Aspectos Generales del Pliego
  // ---------------------------------------------------------------------------

  @Get('aspectos-generales')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Aspectos Generales del Pliego' })
  leerAspectosGenerales(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.leerModulo(expedienteId, 'aspectos-generales', user);
  }

  @Put('aspectos-generales')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador de Aspectos Generales' })
  guardarAspectosGenerales(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: AspectosGeneralesDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(expedienteId, 'aspectos-generales', dto, user);
  }

  @Post('aspectos-generales/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Completar Aspectos Generales' })
  completarAspectosGenerales(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: AspectosGeneralesDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'aspectos-generales', dto, user);
  }

  @Post('aspectos-generales/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir Aspectos Generales' })
  reabrirAspectosGenerales(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.reabrir(expedienteId, 'aspectos-generales', user);
  }

  // ---------------------------------------------------------------------------
  // Modelo de contrato
  // ---------------------------------------------------------------------------

  @Get('modelo-contrato')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Modelo de Contrato' })
  leerModeloContrato(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.leerModulo(expedienteId, 'modelo-contrato', user);
  }

  @Put('modelo-contrato')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador del Modelo de Contrato' })
  @ApiBody({ type: ModeloContratoDto })
  guardarModeloContrato(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: ModeloContratoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(expedienteId, 'modelo-contrato', dto, user);
  }

  @Post('modelo-contrato/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Completar el Modelo de Contrato' })
  @ApiBody({ type: ModeloContratoDto })
  completarModeloContrato(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: ModeloContratoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'modelo-contrato', dto, user);
  }

  @Post('modelo-contrato/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir el Modelo de Contrato' })
  reabrirModeloContrato(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.reabrir(expedienteId, 'modelo-contrato', user);
  }

  // ---------------------------------------------------------------------------
  // Calificación Legal
  // ---------------------------------------------------------------------------

  @Get('calificacion-legal')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Calificación Legal' })
  leerCalificacionLegal(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.leerModulo(expedienteId, 'calificacion-legal', user);
  }

  @Put('calificacion-legal')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador de Calificación Legal' })
  @ApiBody({ type: CalificacionLegalDto })
  guardarCalificacionLegal(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CalificacionLegalDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(expedienteId, 'calificacion-legal', dto, user);
  }

  @Post('calificacion-legal/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Completar Calificación Legal' })
  @ApiBody({ type: CalificacionLegalDto })
  completarCalificacionLegal(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CalificacionLegalDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'calificacion-legal', dto, user);
  }

  @Post('calificacion-legal/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir Calificación Legal' })
  reabrirCalificacionLegal(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.reabrir(expedienteId, 'calificacion-legal', user);
  }

  // ---------------------------------------------------------------------------
  // Calificación Financiera
  // ---------------------------------------------------------------------------

  @Get('calificacion-financiera')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Calificación Financiera' })
  leerCalificacionFinanciera(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.leerModulo(expedienteId, 'calificacion-financiera', user);
  }

  @Put('calificacion-financiera')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador de Calificación Financiera' })
  @ApiBody({ type: CalificacionFinancieraDto })
  guardarCalificacionFinanciera(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CalificacionFinancieraDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(expedienteId, 'calificacion-financiera', dto, user);
  }

  @Post('calificacion-financiera/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Completar Calificación Financiera' })
  @ApiBody({ type: CalificacionFinancieraDto })
  completarCalificacionFinanciera(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CalificacionFinancieraDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'calificacion-financiera', dto, user);
  }

  @Post('calificacion-financiera/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir Calificación Financiera' })
  reabrirCalificacionFinanciera(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.reabrir(expedienteId, 'calificacion-financiera', user);
  }

  // ---------------------------------------------------------------------------
  // Calificación Técnica
  // ---------------------------------------------------------------------------

  @Get('calificacion-tecnica')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Calificación Técnica' })
  leerCalificacionTecnica(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.leerModulo(expedienteId, 'calificacion-tecnica', user);
  }

  @Put('calificacion-tecnica')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador de Calificación Técnica' })
  @ApiBody({ type: CalificacionTecnicaDto })
  guardarCalificacionTecnica(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CalificacionTecnicaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(expedienteId, 'calificacion-tecnica', dto, user);
  }

  @Post('calificacion-tecnica/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({
    summary: 'Completar Calificación Técnica (la suma de criterios debe ser 100 puntos exactos)',
  })
  @ApiBody({ type: CalificacionTecnicaDto })
  completarCalificacionTecnica(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CalificacionTecnicaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'calificacion-tecnica', dto, user);
  }

  @Post('calificacion-tecnica/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir Calificación Técnica' })
  reabrirCalificacionTecnica(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.reabrir(expedienteId, 'calificacion-tecnica', user);
  }

  // ---------------------------------------------------------------------------
  // Evaluación Técnica y Económica
  // ---------------------------------------------------------------------------

  @Get('evaluacion-tecnica-economica')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({ summary: 'Leer Evaluación Técnica y Económica' })
  leerEvaluacionTecnicaEconomica(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.leerModulo(expedienteId, 'evaluacion-tecnica-economica', user);
  }

  @Put('evaluacion-tecnica-economica')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Guardar borrador de Evaluación Técnica y Económica' })
  @ApiBody({ type: EvaluacionTecnicaEconomicaDto })
  guardarEvaluacionTecnicaEconomica(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: EvaluacionTecnicaEconomicaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.guardarBorrador(
      expedienteId,
      'evaluacion-tecnica-economica',
      dto,
      user,
    );
  }

  @Post('evaluacion-tecnica-economica/completar')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({
    summary:
      'Completar Evaluación Técnica y Económica (técnica + económica debe sumar 100 puntos exactos)',
  })
  @ApiBody({ type: EvaluacionTecnicaEconomicaDto })
  completarEvaluacionTecnicaEconomica(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: EvaluacionTecnicaEconomicaDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.completar(expedienteId, 'evaluacion-tecnica-economica', dto, user);
  }

  @Post('evaluacion-tecnica-economica/reabrir')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({ summary: 'Reabrir Evaluación Técnica y Económica' })
  reabrirEvaluacionTecnicaEconomica(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase1Service.reabrir(expedienteId, 'evaluacion-tecnica-economica', user);
  }
}
