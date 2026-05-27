import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateProveedorDto {
  @ApiProperty({
    description: 'Correo electrónico del proveedor',
    example: 'proveedor@empresa.com',
  })
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @ApiProperty({
    description: 'Nombre o razón social del proveedor',
    example: 'Constructora Los Andes C.A.',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: 'RIF del proveedor', example: 'J-12345678-9' })
  @IsString()
  @IsNotEmpty()
  rif: string;

  @ApiProperty({
    description: 'Tipo de persona',
    enum: ['NATURAL', 'JURIDICA', 'ORGANO_ENTE_PUBLICO'],
    example: 'JURIDICA',
  })
  @IsEnum(['NATURAL', 'JURIDICA', 'ORGANO_ENTE_PUBLICO'])
  @IsNotEmpty()
  tipoPersona: string;

  @ApiPropertyOptional({
    description: 'Tipo de entidad jurídica',
    enum: [
      'COMPANIA_ANONIMA',
      'ASOCIACION_CIVIL',
      'SRL',
      'FUNDACION',
      'COOPERATIVA',
      'PYME',
      'SOCIEDAD_CIVIL',
    ],
    example: 'COMPANIA_ANONIMA',
  })
  @IsOptional()
  @Transform(({ value }) => {
    const map = {
      'Compañía Anónima (C.A)': 'COMPANIA_ANONIMA',
      'Asociación Civil': 'ASOCIACION_CIVIL',
      'Sociedades de Responsabilidad Limitada (S.R.L.)': 'SRL',
      Fundaciones: 'FUNDACION',
      Cooperativas: 'COOPERATIVA',
      Pymes: 'PYME',
      'Sociedad Civil': 'SOCIEDAD_CIVIL',
    };
    return map[value] || value?.toUpperCase();
  })
  @IsEnum([
    'COMPANIA_ANONIMA',
    'ASOCIACION_CIVIL',
    'SRL',
    'FUNDACION',
    'COOPERATIVA',
    'PYME',
    'SOCIEDAD_CIVIL',
  ])
  tipoEntidadJuridica?: string;

  @ApiPropertyOptional({ description: 'Estado', example: 'Miranda' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ description: 'Municipio', example: 'Sucre' })
  @IsOptional()
  @IsString()
  municipio?: string;

  @ApiPropertyOptional({ description: 'Parroquia', example: 'Petare' })
  @IsOptional()
  @IsString()
  parroquia?: string;

  @ApiPropertyOptional({
    description: 'Dirección fiscal',
    example: 'Av. Principal, Edif. Torre A, Piso 3',
  })
  @IsOptional()
  @IsString()
  direccionFiscal?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto', example: '0212-1234567' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ description: 'Nombre del representante legal', example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  nombreRepLegal?: string;

  @ApiPropertyOptional({ description: 'Cédula del representante legal', example: 'V-12345678' })
  @IsOptional()
  @IsString()
  cedulaRepLegal?: string;

  @ApiPropertyOptional({ description: 'Registro Nacional de Contratistas (RNC)', example: 'true' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  registroRnc?: boolean;

  @ApiPropertyOptional({ description: 'Solvencia laboral vigente', example: 'true' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  solvenciaLaboral?: boolean;

  @ApiPropertyOptional({ description: 'Licencia de funcionamiento municipal', example: 'false' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  licenciaFuncionamientoMunicipal?: boolean;

  @ApiPropertyOptional({
    description: 'Datos del Registro Mercantil del proveedor',
    example: 'Registro Mercantil Segundo del Estado Lara, bajo el N° 0, Tomo 00-A del Año 0000',
  })
  @IsOptional()
  @IsString()
  datosRegistroMercantil?: string;

  @ApiPropertyOptional({
    description: 'Actividad comercial',
    example: 'Construcción de obras civiles',
  })
  @IsOptional()
  @IsString()
  actividadComercial?: string;

  @ApiPropertyOptional({
    description: 'Área de especialidad',
    enum: ['BIENES', 'OBRAS', 'SERVICIOS'],
    example: 'BIENES',
  })
  @IsOptional()
  @Transform(({ value }) => {
    const map = {
      Bienes: 'BIENES',
      Obras: 'OBRAS',
      Servicio: 'SERVICIOS',
      Servicios: 'SERVICIOS',
    };
    return map[value] || value?.toUpperCase();
  })
  @IsEnum(['BIENES', 'OBRAS', 'SERVICIOS'])
  areaEspecialidad?: string;

  @ApiPropertyOptional({ description: 'Años de experiencia', example: '10' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(0)
  anosExperiencia?: number;

  @ApiPropertyOptional({
    description: 'Fecha del estado financiero (ISO 8601)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  fechaEstadoFinanciero?: string;

  @ApiPropertyOptional({ description: 'Patrimonio reportado', example: '1500000.50' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => (value ? parseFloat(value) : undefined))
  @IsNumber()
  patrimonioReportado?: number;

  @ApiPropertyOptional({
    description: 'Nivel de contratación',
    enum: ['ALTA', 'MEDIA', 'BAJA'],
    example: 'MEDIA',
  })
  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  @IsEnum(['ALTA', 'MEDIA', 'BAJA'])
  nivelContratacion?: string;

  @ApiPropertyOptional({ description: 'Observaciones del RNC' })
  @IsOptional()
  @IsString()
  obs_doc_rnc?: string;

  @ApiPropertyOptional({ description: 'Observaciones de Solvencia Laboral' })
  @IsOptional()
  @IsString()
  obs_doc_solvencia_laboral?: string;

  @ApiPropertyOptional({ description: 'Observaciones de Licencia Municipal' })
  @IsOptional()
  @IsString()
  obs_doc_licencia_municipal?: string;

  @ApiPropertyOptional({ description: 'Observaciones del RIF' })
  @IsOptional()
  @IsString()
  obs_doc_rif?: string;

  @ApiPropertyOptional({ description: 'Observaciones de Referencias Bancarias' })
  @IsOptional()
  @IsString()
  obs_doc_referencias_bancarias?: string;

  @ApiPropertyOptional({ description: 'Observaciones de Estados Financieros' })
  @IsOptional()
  @IsString()
  obs_doc_estados_financieros?: string;

  @ApiPropertyOptional({ description: 'Observaciones del Registro Mercantil' })
  @IsOptional()
  @IsString()
  obs_doc_registro_mercantil?: string;

  @ApiPropertyOptional({
    description: '¿Posee Declaración de ISLR del último ejercicio fiscal?',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  islrProveedor?: boolean;

  @ApiPropertyOptional({ description: 'Cédula del Proveedor (Persona Natural)', example: 12345678 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  cedulaNaturalProveedor?: number;

  @ApiPropertyOptional({
    description: 'Nombre de la Máxima Autoridad del Órgano o Ente',
    example: 'José Ramírez González Pérez',
  })
  @IsOptional()
  @IsString()
  nombreAutoridadProveedor?: string;

  @ApiPropertyOptional({ description: 'Cédula de la Máxima Autoridad', example: 87654321 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  cedulaAutoridadProveedor?: number;

  @ApiPropertyOptional({
    description: 'Datos de la designación de la Máxima Autoridad',
    example:
      'Resolución N° 000/00 de fecha 00-00-0000 publicado en Gaceta N° 0000 de fecha 00-00-0000',
  })
  @IsOptional()
  @IsString()
  datosDesignacionAutoridadProveedor?: string;

  // Nuevas observaciones de documentos
  @ApiPropertyOptional({
    description: 'Observaciones de la Cédula',
    example: 'Cédula de identidad vigente del representante',
  })
  @IsOptional()
  @IsString()
  obs_doc_cedula?: string;

  @ApiPropertyOptional({
    description: 'Observaciones del ISLR',
    example: 'Declaración del ejercicio fiscal 2025',
  })
  @IsOptional()
  @IsString()
  obs_doc_islr?: string;

  @ApiPropertyOptional({
    description: 'Observaciones del Currículum',
    example: 'Currículum detallado con soportes',
  })
  @IsOptional()
  @IsString()
  obs_doc_curriculum?: string;

  @ApiPropertyOptional({
    description: 'Observaciones del Título Universitario',
    example: 'Fondo negro certificado por rectorado',
  })
  @IsOptional()
  @IsString()
  obs_doc_titulo?: string;

  @ApiPropertyOptional({
    description: 'Observaciones de la Resolución',
    example: 'Resolución Ministerial de fecha reciente',
  })
  @IsOptional()
  @IsString()
  obs_doc_resolucion?: string;

  @ApiPropertyOptional({
    description: 'Observaciones de la Gaceta',
    example: 'Gaceta Oficial N° 42.000',
  })
  @IsOptional()
  @IsString()
  obs_doc_gaceta?: string;

  @ApiPropertyOptional({
    description: 'Comentario general u observaciones del proveedor',
    example: 'Documentación adicional anexa al expediente',
  })
  @IsOptional()
  @IsString()
  observaciones_proveedor?: string;
}
