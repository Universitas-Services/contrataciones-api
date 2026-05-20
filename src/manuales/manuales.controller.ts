import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ManualesService } from './manuales.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GenerarManualDto } from './dto/generar-manual.dto';

@ApiTags('📄 Manuales')
@ApiBearerAuth('JWT-auth')
@Controller('manuales')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
export class ManualesController {
  constructor(private readonly manualesService: ManualesService) {}

  @Post('generar')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Generar manual',
    description:
      'Genera un manual DOCX para el Ente del usuario autenticado. Si ya existe un manual anterior, se elimina de Cloudinary y se reemplaza.',
  })
  @ApiResponse({ status: 200, description: 'Manual generado exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'No autorizado (solo ADMIN_ENTE y EJECUTOR)',
  })
  async generar(
    @Body() dto: GenerarManualDto,
    @CurrentUser() user: { enteId: string; id: string },
  ) {
    return this.manualesService.generarManual(
      user.enteId,
      dto.tipoManual || 'GENERAL',
      dto.descripcion,
      user.id,
    );
  }

  @Get('estado-requisitos')
  @ApiOperation({
    summary: 'Consultar estado de requisitos para el manual',
    description:
      'Verifica si el ente del usuario autenticado cumple con todos los requisitos (Máxima Autoridad, Comisión, etc.) para poder generar su manual.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de los requisitos devuelto exitosamente',
  })
  verificarMisRequisitos(@CurrentUser() user: { enteId: string }) {
    return this.manualesService.verificarRequisitosManual(user.enteId);
  }

  @Get()
  @ApiOperation({
    summary: 'Ver manual de mi ente',
    description:
      'Obtiene la información del manual del ente al que pertenece el usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Información del manual' })
  @ApiResponse({ status: 404, description: 'Este ente no tiene un manual generado' })
  findMyManual(@CurrentUser() user: { enteId: string }) {
    return this.manualesService.findByEnte(user.enteId);
  }

  // =========================================================================
  // PREVISUALIZACIÓN — Para usuarios con enteId en JWT
  // =========================================================================

  @Get('preview')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Previsualizar manual de mi ente',
    description:
      'Retorna una URL para previsualizar el manual en un iframe usando Google Docs Viewer. El usuario permanece en la aplicación.',
  })
  @ApiResponse({ status: 200, description: 'URL de previsualización' })
  @ApiResponse({ status: 404, description: 'Este ente no tiene un manual generado' })
  async previewMyManual(@CurrentUser() user: { enteId: string }) {
    return this.manualesService.getPreviewUrl(user.enteId);
  }

  // =========================================================================
  // PREVISUALIZACIÓN — Para UNIVERSITAS / SUPERVISOR (por enteId en URL)
  // =========================================================================

  @Get('ente/:enteId/preview')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Previsualizar manual de un ente específico',
    description:
      'Retorna una URL para previsualizar el manual de un ente específico en un iframe usando Google Docs Viewer.',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'URL de previsualización' })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual generado' })
  async previewByEnte(@Param('enteId') enteId: string) {
    return this.manualesService.getPreviewUrl(enteId);
  }

  // =========================================================================
  // DESCARGA — Para usuarios con enteId en JWT
  // =========================================================================

  @Get('download')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Descargar manual de mi ente',
    description: 'Descarga el manual DOCX del ente al que pertenece el usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual generado' })
  async downloadMyManual(
    @CurrentUser() user: { enteId: string },
    @Res({ passthrough: false }) res: any,
  ) {
    return this.downloadManualInternal(user.enteId, res);
  }

  // =========================================================================
  // DESCARGA — Para UNIVERSITAS / SUPERVISOR (por enteId en URL)
  // =========================================================================

  @Get('ente/:enteId/download')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Descargar manual de un ente específico',
    description:
      'Descarga el manual DOCX de un ente específico. Solo accesible para UNIVERSITAS y SUPERVISOR.',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual generado' })
  async downloadByEnte(@Param('enteId') enteId: string, @Res({ passthrough: false }) res: any) {
    return this.downloadManualInternal(enteId, res);
  }

  // =========================================================================
  // ENVÍO POR EMAIL — Para usuarios con enteId en JWT
  // =========================================================================

  @Post('send-email')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Enviar manual de mi ente por correo',
    description:
      'Envía el manual del ente del usuario autenticado como archivo adjunto por correo electrónico.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emailDestino: {
          type: 'string',
          example: 'destinatario@ejemplo.com',
          description: 'Correo electrónico del destinatario',
        },
      },
      required: ['emailDestino'],
    },
  })
  @ApiResponse({ status: 200, description: 'Manual enviado exitosamente' })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual generado' })
  async sendMyManualByEmail(
    @CurrentUser() user: { enteId: string },
    @Body() body: { emailDestino: string },
  ) {
    return this.manualesService.sendManualByEmailByEnte(user.enteId, body.emailDestino);
  }

  // =========================================================================
  // ENVÍO POR EMAIL — Para UNIVERSITAS / SUPERVISOR (por enteId en URL)
  // =========================================================================

  @Post('ente/:enteId/send-email')
  @HttpCode(HttpStatus.OK)
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Enviar manual de un ente específico por correo',
    description:
      'Envía el manual de un ente específico como archivo adjunto por correo electrónico. Solo accesible para UNIVERSITAS y SUPERVISOR.',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emailDestino: {
          type: 'string',
          example: 'destinatario@ejemplo.com',
          description: 'Correo electrónico del destinatario',
        },
      },
      required: ['emailDestino'],
    },
  })
  @ApiResponse({ status: 200, description: 'Manual enviado exitosamente' })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual generado' })
  async sendByEnteEmail(@Param('enteId') enteId: string, @Body() body: { emailDestino: string }) {
    return this.manualesService.sendManualByEmailByEnte(enteId, body.emailDestino);
  }

  // =========================================================================
  // MÉTODO INTERNO — Lógica compartida de descarga
  // =========================================================================

  private async downloadManualInternal(enteId: string, res: any) {
    const result = await this.manualesService.downloadByEnte(enteId);

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
