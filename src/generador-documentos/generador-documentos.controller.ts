import { Controller, Post, Get, Param, UseGuards, Body } from '@nestjs/common';
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
  // PREVISUALIZACIÓN (PREVIEW)
  // ==========================

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
  async downloadActaInicio(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.download(expedienteId, 'ACTA_INICIO');
  }

  @Get('download/pliego-condiciones/:expedienteId')
  async downloadPliegoCondiciones(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.download(expedienteId, 'PLIEGO_CONDICIONES');
  }

  @Get('download/llamado-participar/:expedienteId')
  async downloadLlamadoParticipar(@Param('expedienteId') expedienteId: string) {
    return this.generadorDocumentosService.download(expedienteId, 'LLAMADO_PARTICIPAR');
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
}
