import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { HubService } from './hub.service';
import { HubPatchDto } from './dto/hub-patch.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../../common/types/usuario-actual.type';
import type {
  FormLegal,
  FormFinanciera,
  FormPuntuado,
  FormEvaluacion,
  FormPromocion,
} from './types/hub.types';

const ROLES_LECTURA = [
  'ADMIN_ENTE',
  'EJECUTOR',
  'UNIVERSITAS',
  'VISUALIZADOR',
  'SUPERVISOR',
] as const;
const ROLES_ESCRITURA = ['ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS'] as const;

@ApiTags('🧮 Fase 2 — Hub de evaluación del oferente')
@ApiBearerAuth('JWT-auth')
@Controller('evaluacion-fase3/:evaluacionId/hub')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HubController {
  constructor(private readonly hubService: HubService) {}

  @Get()
  @Roles(...ROLES_LECTURA)
  @ApiOperation({
    summary: 'Estado completo del hub de evaluación',
    description:
      'Devuelve las plantillas congeladas desde la Fase 1 del expediente, los formularios ya ' +
      'guardados, el estado de desbloqueo de cada pestaña y el resultado de la evaluación. ' +
      'Reemplaza el sessionStorage del frontend.',
  })
  @ApiResponse({ status: 200, description: 'Hub obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'La evaluación no existe' })
  obtener(@Param('evaluacionId') evaluacionId: string, @CurrentUser() user: UsuarioActual) {
    return this.hubService.obtenerHub(evaluacionId, user);
  }

  @Patch('legal')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({
    summary: 'Guardar o confirmar la calificación legal',
    description:
      'Al confirmar, CUMPLE exige que todos los recaudos eliminatorios estén en SI. ' +
      'Un NO descalifica al oferente y cierra las pestañas siguientes.',
  })
  @ApiBody({ type: HubPatchDto })
  legal(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: HubPatchDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.hubService.patchLegal(evaluacionId, dto.action, dto.form as FormLegal, user);
  }

  @Patch('financiera')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({
    summary: 'Guardar o confirmar la calificación financiera',
    description:
      'Descapital responde SI/NO; los índices, un valor numérico que cae en una de las tres ' +
      'bandas. CUMPLE si el total alcanza la puntuación mínima del pliego.',
  })
  @ApiBody({ type: HubPatchDto })
  financiera(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: HubPatchDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.hubService.patchFinanciera(
      evaluacionId,
      dto.action,
      dto.form as FormFinanciera,
      user,
    );
  }

  @Patch('tecnica')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({
    summary: 'Guardar o confirmar la calificación técnica',
    description:
      'Criterio con varios rangos: se elige uno y el puntaje es el del rango. Criterio con un ' +
      'solo rango: puntaje libre entre 0 y ese máximo; excederlo rechaza la confirmación.',
  })
  @ApiBody({ type: HubPatchDto })
  tecnica(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: HubPatchDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.hubService.patchTecnica(evaluacionId, dto.action, dto.form as FormPuntuado, user);
  }

  @Patch('evaluacion')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({
    summary: 'Guardar o confirmar la evaluación y el puntaje',
    description:
      'Evalúa los lados técnico y económico. CUMPLE sólo si ambos alcanzan su mínimo. ' +
      'La posición de prelación se exige únicamente cuando ambos cumplen.',
  })
  @ApiBody({ type: HubPatchDto })
  evaluacion(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: HubPatchDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.hubService.patchEvaluacion(
      evaluacionId,
      dto.action,
      dto.form as FormEvaluacion,
      user,
    );
  }

  @Patch('promocion')
  @Roles(...ROLES_ESCRITURA)
  @ApiOperation({
    summary: 'Guardar o confirmar la promoción económica',
    description:
      'Sólo existe si Actividades Previas la activó. Suma bonos sobre la nota de evaluación; ' +
      'el total final puede superar 100 y nunca descalifica.',
  })
  @ApiBody({ type: HubPatchDto })
  promocion(
    @Param('evaluacionId') evaluacionId: string,
    @Body() dto: HubPatchDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.hubService.patchPromocion(
      evaluacionId,
      dto.action,
      dto.form as FormPromocion,
      user,
    );
  }
}
