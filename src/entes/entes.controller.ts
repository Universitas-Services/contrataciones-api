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
  Patch,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntesService } from './entes.service';
import { CreateEnteDto } from './dto/create-ente.dto';
import { CreateAdminEnteDto } from './dto/create-admin-ente.dto';
import { UpdateEnteDto } from './dto/update-ente.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('🏢 Entes Públicos')
@ApiBearerAuth('JWT-auth')
@Controller('entes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EntesController {
  private readonly logger = new Logger(EntesController.name);

  constructor(
    private readonly entesService: EntesService,
    @Inject('IStorageService') private readonly storageService: any, // Usamos any o la clase concreta para evitar error de metadata con interfaces
  ) {}

  @Post()
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Crear Ente',
    description: 'Crea un nuevo Ente Público con su usuario administrador',
  })
  @ApiResponse({ status: 201, description: 'Ente creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo UNIVERSITAS)' })
  create(@Body() createEnteDto: CreateEnteDto, @CurrentUser() user: { id: string }) {
    return this.entesService.create(createEnteDto, user.id);
  }

  @Post(':id/admin')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Registrar nuevo Administrador del Ente',
    description: 'Crea un nuevo usuario con rol ADMIN_ENTE asociado a este Ente',
  })
  @ApiResponse({ status: 201, description: 'Administrador creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  createAdmin(@Param('id') id: string, @Body() createAdminDto: CreateAdminEnteDto) {
    return this.entesService.createAdmin(id, createAdminDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar Entes',
    description: 'UNIVERSITAS ve todos, SUPERVISOR ve asignados, otros ven solo el suyo',
  })
  @ApiResponse({ status: 200, description: 'Lista de Entes según permisos' })
  findAll(@CurrentUser() user: { rol: string; id?: string; enteId?: string }) {
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
    @CurrentUser() user: { id: string },
  ) {
    if (!file) throw new NotFoundException('No se ha enviado ningún archivo');

    try {
      // 1. Subir a Cloudinary
      // Estructura: universitas/entes/{id}/logo_{timestamp}
      const folder = `universitas/entes/${id}`;
      const filename = `logo_${Date.now()}`;

      this.logger.log(`Subiendo logo para ente ${id} - folder: ${folder}, filename: ${filename}`);
      this.logger.log(
        `Archivo: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const secureUrl = await this.storageService.uploadFile(file.buffer, folder, filename);

      this.logger.log(`Logo subido exitosamente: ${secureUrl as string}`);

      // 2. Actualizar BD
      return this.entesService.updateLogo(id, secureUrl as string, user.id);
    } catch (error) {
      this.logger.error(`Error subiendo logo para ente ${id}:`, error);
      throw new InternalServerErrorException(
        `Error al subir logo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
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

  @Patch(':id')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Actualizar Ente',
    description: 'Actualiza los datos de un Ente. ADMIN_ENTE solo puede actualizar su propio Ente.',
  })
  @ApiParam({ name: 'id', description: 'ID del Ente' })
  @ApiResponse({ status: 200, description: 'Ente actualizado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  update(
    @Param('id') id: string,
    @Body() updateEnteDto: UpdateEnteDto,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    if (user.rol === 'ADMIN_ENTE' && user.enteId !== id) {
      throw new ForbiddenException('No tienes permisos para actualizar este Ente');
    }
    return this.entesService.update(id, updateEnteDto, user.id);
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
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
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
  restore(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.entesService.restore(id, user.id);
  }
}
