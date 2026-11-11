import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoExpedienteCompliance } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class DatosExpedienteComplianceDto {
  @ApiPropertyOptional({ example: 'CA-SDEDTEOEL-CA-002-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(recortar)
  nomenclatura?: string;

  @ApiPropertyOptional({ example: 'Adquisición de insumos tecnológicos' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(recortar)
  nombre?: string;

  @ApiPropertyOptional({
    example: 'CA_ACTO_UNICO_APERTURA_UNICA',
    description: 'Código de `GET /compliance/catalogo`. Solo se aceptan modalidades disponibles.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  modalidad?: string;

  @ApiPropertyOptional({ example: 'BIENES', description: 'BIENES | OBRAS | SERVICIOS' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  tipoContratacion?: string;
}

export class CrearExpedienteComplianceDto extends DatosExpedienteComplianceDto {
  @ApiPropertyOptional({
    description: 'Solo para UNIVERSITAS, que no pertenece a un ente. Los demás usan el suyo.',
  })
  @IsOptional()
  @IsUUID()
  enteId?: string;
}

export class ListarExpedientesComplianceQuery {
  @ApiPropertyOptional({ description: 'Filtro por ente para UNIVERSITAS y SUPERVISOR' })
  @IsOptional()
  @IsUUID()
  enteId?: string;

  @ApiPropertyOptional({ description: 'Página, desde 1', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Registros por página (máximo 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Busca en nomenclatura o nombre, sin distinguir mayúsculas' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(recortar)
  search?: string;

  @ApiPropertyOptional({ enum: EstadoExpedienteCompliance })
  @IsOptional()
  @IsEnum(EstadoExpedienteCompliance)
  estado?: EstadoExpedienteCompliance;
}

export class MensajeComplianceDto {
  @ApiProperty({ example: '¿Por qué salió rojo el acta de inicio?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  @Transform(recortar)
  mensaje!: string;
}

export class SubirDocumentoComplianceDto {
  @ApiProperty({ example: 'ACTA_INICIO', description: 'Tipo del checklist de la modalidad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  tipoDocumento!: string;

  @ApiPropertyOptional({
    description: 'Documento vigente que se reemplaza. Sin él, el archivo se agrega.',
  })
  @IsOptional()
  @IsUUID()
  reemplazaDocumentoId?: string;
}

export class SolicitarDictamenComplianceDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Emite el dictamen FINAL aunque falten documentos. Cierra el expediente.',
  })
  @IsOptional()
  @IsBoolean()
  forzarFinal?: boolean;
}
