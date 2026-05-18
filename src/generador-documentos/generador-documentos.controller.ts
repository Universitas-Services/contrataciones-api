import { Controller, Post, Get, Param, UseGuards, Body, Res } from '@nestjs/common';
import { GeneradorDocumentosService } from './generador-documentos.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TipoDocumento } from '@prisma/client';

@ApiTags('📄 Generador de Documentos')
@ApiBearerAuth('JWT-auth')
@Controller('generador-documentos')
@UseGuards(AuthGuard('jwt'))
export class GeneradorDocumentosController {
  constructor(private readonly generadorDocumentosService: GeneradorDocumentosService) {}

  // ==========================
  // GENERAR DOCUMENTOS
  // ==========================

  @ApiOperation({ summary: 'Generar Acta de Inicio' })
  @Post('generar/acta-inicio/:expedienteId')
  async generarActaInicio(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarActaInicio(expedienteId, user.id);
    return {
      message: 'Acta de Inicio generada y guardada exitosamente',
      data,
    };
  }

  @ApiOperation({ summary: 'Generar Pliego de Condiciones' })
  @Post('generar/pliego-condiciones/:expedienteId')
  async generarPliegoCondiciones(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarPliegoCondiciones(
      expedienteId,
      user.id,
    );
    return {
      message: 'Pliego de Condiciones generado y guardado exitosamente',
      data,
    };
  }

  @ApiOperation({ summary: 'Generar Llamado a Participar' })
  @Post('generar/llamado-participar/:expedienteId')
  async generarLlamadoParticipar(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarLlamadoParticipar(
      expedienteId,
      user.id,
    );
    return {
      message: 'Llamado a Participar generado y guardado exitosamente',
      data,
    };
  }

  // ==========================
  // GESTIÓN DE PARTICIPANTES
  // ==========================

  @ApiOperation({ summary: 'Generar Registro de Adquirentes del Pliego' })
  @Post('generar/registro-adquirentes/:expedienteId')
  async generarRegistroAdquirentes(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarRegistroAdquirentes(
      expedienteId,
      user.id,
    );
    return { message: 'Registro de Adquirentes generado exitosamente', data };
  }

  @ApiOperation({ summary: 'Generar Acta de Recepción de Sobres' })
  @Post('generar/acta-recepcion-sobres/:expedienteId')
  async generarActaRecepcionSobres(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarActaRecepcionSobres(
      expedienteId,
      user.id,
    );
    return { message: 'Acta de Recepción de Sobres generada exitosamente', data };
  }

  @ApiOperation({ summary: 'Generar Acta de Apertura de Sobres' })
  @Post('generar/acta-apertura-sobres/:expedienteId')
  async generarActaAperturaSobres(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarActaAperturaSobres(
      expedienteId,
      user.id,
    );
    return { message: 'Acta de Apertura de Sobres generada exitosamente', data };
  }

  @ApiOperation({ summary: 'Regenerar un documento existente' })
  @Post('regenerar/:id')
  async regenerarDocumento(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const data = await this.generadorDocumentosService.regenerarDocumento(id, user.id);
    return {
      message: 'Documento regenerado exitosamente',
      data,
    };
  }

  @ApiOperation({ summary: 'Obtener enlace de previsualización Acta de Inicio' })
  @Get('preview/acta-inicio/:expedienteId')
  async previewActaInicio(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'ACTA_INICIO');
  }

  @ApiOperation({ summary: 'Obtener enlace de previsualización Pliego de Condiciones' })
  @Get('preview/pliego-condiciones/:expedienteId')
  async previewPliegoCondiciones(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'PLIEGO_CONDICIONES');
  }

  @ApiOperation({ summary: 'Obtener enlace de previsualización Llamado a Participar' })
  @Get('preview/llamado-participar/:expedienteId')
  async previewLlamadoParticipar(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'LLAMADO_PARTICIPAR');
  }

  // ==========================
  // DESCARGAR (DOWNLOAD)
  // ==========================

  @ApiOperation({ summary: 'Descargar Acta de Inicio generada' })
  @Get('download/acta-inicio/:expedienteId')
  async downloadActaInicio(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'ACTA_INICIO', res);
  }

  @Get('download/pliego-condiciones/:expedienteId')
  async downloadPliegoCondiciones(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'PLIEGO_CONDICIONES', res);
  }

  @Get('download/llamado-participar/:expedienteId')
  async downloadLlamadoParticipar(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'LLAMADO_PARTICIPAR', res);
  }

  @ApiOperation({ summary: 'Preview Registro de Adquirentes' })
  @Get('preview/registro-adquirentes/:expedienteId')
  async previewRegistroAdquirentes(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'REGISTRO_ADQUIRENTES');
  }

  @ApiOperation({ summary: 'Preview Acta de Recepción de Sobres' })
  @Get('preview/acta-recepcion-sobres/:expedienteId')
  async previewActaRecepcionSobres(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'ACTA_RECEPCION');
  }

  @ApiOperation({ summary: 'Preview Acta de Apertura de Sobres' })
  @Get('preview/acta-apertura-sobres/:expedienteId')
  async previewActaAperturaSobres(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'ACTA_APERTURA');
  }

  @ApiOperation({ summary: 'Descargar Registro de Adquirentes' })
  @Get('download/registro-adquirentes/:expedienteId')
  async downloadRegistroAdquirentes(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'REGISTRO_ADQUIRENTES', res);
  }

  @ApiOperation({ summary: 'Descargar Acta de Recepción de Sobres' })
  @Get('download/acta-recepcion-sobres/:expedienteId')
  async downloadActaRecepcionSobres(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'ACTA_RECEPCION', res);
  }

  @ApiOperation({ summary: 'Descargar Acta de Apertura de Sobres' })
  @Get('download/acta-apertura-sobres/:expedienteId')
  async downloadActaAperturaSobres(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'ACTA_APERTURA', res);
  }

  @ApiOperation({
    summary: 'Obtener el estado de generación de todos los documentos de un expediente',
  })
  @Get('status-expediente/:expedienteId')
  async getStatusExpediente(@Param('expedienteId') expedienteId: string) {
    const data = await this.generadorDocumentosService.getStatusPorExpediente(expedienteId);
    return {
      message: 'Estado de documentos obtenido exitosamente',
      data,
    };
  }

  // ==========================
  // FASE 3 — Lista de Cotejo e Informe de Recomendación
  // ==========================

  @ApiOperation({ summary: 'Generar Lista de Cotejo para un oferente evaluado' })
  @Post('generar/lista-cotejo/:expedienteId/:evaluacionId')
  async generarListaCotejo(
    @Param('expedienteId') expedienteId: string,
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarListaCotejo(
      expedienteId,
      evaluacionId,
      user.id,
    );
    return { message: 'Lista de Cotejo generada exitosamente', data };
  }

  @ApiOperation({ summary: 'Generar Informe de Recomendación del expediente' })
  @Post('generar/informe-recomendacion/:expedienteId')
  async generarInformeRecomendacion(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarInformeRecomendacion(
      expedienteId,
      user.id,
    );
    return { message: 'Informe de Recomendación generado exitosamente', data };
  }

  @ApiOperation({ summary: 'Preview Lista de Cotejo por evaluación' })
  @Get('preview/lista-cotejo/evaluacion/:evaluacionId')
  async previewListaCotejoByEvaluacion(@Param('evaluacionId') evaluacionId: string) {
    return this.generadorDocumentosService.getPreviewUrlByEvaluacion(evaluacionId, 'LISTA_COTEJO');
  }

  @ApiOperation({ summary: 'Preview Informe de Recomendación' })
  @Get('preview/informe-recomendacion/:expedienteId')
  async previewInformeRecomendacion(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'INFORME_RECOMENDACION');
  }

  @ApiOperation({ summary: 'Descargar Lista de Cotejo por evaluación' })
  @Get('download/lista-cotejo/evaluacion/:evaluacionId')
  async downloadListaCotejoByEvaluacion(
    @Param('evaluacionId') evaluacionId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    const result = await this.generadorDocumentosService.downloadByEvaluacion(
      evaluacionId,
      'LISTA_COTEJO',
    );
    return this.proxyCloudinaryDownload(result, res);
  }

  @ApiOperation({ summary: 'Descargar Informe de Recomendación' })
  @Get('download/informe-recomendacion/:expedienteId')
  async downloadInformeRecomendacion(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'INFORME_RECOMENDACION', res);
  }

  // ==========================
  // FASE 4 — Adjudicación, Contrato Formalizado y Notificaciones
  // ==========================

  @ApiOperation({ summary: 'Generar Acta de Adjudicación' })
  @Post('generar/acta-adjudicacion/:expedienteId')
  async generarActaAdjudicacion(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarAdjudicacion(expedienteId, user.id);
    return { message: 'Acta de Adjudicación generada exitosamente', data };
  }

  @ApiOperation({ summary: 'Generar Contrato Formalizado' })
  @Post('generar/contrato/:expedienteId')
  async generarContrato(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarContrato(expedienteId, user.id);
    return { message: 'Contrato Formalizado generado exitosamente', data };
  }

  @ApiOperation({ summary: 'Generar Notificaciones Masivas Fase 4' })
  @Post('generar/notificaciones-fase4/:expedienteId')
  async generarNotificacionesFase4(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { id: string },
  ) {
    const data = await this.generadorDocumentosService.generarNotificacionesFase4(
      expedienteId,
      user.id,
    );
    return { message: 'Notificaciones Masivas generadas exitosamente', data };
  }

  @ApiOperation({ summary: 'Preview Acta de Adjudicación' })
  @Get('preview/acta-adjudicacion/:expedienteId')
  async previewActaAdjudicacion(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'ACTA_ADJUDICACION');
  }

  @ApiOperation({ summary: 'Preview Contrato Formalizado' })
  @Get('preview/contrato/:expedienteId')
  async previewContrato(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.getPreviewUrl(expedienteId, 'CONTRATO');
  }

  @ApiOperation({ summary: 'Descargar Acta de Adjudicación' })
  @Get('download/acta-adjudicacion/:expedienteId')
  async downloadActaAdjudicacion(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'ACTA_ADJUDICACION', res);
  }

  @ApiOperation({ summary: 'Descargar Contrato Formalizado' })
  @Get('download/contrato/:expedienteId')
  async downloadContrato(
    @Param('expedienteId') expedienteId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadDocumentoInternal(expedienteId, 'CONTRATO', res);
  }

  @ApiOperation({ summary: 'Obtener estado de notificaciones' })
  @Get('expedientes/:expedienteId/estado-notificaciones')
  async getEstadoNotificaciones(@Param('expedienteId') expedienteId: string) {
    const estado = await this.generadorDocumentosService.getStatusPorExpediente(expedienteId);
    const notificacionesGeneradas = estado.some(
      (e) =>
        (e.tipo === 'NOTIFICACION_ADJUDICADO' || e.tipo === 'NOTIFICACION_NO_ADJUDICADO') &&
        e.generado,
    );
    return {
      message: 'Estado de notificaciones',
      generadas: notificacionesGeneradas,
    };
  }

  // ==========================
  // ENVIAR POR EMAIL
  // ==========================

  @Post('email/acta-inicio/:expedienteId')
  async emailActaInicio(
    @Param('expedienteId') expedienteId: string,
    @Body('email') emailDestino: string,
  ) {
    return this.generadorDocumentosService.sendDocumentoByEmail(
      expedienteId,
      'ACTA_INICIO',
      emailDestino,
    );
  }

  @Post('email/pliego-condiciones/:expedienteId')
  async emailPliegoCondiciones(
    @Param('expedienteId') expedienteId: string,
    @Body('email') emailDestino: string,
  ) {
    return this.generadorDocumentosService.sendDocumentoByEmail(
      expedienteId,
      'PLIEGO_CONDICIONES',
      emailDestino,
    );
  }

  @Post('email/llamado-participar/:expedienteId')
  async emailLlamadoParticipar(
    @Param('expedienteId') expedienteId: string,
    @Body('email') emailDestino: string,
  ) {
    return this.generadorDocumentosService.sendDocumentoByEmail(
      expedienteId,
      'LLAMADO_PARTICIPAR',
      emailDestino,
    );
  }

  // ==========================
  // MÉTODO INTERNO — Lógica compartida de descarga proxy
  // ==========================

  private async downloadDocumentoInternal(
    expedienteId: string,
    tipoDocumento: TipoDocumento,
    res: any,
  ) {
    const result = await this.generadorDocumentosService.download(expedienteId, tipoDocumento);
    return this.proxyCloudinaryDownload(result, res);
  }

  private async proxyCloudinaryDownload(result: { url: string; fileName: string }, res: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const axios = require('axios');

      const response = await axios.get(result.url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const fileBuffer = Buffer.from(response.data);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');

      res.end(fileBuffer);
    } catch (error: any) {
      res.status(500).json({
        statusCode: 500,
        message: 'Error al descargar el archivo desde Cloudinary',
        error: error.message,
      });
    }
  }
}
