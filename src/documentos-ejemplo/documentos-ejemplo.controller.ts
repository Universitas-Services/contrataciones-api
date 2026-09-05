import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
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
import { DocumentosEjemploService } from './documentos-ejemplo.service';
import {
  CreateDocumentoEjemploDto,
  UpdateDocumentoEjemploDto,
  QueryDocumentoEjemploDto,
} from './dto/documento-ejemplo.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UsuarioActual } from '../common/types/usuario-actual.type';

const ROLES_LECTURA = [
  'ADMIN_ENTE',
  'EJECUTOR',
  'UNIVERSITAS',
  'VISUALIZADOR',
  'SUPERVISOR',
] as const;

@ApiTags('🖼️ Documentos de Ejemplo')
@ApiBearerAuth('JWT-auth')
@Controller('documentos-ejemplo')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DocumentosEjemploController {
  constructor(private readonly service: DocumentosEjemploService) {}

  @Get()
  @Roles(...ROLES_LECTURA)
  @ApiOperation({
    summary: 'Listar los documentos de ejemplo',
    description:
      'Guías visuales que carga UNIVERSITAS para que los entes vean cómo debe quedar cada ' +
      'documento. Admite paginación, búsqueda y filtro por estado.',
  })
  @ApiResponse({ status: 200, description: 'Listado obtenido exitosamente' })
  findAll(@Query() query: QueryDocumentoEjemploDto) {
    return this.service.findAll(query);
  }

  @Get(':codigo')
  @Roles(...ROLES_LECTURA)
  @ApiOperation({
    summary: 'Consultar un documento de ejemplo',
    description:
      'Acepta el código legible (documento-01) o el UUID. El frontend usa el código para ' +
      'pedir directamente la imagen que corresponde a cada pantalla.',
  })
  @ApiResponse({ status: 200, description: 'Documento encontrado' })
  @ApiResponse({ status: 404, description: 'No existe un documento con ese código' })
  findOne(@Param('codigo') codigo: string) {
    return this.service.findOne(codigo);
  }

  @Post()
  @Roles('UNIVERSITAS')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Cargar un documento de ejemplo',
    description:
      'Sube el nombre y la imagen en una sola llamada (JPG, PNG o WEBP, máximo 5 MB). ' +
      'Si no se envía código, se asigna el siguiente de la serie: documento-01, documento-02…',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre', 'file'],
      properties: {
        nombre: { type: 'string', example: 'Modelo de acta de inicio' },
        codigo: { type: 'string', example: 'documento-01' },
        descripcion: { type: 'string' },
        orden: { type: 'integer', example: 1 },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Documento cargado exitosamente' })
  create(
    @Body() dto: CreateDocumentoEjemploDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.create(dto, file, user);
  }

  @Patch(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Actualizar los datos de un documento de ejemplo' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentoEjemploDto,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.update(id, dto, user);
  }

  @Put(':id/imagen')
  @Roles('UNIVERSITAS')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Reemplazar la imagen de un documento de ejemplo',
    description: 'Conserva el código y los datos; sólo cambia la imagen.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  reemplazarImagen(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: UsuarioActual,
  ) {
    return this.service.reemplazarImagen(id, file, user);
  }

  @Delete(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({ summary: 'Eliminar un documento de ejemplo (borrado lógico)' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioActual) {
    return this.service.remove(id, user);
  }
}
