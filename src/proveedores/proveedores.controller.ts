import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { QueryProveedoresDto } from './dto/query-proveedores.dto';
import { AprobarProveedorDto } from './dto/aprobar-proveedor.dto';
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
          enum: ['COMPANIA_ANONIMA', 'ASOCIACION_CIVIL', 'SRL', 'FUNDACION', 'COOPERATIVA', 'PYME'],
          example: 'COMPANIA_ANONIMA',
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
          enum: ['BIENES', 'OBRAS', 'SERVICIOS'],
          example: 'BIENES',
        },
        anosExperiencia: { type: 'integer', example: 10 },
        fechaEstadoFinanciero: { type: 'string', format: 'date', example: '2025-12-31' },
        patrimonioReportado: { type: 'number', example: 1500000.5 },
        nivelContratacion: {
          type: 'string',
          enum: ['ALTA', 'MEDIA', 'BAJA'],
          example: 'MEDIA',
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
    description:
      'Obtiene los proveedores del Ente del usuario autenticado con paginación y filtros opcionales. ' +
      'Permite filtrar por estatus de validación, buscar por RIF o nombre.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de proveedores con metadatos' })
  findAll(@Query() query: QueryProveedoresDto, @CurrentUser() user: AuthenticatedUser) {
    return this.proveedoresService.findAll(user.enteId, query);
  }

  @Patch(':id/estatus')
  @Roles('EJECUTOR', 'ADMIN_ENTE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprobar o rechazar proveedor',
    description:
      'Cambia el estatus de validación de un proveedor a APROBADO o RECHAZADO. ' +
      'Solo usuarios con rol EJECUTOR o ADMIN_ENTE pueden realizar esta acción.',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({ status: 200, description: 'Estatus del proveedor actualizado' })
  @ApiResponse({ status: 400, description: 'Estatus inválido o el proveedor ya tiene ese estatus' })
  @ApiResponse({ status: 403, description: 'No autorizado (solo EJECUTOR y ADMIN_ENTE)' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  aprobar(
    @Param('id') id: string,
    @Body() aprobarDto: AprobarProveedorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proveedoresService.aprobar(id, user.enteId, user.id, aprobarDto.estatusValidacion);
  }

  @Patch(':id')
  @Roles('EJECUTOR', 'ADMIN_ENTE')
  @HttpCode(HttpStatus.OK)
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
    summary: 'Actualizar proveedor (datos y documentos)',
    description:
      'Actualiza la información general de un proveedor y/o sus documentos. ' +
      'Si el proveedor no está APROBADO, los documentos anteriores se eliminan físicamente. ' +
      'Si ya fue APROBADO, se mantiene el historial mediante borrado lógico.',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiBody({ type: UpdateProveedorDto })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado exitosamente' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto con RIF de otro proveedor' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProveedorDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.proveedoresService.update(id, user.enteId, user.id, updateDto, files || {});
  }

  @Get('estadisticas')
  @ApiOperation({
    summary: 'Estadísticas generales de proveedores',
    description:
      'Retorna estadísticas consolidadas del Ente: totales por estatus, ' +
      'crecimiento mensual con porcentajes, distribución por área de especialidad ' +
      'y distribución por tipo de persona.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de proveedores',
    schema: {
      type: 'object',
      properties: {
        resumen: {
          type: 'object',
          properties: {
            totalRegistrados: { type: 'integer', example: 1250 },
            totalAprobados: { type: 'integer', example: 1180 },
            totalRechazados: { type: 'integer', example: 70 },
            totalPendientes: { type: 'integer', example: 15 },
            totalEnRevision: { type: 'integer', example: 5 },
          },
        },
        crecimientoMensual: {
          type: 'object',
          properties: {
            registradosEsteMes: { type: 'integer', example: 62 },
            porcentajeRegistrados: { type: 'number', example: 5.2 },
            aprobadosEsteMes: { type: 'integer', example: 35 },
            porcentajeAprobados: { type: 'number', example: 3.1 },
            rechazadosEsteMes: { type: 'integer', example: 2 },
            porcentajeRechazados: { type: 'number', example: 2.9 },
          },
        },
        distribucionPorArea: {
          type: 'object',
          properties: {
            BIENES: { type: 'integer', example: 450 },
            OBRAS: { type: 'integer', example: 320 },
            SERVICIO: { type: 'integer', example: 444 },
            SIN_ASIGNAR: { type: 'integer', example: 0 },
          },
        },
        distribucionPorTipoPersona: {
          type: 'object',
          properties: {
            NATURAL: { type: 'integer', example: 400 },
            JURIDICA: { type: 'integer', example: 850 },
          },
        },
      },
    },
  })
  getEstadisticas(@CurrentUser() user: AuthenticatedUser) {
    return this.proveedoresService.getEstadisticas(user.enteId);
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

  @Get(':id/documentos/:tipo/visualizar')
  @ApiOperation({
    summary: 'Visualizar documento de proveedor',
    description: 'Redirige al visor del documento en el almacenamiento (Cloudinary)',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo de documento (RIF, RNC, REGISTRO_MERCANTIL, etc.)',
  })
  @ApiResponse({ status: 302, description: 'Redirección al documento' })
  @ApiResponse({ status: 404, description: 'Proveedor o documento no encontrado' })
  async visualizarDocumento(
    @Param('id') id: string,
    @Param('tipo') tipo: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { documento } = await this.proveedoresService.getDocumentoActivo(id, tipo, user.enteId);
    return res.redirect(documento.urlArchivo);
  }

  @Get(':id/documentos/:tipo/descargar')
  @ApiOperation({
    summary: 'Descargar documento de proveedor',
    description: 'Descarga el documento del proveedor con un nombre descriptivo',
  })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo de documento (RIF, RNC, REGISTRO_MERCANTIL, etc.)',
  })
  @ApiResponse({ status: 200, description: 'Archivo binario' })
  @ApiResponse({ status: 404, description: 'Proveedor o documento no encontrado' })
  async descargarDocumento(
    @Param('id') id: string,
    @Param('tipo') tipo: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { documento, proveedor } = await this.proveedoresService.getDocumentoActivo(
      id,
      tipo,
      user.enteId,
    );

    const stream = await this.proveedoresService.downloadFileStream(documento.urlArchivo);

    // Limpiar nombre del proveedor para el nombre del archivo
    const nombreLimpio = proveedor.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${tipo}_${nombreLimpio}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    stream.pipe(res);
  }
}
