import { Controller, Post, Get, Param, UseGuards, Body, Res } from '@nestjs/common';
import { GeneradorDocumentosService } from './generador-documentos.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

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

  private async downloadDocumentoInternal(expedienteId: string, tipoDocumento: any, res: any) {
    const result = await this.generadorDocumentosService.download(expedienteId, tipoDocumento);

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
