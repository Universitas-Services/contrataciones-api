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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntesService } from './entes.service';
import { CreateEnteDto } from './dto/create-ente.dto';
import { CreateAdminEnteDto } from './dto/create-admin-ente.dto';
import { CreateEnteUsuarioDto } from './dto/create-ente-usuario.dto';
import { QueryEnteUsuariosDto } from './dto/query-ente-usuarios.dto';
import { UpdateEnteUsuarioDto } from './dto/update-ente-usuario.dto';
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

  @Post(':id/usuarios')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Crear usuario de Ente',
    description: 'Crea un nuevo usuario (ADMIN_ENTE, EJECUTOR, VISUALIZADOR) asociado a este Ente',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  createUsuario(
    @Param('id') id: string,
    @Body() dto: CreateEnteUsuarioDto,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    if (user.rol === 'ADMIN_ENTE' && user.enteId !== id) {
      throw new ForbiddenException('No tienes permisos para crear usuarios en este Ente');
    }
    return this.entesService.createUsuarioEnte(id, dto);
  }

  @Get(':id/usuarios')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Listar usuarios del Ente',
    description:
      'Lista los usuarios internos de un Ente (EJECUTOR, VISUALIZADOR, etc.) con paginación y filtros',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuarios' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  findAllUsuarios(
    @Param('id') id: string,
    @Query() query: QueryEnteUsuariosDto,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    if (user.rol === 'ADMIN_ENTE' && user.enteId !== id) {
      throw new ForbiddenException('No tienes permisos para ver usuarios de este Ente');
    }
    return this.entesService.findAllUsuariosEnte(id, query);
  }

  @Patch(':id/usuarios/:usuarioId')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Actualizar usuario de Ente',
    description: 'Actualiza la información (nombre, rol, password, estado activo) de un usuario',
  })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  updateUsuario(
    @Param('id') id: string,
    @Param('usuarioId') usuarioId: string,
    @Body() dto: UpdateEnteUsuarioDto,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    if (user.rol === 'ADMIN_ENTE' && user.enteId !== id) {
      throw new ForbiddenException('No tienes permisos para modificar usuarios de este Ente');
    }
    return this.entesService.updateUsuarioEnte(id, usuarioId, dto);
  }

  @Delete(':id/usuarios/:usuarioId')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Eliminar usuario de Ente',
    description: 'Realiza un borrado lógico (desactivación) de un usuario perteneciente al Ente',
  })
  @ApiResponse({ status: 200, description: 'Usuario eliminado lógicamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  removeUsuario(
    @Param('id') id: string,
    @Param('usuarioId') usuarioId: string,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    if (user.rol === 'ADMIN_ENTE' && user.enteId !== id) {
      throw new ForbiddenException('No tienes permisos para eliminar usuarios de este Ente');
    }
    return this.entesService.removeUsuarioEnte(id, usuarioId);
  }

  @Get('gestion/mis-usuarios')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Listar mis usuarios operativos (ADMIN_ENTE)',
    description:
      'Permite a un Administrador de Ente listar sus propios Ejecutores y Visualizadores con paginación y búsqueda.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuarios operativos' })
  findAllMisUsuarios(
    @Query() query: QueryEnteUsuariosDto,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    if (!user.enteId && user.rol !== 'UNIVERSITAS') {
      throw new ForbiddenException('No tienes un Ente asociado');
    }
    const targetEnteId = user.enteId; // Si es UNIVERSITAS, debería usar el endpoint general, pero aquí manejamos su 'enteId' si lo tiene
    if (!targetEnteId) throw new ForbiddenException('ID de Ente no disponible');

    return this.entesService.findAllOperativosEnte(targetEnteId, query);
  }

  @Get('gestion/mis-usuarios/:usuarioId')
  @Roles('UNIVERSITAS', 'ADMIN_ENTE')
  @ApiOperation({
    summary: 'Ver detalle de un usuario operativo',
    description: 'Obtiene información detallada de un Ejecutor o Visualizador del propio Ente.',
  })
  @ApiResponse({ status: 200, description: 'Detalle del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOneMiUsuario(
    @Param('usuarioId') usuarioId: string,
    @CurrentUser() user: { id: string; rol: string; enteId?: string },
  ) {
    if (!user.enteId) throw new ForbiddenException('No tienes un Ente asociado');
    return this.entesService.findOperativoEnte(user.enteId, usuarioId);
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

  @Get('dashboard/metrics')
  @Roles('UNIVERSITAS')
  @ApiOperation({
    summary: 'Obtener métricas globales (Universitas)',
    description:
      'Retorna estadísticas de entes totales, supervisores, completados y por completar.',
  })
  @ApiResponse({ status: 200, description: 'Métricas obtenidas correctamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  getMetrics() {
    return this.entesService.getUniversitasMetrics();
  }

  @Get('dashboard/operativo')
  @Roles('ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR', 'UNIVERSITAS')
  @ApiOperation({
    summary: 'Obtener resumen operativo del ente logueado',
    description:
      'Retorna estadísticas detalladas de usuarios, expedientes y proveedores del ente actual.',
  })
  @ApiResponse({ status: 200, description: 'Métricas obtenidas correctamente' })
  @ApiResponse({ status: 403, description: 'No autorizado o el usuario no tiene un ente asociado' })
  getOperationalMetrics(@CurrentUser() user: { rol: string; enteId?: string }) {
    if (!user.enteId) {
      if (user.rol === 'UNIVERSITAS') {
        throw new ForbiddenException(
          'Los usuarios Universitas deben consultar métricas globales o por ente específico.',
        );
      }
      throw new ForbiddenException('El usuario no tiene un ente asociado.');
    }
    return this.entesService.getEnteOperationalMetrics(user.enteId);
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
