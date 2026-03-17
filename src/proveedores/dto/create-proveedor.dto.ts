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
    enum: ['NATURAL', 'JURIDICA'],
    example: 'JURIDICA',
  })
  @IsEnum(['NATURAL', 'JURIDICA'])
  @IsNotEmpty()
  tipoPersona: string;

  @ApiPropertyOptional({
    description: 'Tipo de entidad jurídica',
    enum: ['COMPANIA_ANONIMA', 'ASOCIACION_CIVIL', 'SRL', 'FUNDACION', 'COOPERATIVA', 'PYME'],
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
    };
    return map[value] || value?.toUpperCase();
  })
  @IsEnum(['COMPANIA_ANONIMA', 'ASOCIACION_CIVIL', 'SRL', 'FUNDACION', 'COOPERATIVA', 'PYME'])
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
    description: 'Actividad comercial',
    example: 'Construcción de obras civiles',
  })
  @IsOptional()
  @IsString()
  actividadComercial?: string;

  @ApiPropertyOptional({
    description: 'Área de especialidad',
    enum: ['BIENES', 'OBRAS', 'SERVICIO'],
    example: 'BIENES',
  })
  @IsOptional()
  @Transform(({ value }) => {
    const map = {
      Bienes: 'BIENES',
      Obras: 'OBRAS',
      Servicio: 'SERVICIO',
    };
    return map[value] || value?.toUpperCase();
  })
  @IsEnum(['BIENES', 'OBRAS', 'SERVICIO'])
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
}
