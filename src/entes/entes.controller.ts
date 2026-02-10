import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Put,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntesService } from './entes.service';
import { CreateEnteDto } from './dto/create-ente.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IStorageService } from '../common/interfaces/storage-service.interface';

@ApiTags('🏢 Entes Públicos')
@ApiBearerAuth('JWT-auth')
@Controller('entes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EntesController {
  constructor(
    private readonly entesService: EntesService,
    @Inject('IStorageService') private readonly storageService: any, // Usamos any o la clase concreta para evitar error de metadata con interfaces
  ) { }

  @Post()
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Crear Ente',
    description: 'Crea un nuevo Ente Público con su usuario administrador',
  })
  @ApiResponse({ status: 201, description: 'Ente creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo UNIVERSITAS)' })
  create(@Body() createEnteDto: CreateEnteDto, @CurrentUser() user: any) {
    return this.entesService.create(createEnteDto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar Entes',
    description: 'UNIVERSITAS ve todos, SUPERVISOR ve asignados, otros ven solo el suyo',
  })
  @ApiResponse({ status: 200, description: 'Lista de Entes según permisos' })
  findAll(@CurrentUser() user: any) {
    return this.entesService.findAll(user);
  }

  @Get('sin-supervisor')
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Listar Entes sin Supervisor',
    description: 'Obtiene una lista de Entes que no tienen ningún Supervisor asignado actualmente.',
  })
  @ApiResponse({ status: 200, description: 'Lista de Entes disponibles para asignar' })
  getAvailable() {
    return this.entesService.findAvailable();
  }

  @Put(':id/logo')
  @Roles('ADMIN_ENTE', 'UNIVERSITAS')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Subir logo del Ente',
    description: 'Sube y actualiza el logo de un Ente. Soporta PNG, JPG, WEBP (Max 2MB).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo actualizado correctamente' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 2 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new NotFoundException('No se ha enviado ningún archivo');

    // 1. Subir a Cloudinary
    // Estructura: universitas/entes/{id}/logo_{timestamp}
    const folder = `universitas/entes/${id}`;
    const filename = `logo_${Date.now()}`;

    const secureUrl = await this.storageService.uploadFile(file.buffer, folder, filename);

    // 2. Actualizar BD
    return this.entesService.updateLogo(id, secureUrl, user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver Ente',
    description: 'Obtiene detalles de un Ente específico',
  })
  @ApiParam({ name: 'id', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Detalles del Ente' })
  @ApiResponse({ status: 404, description: 'Ente no encontrado' })
  findOne(@Param('id') id: string) {
    return this.entesService.findOne(id);
  }

  @Delete(':id')
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Eliminar Ente',
    description: 'Elimina un Ente (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Ente eliminado' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo UNIVERSITAS)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.entesService.remove(id, user.id);
  }

  @Post(':id/restore')
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Restaurar Ente',
    description: 'Reactiva un Ente previamente eliminado',
  })
  @ApiParam({ name: 'id', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Ente restaurado' })
  restore(@Param('id') id: string, @CurrentUser() user: any) {
    return this.entesService.restore(id, user.id);
  }
}
