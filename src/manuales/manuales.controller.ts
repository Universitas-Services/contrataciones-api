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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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
  constructor(private readonly manualesService: ManualesService) { }

  @Post('generar')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN_ENTE', 'EJECUTOR')
  @ApiOperation({
    summary: 'Generar manual',
    description: 'Genera un manual DOCX para el Ente del usuario autenticado',
  })
  @ApiResponse({ status: 201, description: 'Manual generado exitosamente' })
  @ApiResponse({
    status: 403,
    description: 'No autorizado (solo ADMIN_ENTE y EJECUTOR)',
  })
  async generar(@Body() dto: GenerarManualDto, @CurrentUser() user: any) {
    return this.manualesService.generarManual(
      user.enteId,
      dto.tipoManual || 'GENERAL',
      dto.descripcion,
      user.id,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar manuales',
    description: 'Obtiene todos los manuales del Ente o de los Entes asignados (SUPERVISOR)',
  })
  @ApiResponse({ status: 200, description: 'Lista de manuales' })
  findAll(@CurrentUser() user: any) {
    return this.manualesService.findAll(user.enteId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver manual',
    description: 'Obtiene los detalles de un manual específico',
  })
  @ApiParam({ name: 'id', description: 'ID del manual' })
  @ApiResponse({ status: 200, description: 'Detalles del manual' })
  @ApiResponse({ status: 404, description: 'Manual no encontrado' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.manualesService.findOne(id, user.enteId);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Descargar manual',
    description: 'Descarga directamente el archivo DOCX del manual',
  })
  @ApiParam({ name: 'id', description: 'ID del manual' })
  @ApiResponse({ status: 200, description: 'Archivo DOCX descargado' })
  @ApiResponse({ status: 404, description: 'Manual no encontrado' })
  async download(@Param('id') id: string, @CurrentUser() user: any, @Res({ passthrough: false }) res: any) {
    const result = await this.manualesService.download(id, user.enteId);

    try {
      // Fetch file from Cloudinary URL
      const axios = require('axios');
      const response = await axios.get(result.url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const fileBuffer = Buffer.from(response.data);

      // Set proper headers for DOCX download with explicit filename
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');

      // Send the file buffer
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
