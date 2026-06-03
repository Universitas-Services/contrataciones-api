import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { ManualesService } from './manuales.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GenerarManualDto } from './dto/generar-manual.dto';
import { QueryHistorialDto } from './dto/query-historial.dto';

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
      'Genera un manual DOCX para el Ente del usuario autenticado. Si ya existe un manual anterior, se preserva en el historial y se genera una nueva versión.',
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
    summary: 'Ver manual vigente de mi ente',
    description:
      'Obtiene la información del manual vigente del ente al que pertenece el usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Información del manual vigente' })
  @ApiResponse({ status: 404, description: 'Este ente no tiene un manual vigente' })
  findMyManual(@CurrentUser() user: { enteId: string }) {
    return this.manualesService.findByEnte(user.enteId);
  }

  // =========================================================================
  // HISTORIAL — Consulta de manuales históricos
  // =========================================================================

  @Get('historial')
  @ApiOperation({
    summary: 'Listar historial de manuales de mi ente',
    description:
      'Devuelve el historial completo de todos los manuales generados (vigentes e históricos) paginado.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Historial de manuales obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        metadata: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 3 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 1 },
          },
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'd3b07384-d113-4956-a5cc-9c8b74a32c28' },
              tipoManual: { type: 'string', example: 'GENERAL' },
              tituloManual: { type: 'string', example: 'Manual GENERAL - MPPE' },
              descripcion: {
                type: 'string',
                example: 'Manual GENERAL generado automáticamente para Ministerio de Educación',
              },
              versionDocumento: { type: 'number', example: 1 },
              urlArchivo: {
                type: 'string',
                example:
                  'https://res.cloudinary.com/da86ka5ip/raw/upload/v1717430400/manuales/ente-uuid/manual-general-12345.docx',
              },
              createdAt: { type: 'string', example: '2026-06-03T15:30:00.000Z' },
              createdBy: { type: 'string', example: 'user-uuid-123' },
              esVersionVigente: { type: 'boolean', example: true },
              estaDesactualizado: { type: 'boolean', example: false },
              motivoDesactualizacion: { type: 'string', nullable: true, example: null },
              snapshotDatos: {
                type: 'object',
                nullable: true,
                properties: {
                  nombre: { type: 'string', example: 'Ministerio de Educación' },
                  siglas: { type: 'string', example: 'MPPE' },
                  logoUrl: {
                    type: 'string',
                    example:
                      'https://res.cloudinary.com/da86ka5ip/image/upload/v1717430400/logos/logo.png',
                  },
                  nombreUnidadAdminFinanciera: {
                    type: 'string',
                    example: 'Dirección de Administración',
                  },
                  nombreUnidadContratante: { type: 'string', example: 'Unidad de Contrataciones' },
                  nombreUnidadTecnologia: { type: 'string', example: 'Dirección de Tecnología' },
                  denominacionComision: {
                    type: 'string',
                    example: 'Comisión de Contrataciones del MPPE',
                  },
                  cargoOficialAutoridad: { type: 'string', example: 'Ministro(a)' },
                  fechaGeneracion: { type: 'string', example: '3 de junio de 2026' },
                },
              },
            },
          },
        },
      },
    },
  })
  findMyHistorial(@CurrentUser() user: { enteId: string }, @Query() query: QueryHistorialDto) {
    return this.manualesService.findHistorial(user.enteId, query.page, query.limit);
  }

  @Get('ente/:enteId/historial')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Listar historial de manuales de un ente específico',
    description: 'Permite a UNIVERSITAS y SUPERVISOR ver todo el historial de manuales de un ente.',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Historial de manuales del ente obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        metadata: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 3 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 1 },
          },
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'd3b07384-d113-4956-a5cc-9c8b74a32c28' },
              tipoManual: { type: 'string', example: 'GENERAL' },
              tituloManual: { type: 'string', example: 'Manual GENERAL - MPPE' },
              descripcion: {
                type: 'string',
                example: 'Manual GENERAL generado automáticamente para Ministerio de Educación',
              },
              versionDocumento: { type: 'number', example: 1 },
              urlArchivo: {
                type: 'string',
                example:
                  'https://res.cloudinary.com/da86ka5ip/raw/upload/v1717430400/manuales/ente-uuid/manual-general-12345.docx',
              },
              createdAt: { type: 'string', example: '2026-06-03T15:30:00.000Z' },
              createdBy: { type: 'string', example: 'user-uuid-123' },
              esVersionVigente: { type: 'boolean', example: true },
              estaDesactualizado: { type: 'boolean', example: false },
              motivoDesactualizacion: { type: 'string', nullable: true, example: null },
              snapshotDatos: {
                type: 'object',
                nullable: true,
                properties: {
                  nombre: { type: 'string', example: 'Ministerio de Educación' },
                  siglas: { type: 'string', example: 'MPPE' },
                  logoUrl: {
                    type: 'string',
                    example:
                      'https://res.cloudinary.com/da86ka5ip/image/upload/v1717430400/logos/logo.png',
                  },
                  nombreUnidadAdminFinanciera: {
                    type: 'string',
                    example: 'Dirección de Administración',
                  },
                  nombreUnidadContratante: { type: 'string', example: 'Unidad de Contrataciones' },
                  nombreUnidadTecnologia: { type: 'string', example: 'Dirección de Tecnología' },
                  denominacionComision: {
                    type: 'string',
                    example: 'Comisión de Contrataciones del MPPE',
                  },
                  cargoOficialAutoridad: { type: 'string', example: 'Ministro(a)' },
                  fechaGeneracion: { type: 'string', example: '3 de junio de 2026' },
                },
              },
            },
          },
        },
      },
    },
  })
  findHistorialByEnte(@Param('enteId') enteId: string, @Query() query: QueryHistorialDto) {
    return this.manualesService.findHistorial(enteId, query.page, query.limit);
  }

  // =========================================================================
  // PREVISUALIZACIÓN — Para usuarios con enteId en JWT
  // =========================================================================

  @Get('preview')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Previsualizar manual vigente de mi ente',
    description:
      'Retorna una URL para previsualizar el manual vigente en un iframe usando Google Docs Viewer. El usuario permanece en la aplicación.',
  })
  @ApiResponse({
    status: 200,
    description: 'URL de previsualización de manual vigente',
    schema: {
      type: 'object',
      properties: {
        previewUrl: {
          type: 'string',
          example:
            'https://docs.google.com/gview?url=https%3A%2F%2Fres.cloudinary.com%2Fda86ka5ip%2Fraw%2Fupload%2Fv1717430400%2Fmanuales%2Fente-uuid%2Fmanual-general-12345.docx&embedded=true',
        },
        tituloManual: { type: 'string', example: 'Manual GENERAL - MPPE' },
        urlArchivo: {
          type: 'string',
          example:
            'https://res.cloudinary.com/da86ka5ip/raw/upload/v1717430400/manuales/ente-uuid/manual-general-12345.docx',
        },
        estaDesactualizado: { type: 'boolean', example: false },
        motivoDesactualizacion: { type: 'string', nullable: true, example: null },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Este ente no tiene un manual vigente' })
  async previewMyManual(@CurrentUser() user: { enteId: string }) {
    return this.manualesService.getPreviewUrl(user.enteId);
  }

  // =========================================================================
  // PREVISUALIZACIÓN — Para UNIVERSITAS / SUPERVISOR (por enteId en URL)
  // =========================================================================

  @Get('ente/:enteId/preview')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Previsualizar manual vigente de un ente específico',
    description:
      'Retorna una URL para previsualizar el manual vigente de un ente específico en un iframe usando Google Docs Viewer.',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiResponse({
    status: 200,
    description: 'URL de previsualización de manual vigente del ente',
    schema: {
      type: 'object',
      properties: {
        previewUrl: {
          type: 'string',
          example:
            'https://docs.google.com/gview?url=https%3A%2F%2Fres.cloudinary.com%2Fda86ka5ip%2Fraw%2Fupload%2Fv1717430400%2Fmanuales%2Fente-uuid%2Fmanual-general-12345.docx&embedded=true',
        },
        tituloManual: { type: 'string', example: 'Manual GENERAL - MPPE' },
        urlArchivo: {
          type: 'string',
          example:
            'https://res.cloudinary.com/da86ka5ip/raw/upload/v1717430400/manuales/ente-uuid/manual-general-12345.docx',
        },
        estaDesactualizado: { type: 'boolean', example: false },
        motivoDesactualizacion: { type: 'string', nullable: true, example: null },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual vigente' })
  async previewByEnte(@Param('enteId') enteId: string) {
    return this.manualesService.getPreviewUrl(enteId);
  }

  // =========================================================================
  // PREVISUALIZACIÓN HISTÓRICO — Por ID de manual
  // =========================================================================

  @Get(':manualId/preview')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Previsualizar un manual específico del historial',
    description: 'Retorna URL de previsualización para un manual histórico por su ID.',
  })
  @ApiParam({ name: 'manualId', description: 'ID del manual' })
  @ApiResponse({
    status: 200,
    description: 'URL de previsualización de manual histórico',
    schema: {
      type: 'object',
      properties: {
        previewUrl: {
          type: 'string',
          example:
            'https://docs.google.com/gview?url=https%3A%2F%2Fres.cloudinary.com%2Fda86ka5ip%2Fraw%2Fupload%2Fv1717430400%2Fmanuales%2Fente-uuid%2Fmanual-general-12345.docx&embedded=true',
        },
        tituloManual: { type: 'string', example: 'Manual GENERAL - MPPE' },
        urlArchivo: {
          type: 'string',
          example:
            'https://res.cloudinary.com/da86ka5ip/raw/upload/v1717430400/manuales/ente-uuid/manual-general-12345.docx',
        },
        versionDocumento: { type: 'number', example: 1 },
        esVersionVigente: { type: 'boolean', example: false },
        estaDesactualizado: { type: 'boolean', example: true },
        motivoDesactualizacion: {
          type: 'string',
          example: 'Se generó una nueva versión del manual',
        },
      },
    },
  })
  async previewManualById(
    @Param('manualId') manualId: string,
    @CurrentUser() user: { enteId: string },
  ) {
    return this.manualesService.getPreviewUrlById(manualId, user.enteId);
  }

  @Get('ente/:enteId/:manualId/preview')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Previsualizar un manual histórico de un ente específico',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiParam({ name: 'manualId', description: 'ID del manual' })
  @ApiResponse({
    status: 200,
    description: 'URL de previsualización de manual histórico del ente',
    schema: {
      type: 'object',
      properties: {
        previewUrl: {
          type: 'string',
          example:
            'https://docs.google.com/gview?url=https%3A%2F%2Fres.cloudinary.com%2Fda86ka5ip%2Fraw%2Fupload%2Fv1717430400%2Fmanuales%2Fente-uuid%2Fmanual-general-12345.docx&embedded=true',
        },
        tituloManual: { type: 'string', example: 'Manual GENERAL - MPPE' },
        urlArchivo: {
          type: 'string',
          example:
            'https://res.cloudinary.com/da86ka5ip/raw/upload/v1717430400/manuales/ente-uuid/manual-general-12345.docx',
        },
        versionDocumento: { type: 'number', example: 1 },
        esVersionVigente: { type: 'boolean', example: false },
        estaDesactualizado: { type: 'boolean', example: true },
        motivoDesactualizacion: {
          type: 'string',
          example: 'Se generó una nueva versión del manual',
        },
      },
    },
  })
  async previewManualByEnteAndId(
    @Param('enteId') enteId: string,
    @Param('manualId') manualId: string,
  ) {
    return this.manualesService.getPreviewUrlById(manualId, enteId);
  }

  // =========================================================================
  // DESCARGA — Para usuarios con enteId en JWT
  // =========================================================================

  @Get('download')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Descargar manual vigente de mi ente',
    description:
      'Descarga el manual DOCX vigente del ente al que pertenece el usuario autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual vigente' })
  async downloadMyManual(
    @CurrentUser() user: { enteId: string },
    @Res({ passthrough: false }) res: any,
  ) {
    const result = await this.manualesService.downloadByEnte(user.enteId);
    return this.downloadFromUrl(result, res);
  }

  // =========================================================================
  // DESCARGA — Para UNIVERSITAS / SUPERVISOR (por enteId en URL)
  // =========================================================================

  @Get('ente/:enteId/download')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Descargar manual vigente de un ente específico',
    description:
      'Descarga el manual DOCX vigente de un ente específico. Solo accesible para UNIVERSITAS y SUPERVISOR.',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual vigente' })
  async downloadByEnte(@Param('enteId') enteId: string, @Res({ passthrough: false }) res: any) {
    const result = await this.manualesService.downloadByEnte(enteId);
    return this.downloadFromUrl(result, res);
  }

  // =========================================================================
  // DESCARGA HISTÓRICO — Por ID de manual
  // =========================================================================

  @Get(':manualId/download')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'SUPERVISOR', 'VISUALIZADOR')
  @ApiOperation({
    summary: 'Descargar un manual específico del historial',
    description: 'Descarga el DOCX de un manual histórico por su ID.',
  })
  @ApiParam({ name: 'manualId', description: 'ID del manual' })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  async downloadManualById(
    @Param('manualId') manualId: string,
    @CurrentUser() user: { enteId: string },
    @Res({ passthrough: false }) res: any,
  ) {
    const result = await this.manualesService.downloadById(manualId, user.enteId);
    return this.downloadFromUrl(result, res);
  }

  @Get('ente/:enteId/:manualId/download')
  @Roles('UNIVERSITAS', 'SUPERVISOR')
  @ApiOperation({
    summary: 'Descargar un manual histórico de un ente específico',
  })
  @ApiParam({ name: 'enteId', description: 'ID del Ente' })
  @ApiParam({ name: 'manualId', description: 'ID del manual' })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  async downloadManualByEnteAndId(
    @Param('enteId') enteId: string,
    @Param('manualId') manualId: string,
    @Res({ passthrough: false }) res: any,
  ) {
    const result = await this.manualesService.downloadById(manualId, enteId);
    return this.downloadFromUrl(result, res);
  }

  // =========================================================================
  // ENVÍO POR EMAIL — Para usuarios con enteId en JWT
  // =========================================================================

  @Post('send-email')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Enviar manual vigente de mi ente por correo',
    description:
      'Envía el manual vigente del ente del usuario autenticado como archivo adjunto por correo electrónico.',
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
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual vigente' })
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
    summary: 'Enviar manual vigente de un ente específico por correo',
    description:
      'Envía el manual vigente de un ente específico como archivo adjunto por correo electrónico. Solo accesible para UNIVERSITAS y SUPERVISOR.',
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
  @ApiResponse({ status: 404, description: 'El ente no tiene un manual vigente' })
  async sendByEnteEmail(@Param('enteId') enteId: string, @Body() body: { emailDestino: string }) {
    return this.manualesService.sendManualByEmailByEnte(enteId, body.emailDestino);
  }

  // =========================================================================
  // MÉTODO INTERNO — Lógica compartida de descarga
  // =========================================================================

  private async downloadFromUrl(result: { url: string; fileName: string }, res: any) {
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
