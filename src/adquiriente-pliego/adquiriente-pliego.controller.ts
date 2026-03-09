/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
import { AdquirentePliegoService } from './adquiriente-pliego.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAdquirentePliegoDto } from './dto/create-adquiriente-pliego.dto';
import { UpdateAdquirentePliegoDto } from './dto/update-adquiriente-pliego.dto';
import { GenerarPliegoDto } from './dto/generar-pliego.dto';

@ApiTags('📋 Adquiriente Pliego')
@ApiBearerAuth('JWT-auth')
@Controller('adquiriente-pliego')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
export class AdquirentePliegoController {
  constructor(private readonly adquirentePliegoService: AdquirentePliegoService) {}

  // =========================================================================
  // CRUD
  // =========================================================================

  @Post()
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Crear adquiriente pliego',
    description: 'Registra un nuevo adquiriente del pliego de condiciones para un expediente.',
  })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Expediente o proveedor no encontrado' })
  async create(
    @Body() dto: CreateAdquirentePliegoDto,
    @CurrentUser() user: { enteId: string; id: string },
  ) {
    return this.adquirentePliegoService.create(dto, user.id, user.enteId);
  }

  @Get('expediente/:expedienteId')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Listar adquirientes por expediente',
    description:
      'Obtiene todos los adquirientes del pliego de un expediente de contratación específico.',
  })
  @ApiParam({ name: 'expedienteId', description: 'ID del Expediente' })
  @ApiResponse({ status: 200, description: 'Lista de adquirientes' })
  async findAllByExpediente(
    @Param('expedienteId') expedienteId: string,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.adquirentePliegoService.findAllByExpediente(expedienteId, user.enteId);
  }

  @Get(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Obtener adquiriente pliego por ID',
    description: 'Obtiene los datos de un adquiriente del pliego por su ID.',
  })
  @ApiParam({ name: 'id', description: 'ID del adquiriente pliego' })
  @ApiResponse({ status: 200, description: 'Datos del adquiriente' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async findOne(@Param('id') id: string, @CurrentUser() user: { enteId: string }) {
    return this.adquirentePliegoService.findOne(id, user.enteId);
  }

  @Patch(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Actualizar adquiriente pliego',
    description: 'Actualiza los datos de un adquiriente del pliego.',
  })
  @ApiParam({ name: 'id', description: 'ID del adquiriente pliego' })
  @ApiResponse({ status: 200, description: 'Registro actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdquirentePliegoDto,
    @CurrentUser() user: { enteId: string; id: string },
  ) {
    return this.adquirentePliegoService.update(id, dto, user.id, user.enteId);
  }

  @Delete(':id')
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Eliminar adquiriente pliego',
    description: 'Elimina un registro de adquiriente del pliego (soft delete).',
  })
  @ApiParam({ name: 'id', description: 'ID del adquiriente pliego' })
  @ApiResponse({ status: 200, description: 'Registro eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async remove(@Param('id') id: string, @CurrentUser() user: { enteId: string; id: string }) {
    return this.adquirentePliegoService.remove(id, user.id, user.enteId);
  }

  // =========================================================================
  // GENERACIÓN DE PLIEGO
  // =========================================================================

  @Post('generar')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Generar pliego de condiciones',
    description:
      'Genera un documento DOCX de pliego de condiciones para un expediente. Si ya existe un pliego anterior, se reemplaza.',
  })
  @ApiResponse({ status: 200, description: 'Pliego generado exitosamente' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado' })
  async generar(
    @Body() dto: GenerarPliegoDto,
    @CurrentUser() user: { enteId: string; id: string },
  ) {
    return this.adquirentePliegoService.generarPliego(
      user.enteId,
      dto.expedienteId,
      dto.descripcion,
      user.id,
    );
  }

  // =========================================================================
  // PREVISUALIZACIÓN
  // =========================================================================

  @Get('pliego/:pliegoId/preview')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Previsualizar pliego generado',
    description:
      'Retorna una URL para previsualizar el pliego de condiciones en un iframe usando Google Docs Viewer.',
  })
  @ApiParam({ name: 'pliegoId', description: 'ID del pliego generado' })
  @ApiResponse({ status: 200, description: 'URL de previsualización' })
  @ApiResponse({ status: 404, description: 'Pliego no encontrado' })
  async preview(@Param('pliegoId') pliegoId: string, @CurrentUser() user: { enteId: string }) {
    return this.adquirentePliegoService.getPreviewUrl(pliegoId, user.enteId);
  }

  // =========================================================================
  // DESCARGA
  // =========================================================================

  @Get('pliego/:pliegoId/download')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Descargar pliego generado',
    description: 'Descarga el documento DOCX del pliego de condiciones.',
  })
  @ApiParam({ name: 'pliegoId', description: 'ID del pliego generado' })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  @ApiResponse({ status: 404, description: 'Pliego no encontrado' })
  async download(
    @Param('pliegoId') pliegoId: string,
    @CurrentUser() user: { enteId: string },
    @Res({ passthrough: false }) res: any,
  ) {
    const result = await this.adquirentePliegoService.downloadPliego(pliegoId, user.enteId);

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const axiosLib = require('axios');

      const response = await axiosLib.get(result.url, {
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

  // =========================================================================
  // ENVÍO POR EMAIL
  // =========================================================================

  @Post('pliego/:pliegoId/send-email')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Enviar pliego por correo',
    description: 'Envía el pliego de condiciones como archivo adjunto por correo electrónico.',
  })
  @ApiParam({ name: 'pliegoId', description: 'ID del pliego generado' })
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
  @ApiResponse({ status: 200, description: 'Pliego enviado exitosamente' })
  @ApiResponse({ status: 404, description: 'Pliego no encontrado' })
  async sendByEmail(
    @Param('pliegoId') pliegoId: string,
    @CurrentUser() user: { enteId: string },
    @Body() body: { emailDestino: string },
  ) {
    return this.adquirentePliegoService.sendPliegoByEmail(pliegoId, user.enteId, body.emailDestino);
  }
}
