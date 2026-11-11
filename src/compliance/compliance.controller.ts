import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { ComplianceService } from './compliance.service';
import { MAXIMO_AGENTE_MB } from './compliance.util';
import {
  CrearExpedienteComplianceDto,
  DatosExpedienteComplianceDto,
  ListarExpedientesComplianceQuery,
  MensajeComplianceDto,
  SolicitarDictamenComplianceDto,
  SubirDocumentoComplianceDto,
} from './dto/compliance.dto';

const ESCRITURA = ['UNIVERSITAS', 'ADMIN_ENTE', 'EJECUTOR'] as const;
const uuid = new ParseUUIDPipe();

@ApiTags('🛡️ Compliance — Auditoría con el agente')
@ApiBearerAuth('JWT-auth')
@Controller('compliance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get('catalogo')
  @ApiOperation({ summary: 'Modalidades, tipos de contratación y checklist del agente' })
  catalogo() {
    return this.compliance.catalogo();
  }

  @Get('expedientes')
  @ApiOperation({ summary: 'Expedientes del ente, con progreso, riesgo y estado' })
  listar(@Query() query: ListarExpedientesComplianceQuery, @CurrentUser() user: UsuarioActual) {
    return this.compliance.listar(user, query.enteId);
  }

  @Post('expedientes')
  @Roles(...ESCRITURA)
  @ApiOperation({ summary: 'Crear un expediente; guarda el saludo del Coordinador' })
  crear(@Body() dto: CrearExpedienteComplianceDto, @CurrentUser() user: UsuarioActual) {
    return this.compliance.crear(dto, user);
  }

  @Get('expedientes/:id')
  @ApiOperation({ summary: 'Detalle: checklist, documentos, dictámenes y siguiente documento' })
  detalle(@Param('id', uuid) id: string, @CurrentUser() user: UsuarioActual) {
    return this.compliance.detalle(id, user);
  }

  @Patch('expedientes/:id')
  @Roles(...ESCRITURA)
  @ApiOperation({ summary: 'Fijar nomenclatura, nombre, modalidad o tipo (botones)' })
  actualizar(
    @Param('id', uuid) id: string,
    @Body() dto: DatosExpedienteComplianceDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.compliance.actualizar(id, dto, user);
  }

  @Get('expedientes/:id/mensajes')
  @ApiOperation({ summary: 'Historial del chat' })
  mensajes(@Param('id', uuid) id: string, @CurrentUser() user: UsuarioActual) {
    return this.compliance.mensajes(id, user);
  }

  @Post('expedientes/:id/mensajes')
  @Roles(...ESCRITURA)
  @ApiOperation({
    summary: 'Enviar un mensaje al Coordinador',
    description:
      'Espera la respuesta del agente hasta 60 s. Si falla responde 503 y no guarda el mensaje.',
  })
  enviarMensaje(
    @Param('id', uuid) id: string,
    @Body() dto: MensajeComplianceDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.compliance.enviarMensaje(id, dto.mensaje, user);
  }

  @Post('expedientes/:id/documentos')
  @Roles(...ESCRITURA)
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: MAXIMO_AGENTE_MB * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['archivo', 'tipoDocumento'],
      properties: {
        archivo: { type: 'string', format: 'binary' },
        tipoDocumento: { type: 'string', example: 'ACTA_INICIO' },
        reemplazaDocumentoId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiOperation({
    summary: 'Subir un documento; el análisis corre en segundo plano',
    description: 'Responde de inmediato con el documento en PENDIENTE.',
  })
  subirDocumento(
    @Param('id', uuid) id: string,
    @Body() dto: SubirDocumentoComplianceDto,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.compliance.subirDocumento(id, dto, archivo, user);
  }

  @Get('documentos/:documentoId')
  @ApiOperation({ summary: 'Estado de un documento (para consultar mientras se analiza)' })
  documento(@Param('documentoId', uuid) documentoId: string, @CurrentUser() user: UsuarioActual) {
    return this.compliance.documento(documentoId, user);
  }

  @Post('documentos/:documentoId/reintentar')
  @Roles(...ESCRITURA)
  @ApiOperation({ summary: 'Volver a analizar un documento en ERROR' })
  reintentar(@Param('documentoId', uuid) documentoId: string, @CurrentUser() user: UsuarioActual) {
    return this.compliance.reintentarDocumento(documentoId, user);
  }

  @Post('expedientes/:id/dictamenes')
  @Roles(...ESCRITURA)
  @ApiOperation({
    summary: 'Pedir el dictamen',
    description:
      'PARCIAL si faltan documentos; con forzarFinal, FINAL. Un FINAL cierra el expediente.',
  })
  solicitarDictamen(
    @Param('id', uuid) id: string,
    @Body() dto: SolicitarDictamenComplianceDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.compliance.solicitarDictamen(id, dto.forzarFinal === true, user);
  }

  @Get('dictamenes/:dictamenId')
  @ApiOperation({ summary: 'Dictamen con su Markdown, puntaje y contradicciones' })
  dictamen(@Param('dictamenId', uuid) dictamenId: string, @CurrentUser() user: UsuarioActual) {
    return this.compliance.dictamen(dictamenId, user);
  }

  @Get('dictamenes/:dictamenId/pdf')
  @ApiOperation({ summary: 'Descargar el dictamen en PDF' })
  async dictamenPdf(
    @Param('dictamenId', uuid) dictamenId: string,
    @CurrentUser() user: UsuarioActual,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.compliance.dictamenPdf(dictamenId, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
