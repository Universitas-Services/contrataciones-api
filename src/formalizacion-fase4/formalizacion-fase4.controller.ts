import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { FormalizacionFase4Service } from './formalizacion-fase4.service';
import { DecaimientoService } from './decaimiento.service';
import { GuardarContratoDto } from './dto/contrato.dto';
import {
  CertificadoIncumplimientoDto,
  DeclararDecaimientoDto,
  DecisionDecaimientoDto,
  ResolucionDecaimientoDto,
} from './dto/decaimiento.dto';

@ApiTags('📜 Fase 4 — Formalización (Gestión)')
@ApiBearerAuth('JWT-auth')
@Controller('formalizacion-fase4/expediente/:expedienteId')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiParam({ name: 'expedienteId' })
export class FormalizacionFase4Controller {
  constructor(
    private readonly fase4: FormalizacionFase4Service,
    private readonly decaimiento: DecaimientoService,
  ) {}

  // ── Estado ──────────────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Estado completo de la Fase 4',
    description:
      'Carácter, compuertas, oferentes con su estatus y contrato, ciclo activo, historial de ciclos, candidatos a siguiente opción y participantes para el cierre.',
  })
  getEstado(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.fase4.getEstado(expedienteId, user);
  }

  // ── Contratos ───────────────────────────────────────────────────────

  @Get('contratos/:evaluacionId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Precarga del contrato de un adjudicado',
    description:
      'Si todavía no existe, clona el modelo de contrato de la Fase 1 y resuelve las variables. Devuelve también el diccionario `tokens` ya resuelto.',
  })
  getContrato(
    @Param('expedienteId') expedienteId: string,
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase4.getContrato(expedienteId, evaluacionId, user);
  }

  @Put('contratos/:evaluacionId')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Guardar borrador del contrato' })
  guardarBorrador(
    @Param('expedienteId') expedienteId: string,
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: GuardarContratoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase4.guardarBorrador(expedienteId, evaluacionId, dto, user);
  }

  @Post('contratos/:evaluacionId/generar')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Generar el contrato definitivo' })
  generarContrato(
    @Param('expedienteId') expedienteId: string,
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: GuardarContratoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.fase4.generarContrato(expedienteId, evaluacionId, dto, user);
  }

  // ── Decaimiento ─────────────────────────────────────────────────────

  @Post('decaimientos')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Declarar el decaimiento de una adjudicación' })
  declarar(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: DeclararDecaimientoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.decaimiento.declarar(expedienteId, dto, user);
  }

  @Delete('decaimientos/activo')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Deshacer el ciclo activo',
    description: 'Solo mientras no se haya emitido el certificado de incumplimiento.',
  })
  deshacer(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.decaimiento.deshacer(expedienteId, user);
  }

  @Patch('decaimientos/activo/decision')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Elegir siguiente opción o procedimiento desierto' })
  elegirDecision(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: DecisionDecaimientoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.decaimiento.elegirDecision(expedienteId, dto, user);
  }

  @Put('decaimientos/activo/certificado')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Paso 1 — certificado de incumplimiento',
    description:
      'Los vencimientos de garantías (5 días hábiles) y de firma (8 días hábiles) los recalcula el servidor con los días no laborables del ente.',
  })
  certificado(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CertificadoIncumplimientoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.decaimiento.guardarCertificado(expedienteId, dto, user);
  }

  @Put('decaimientos/activo/resolucion')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Paso 2 — resolución de decaimiento' })
  resolucion(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: ResolucionDecaimientoDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.decaimiento.guardarResolucion(expedienteId, dto, user);
  }

  @Post('decaimientos/activo/notificacion-infractor')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Paso 3 — notificar el decaimiento al infractor' })
  notificarInfractor(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.decaimiento.notificarInfractor(expedienteId, user);
  }

  @Post('decaimientos/activo/notificacion-subsiguiente')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Paso 4A — notificar la adjudicación a la siguiente opción' })
  notificarSubsiguiente(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.decaimiento.notificarSubsiguiente(expedienteId, user);
  }

  @Post('decaimientos/activo/cerrar')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({ summary: 'Paso 4A — cerrar el ciclo y habilitar el nuevo contrato' })
  cerrar(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.decaimiento.cerrarCiclo(expedienteId, user);
  }

  @Post('decaimientos/activo/cierre-desierto')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Paso 4B — notificaciones de cierre en lote y sellado del expediente',
    description:
      'Genera una notificación de fin de procedimiento por participante, cierra el ciclo y sella la Fase 4. Después, toda escritura responde 409.',
  })
  cierreDesierto(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.decaimiento.cierreDesierto(expedienteId, user);
  }

  @Delete('sellado')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Deshacer el sellado de la Fase 4',
    description:
      'Salida de emergencia para un desierto declarado por error. No está en el brief del frontend.',
  })
  desellar(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.decaimiento.desellar(expedienteId, user);
  }

  // ── Utilidades ──────────────────────────────────────────────────────

  @Get('calcular-vencimientos')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Vista previa de los vencimientos del certificado',
    description:
      'El frontend lo usa para pintar las fechas mientras se llena el formulario, con el mismo cálculo que después va al documento.',
  })
  @ApiQuery({ name: 'fechaNotificacion', example: '2026-10-13' })
  calcularVencimientos(
    @Param('expedienteId') expedienteId: string,
    @Query('fechaNotificacion') fechaNotificacion: string,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.decaimiento.calcularVencimientos(expedienteId, fechaNotificacion, user);
  }
}
