import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { EspecificacionesService } from './especificaciones.service';
import type { UsuarioActual } from '../common/types/usuario-actual.type';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('📋 Fase 1 — Preparatoria')
@ApiBearerAuth('JWT-auth')
@Controller('expedientes/:expedienteId/fase-preparatoria/especificaciones-tecnicas')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EspecificacionesController {
  constructor(private readonly especificacionesService: EspecificacionesService) {}

  @Get()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS', 'VISUALIZADOR', 'SUPERVISOR')
  @ApiOperation({ summary: 'Obtener metadata del archivo de especificaciones técnicas' })
  obtener(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.especificacionesService.obtener(expedienteId, user);
  }

  @Post()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Cargar especificaciones técnicas',
    description: 'Sube el archivo de especificaciones técnicas (PDF o DOCX, máximo 10 MB).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Especificaciones cargadas exitosamente' })
  subir(
    @Param('expedienteId') expedienteId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          new FileTypeValidator({ fileType: /(pdf|docx|doc)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.especificacionesService.subir(expedienteId, file, user);
  }

  @Delete()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar el archivo de especificaciones técnicas' })
  eliminar(@Param('expedienteId') expedienteId: string, @CurrentUser() user: UsuarioActual) {
    return this.especificacionesService.eliminar(expedienteId, user);
  }
}
