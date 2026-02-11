import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('🏭 Proveedores')
@ApiBearerAuth('JWT-auth')
@Controller('proveedores')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('EJECUTOR', 'ADMIN_ENTE')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'doc_rif', maxCount: 1 },
      { name: 'doc_registro_mercantil', maxCount: 1 },
      { name: 'doc_estados_financieros', maxCount: 1 },
      { name: 'doc_referencias_bancarias', maxCount: 1 },
      { name: 'doc_solvencia_laboral', maxCount: 1 },
      { name: 'doc_licencia_municipal', maxCount: 1 },
      { name: 'doc_rnc', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Registrar proveedor',
    description:
      'Registra un nuevo proveedor con sus datos y documentos PDF adjuntos. ' +
      'Los archivos deben enviarse como multipart/form-data junto con los campos de texto.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['correo', 'nombre', 'rif', 'tipoPersona'],
      properties: {
        correo: { type: 'string', example: 'proveedor@empresa.com' },
        nombre: { type: 'string', example: 'Constructora Los Andes C.A.' },
        rif: { type: 'string', example: 'J-12345678-9' },
        tipoPersona: { type: 'string', enum: ['NATURAL', 'JURIDICA'], example: 'JURIDICA' },
        tipoEntidadJuridica: {
          type: 'string',
          enum: ['EMPRESA_PRIVADA', 'COOPERATIVA', 'FUNDACION', 'ASOCIACION_CIVIL', 'CONSORCIO'],
          example: 'EMPRESA_PRIVADA',
        },
        estado: { type: 'string', example: 'Miranda' },
        municipio: { type: 'string', example: 'Sucre' },
        parroquia: { type: 'string', example: 'Petare' },
        direccionFiscal: { type: 'string', example: 'Av. Principal, Edif. Torre A, Piso 3' },
        telefono: { type: 'string', example: '0212-1234567' },
        nombreRepLegal: { type: 'string', example: 'Juan Pérez' },
        cedulaRepLegal: { type: 'string', example: 'V-12345678' },
        registroRnc: { type: 'boolean', example: true },
        solvenciaLaboral: { type: 'boolean', example: true },
        licenciaFuncionamientoMunicipal: { type: 'boolean', example: false },
        actividadComercial: { type: 'string', example: 'Construcción de obras civiles' },
        areaEspecialidad: {
          type: 'string',
          enum: ['OBRAS', 'BIENES', 'SERVICIOS', 'CONSULTORIA'],
          example: 'OBRAS',
        },
        anosExperiencia: { type: 'integer', example: 10 },
        fechaEstadoFinanciero: { type: 'string', format: 'date', example: '2025-12-31' },
        patrimonioReportado: { type: 'number', example: 1500000.5 },
        nivelContratacion: {
          type: 'string',
          enum: ['BASICO', 'INTERMEDIO', 'AVANZADO', 'EXPERTO'],
          example: 'INTERMEDIO',
        },
        doc_rif: { type: 'string', format: 'binary', description: 'PDF del RIF (archivo)' },
        obs_doc_rif: {
          type: 'string',
          description: 'Observaciones del RIF',
          example: 'RIF vigente hasta 2027',
        },
        doc_registro_mercantil: {
          type: 'string',
          format: 'binary',
          description: 'PDF del Registro Mercantil (archivo)',
        },
        obs_doc_registro_mercantil: {
          type: 'string',
          description: 'Observaciones del Registro Mercantil',
          example: 'Tomo 45, Folio 12',
        },
        doc_estados_financieros: {
          type: 'string',
          format: 'binary',
          description: 'PDF de Estados Financieros (archivo)',
        },
        obs_doc_estados_financieros: {
          type: 'string',
          description: 'Observaciones de Estados Financieros',
          example: 'Auditados por firma externa',
        },
        doc_referencias_bancarias: {
          type: 'string',
          format: 'binary',
          description: 'PDF de Referencias Bancarias (archivo)',
        },
        obs_doc_referencias_bancarias: {
          type: 'string',
          description: 'Observaciones de Referencias Bancarias',
          example: 'Banco Nacional, cuenta corriente',
        },
        doc_solvencia_laboral: {
          type: 'string',
          format: 'binary',
          description: 'PDF de Solvencia Laboral (archivo)',
        },
        obs_doc_solvencia_laboral: {
          type: 'string',
          description: 'Observaciones de Solvencia Laboral',
          example: 'Emitida el 15/01/2026',
        },
        doc_licencia_municipal: {
          type: 'string',
          format: 'binary',
          description: 'PDF de Licencia Municipal (archivo)',
        },
        obs_doc_licencia_municipal: {
          type: 'string',
          description: 'Observaciones de Licencia Municipal',
          example: 'Municipio Sucre, vigente',
        },
        doc_rnc: { type: 'string', format: 'binary', description: 'PDF del RNC (archivo)' },
        obs_doc_rnc: {
          type: 'string',
          description: 'Observaciones del RNC',
          example: 'Inscripción N° 2025-00456',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Proveedor registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o archivos faltantes' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo EJECUTOR y ADMIN_ENTE)' })
  @ApiResponse({ status: 409, description: 'Ya existe un proveedor con ese RIF en el Ente' })
  async create(
    @Body() createProveedorDto: CreateProveedorDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Extraer campos obs_* del body para las observaciones de documentos
    const observaciones: Record<string, string> = {};
    const body = createProveedorDto as unknown as Record<string, unknown>;
    for (const key of Object.keys(body)) {
      if (key.startsWith('obs_doc_')) {
        observaciones[key] = String(body[key]);
        delete body[key]; // Limpiar del DTO
      }
    }

    return this.proveedoresService.create(
      createProveedorDto,
      files || {},
      observaciones,
      user.id,
      user.enteId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar proveedores',
    description: 'Obtiene todos los proveedores del Ente del usuario autenticado',
  })
  @ApiResponse({ status: 200, description: 'Lista de proveedores con sus documentos' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.proveedoresService.findAll(user.enteId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver proveedor',
    description: 'Obtiene los detalles de un proveedor específico incluyendo sus documentos',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Detalles del proveedor' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proveedoresService.findOne(id, user.enteId);
  }

  @Delete(':id')
  @Roles('EJECUTOR', 'ADMIN_ENTE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar proveedor',
    description: 'Elimina un proveedor (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor eliminado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.proveedoresService.remove(id, user.enteId, user.id);
  }
}
