import {
  Controller,
  Post,
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
@Controller('expedientes/:expedienteId/fase-preparatoria/calificacion-legal/modelos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RecaudosModeloController {
  constructor(private readonly especificacionesService: EspecificacionesService) {}

  @Post()
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'UNIVERSITAS')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Cargar el documento modelo de un recaudo personalizado',
    description:
      'Sube el archivo modelo (PDF o DOCX, máximo 10 MB) que los oferentes descargarán para un ' +
      'recaudo personalizado de la Calificación Legal. Devuelve `archivoModeloUrl`, que debe ' +
      'guardarse dentro del recaudo correspondiente en `personalizados`. Al completar el ' +
      'micromódulo, todo recaudo con `tieneModelo: true` debe tener esta URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Documento modelo cargado exitosamente' })
  subirModelo(
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
    return this.especificacionesService.subirModeloRecaudo(expedienteId, file, user);
  }
}
